/**
 * SISTEMA DE PROTEÇÃO ANTI-REPLAY
 * Impede que uma requisição seja enviada múltiplas vezes
 * usando Nonces, Timestamps e Fingerprints de Cliente
 */

import { randomBytes } from 'crypto';

// Configurações de Segurança
const NONCE_LENGTH = 32;
const DEFAULT_NONCE_TTL = 5000; // 5 segundos
const FLOOD_THRESHOLD = 10; // Bloqueia após 10 requisições no mesmo nonce (muito agressivo)
const CLIENT_FINGERPRINT_TTL = 30000; // 30 segundos

// Tipos
interface NonceEntry {
  nonce: string;
  timestamp: number;
  ip?: string;
  clientFingerprint?: string;
}

interface ClientFingerprintEntry {
  fingerprint: string;
  timestamp: number;
  ip: string;
}

// Armazenamento em memória (L1 Cache para performance)
const nonceStore = new Map<string, NonceEntry>();
const clientFingerprintStore = new Map<string, ClientFingerprintEntry>();
const requestSignatures = new Map<string, number>(); // Mapa para detectar requisições idênticas repetidas

/**
 * Gera um Nonce criptograficamente seguro
 * Usa randomBytes com Node.js Crypto API
 */
export function generateNonce(length: number = NONCE_LENGTH): string {
  const bytes = randomBytes(Math.ceil(length / 2));
  return bytes.toString('hex').substring(0, length);
}

/**
 * Calcula fingerprint da requisição para evitar bypass de IP
 * Combina: IP + User Agent + Accept Headers
 */
export function calculateClientFingerprint(
  ip: string | undefined,
  userAgent: string | undefined,
  accept?: string | undefined,
  acceptEncoding?: string | undefined,
  acceptLanguage?: string | undefined
): string {
  const data = [
    ip || 'unknown',
    userAgent || 'unknown',
    accept || 'unknown',
    acceptEncoding || 'unknown',
    acceptLanguage || 'unknown'
  ].join('|');
  
  // Hash simples da string
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return hash.toString(16);
}

/**
 * Verifica se o nonce expirou
 */
export function isNonceExpired(timestamp: number, ttl: number = DEFAULT_NONCE_TTL): boolean {
  const now = Date.now();
  return (now - timestamp) > ttl;
}

/**
 * Verifica se é um ataque de replay
 * Checa se o mesmo nonce foi usado recentemente
 */
export function isReplayAttack(
  nonce: string,
  clientIp: string,
  clientFingerprint: string
): {
  isReplay: boolean;
  reason: string;
} {
  const now = Date.now();
  const entry = nonceStore.get(nonce);

  if (!entry) {
    // Nonce nunca foi usado antes
    return { isReplay: false, reason: 'nonce_novo' };
  }

  // Verificar se expirou
  if (isNonceExpired(entry.timestamp)) {
    // Nonce expirado, pode reutilizar
    return { isReplay: false, reason: 'nonce_expirado_pode_reutilizar' };
  }

  // Verificar se é o mesmo IP tentando reutilizar
  if (entry.ip !== clientIp && entry.ip !== undefined) {
    nonceStore.delete(nonce);
    return { isReplay: false, reason: 'ip_diferente_permitido' };
  }

  // Verificar se o cliente é o mesmo (IP + Fingerprint)
  if (entry.clientFingerprint === clientFingerprint) {
    // Mesmo cliente tentando reutilizar nonce
    const timeDiff = now - entry.timestamp;
    
    if (timeDiff < 1000) { // Menos de 1 segundo - muito suspeito!
      return { isReplay: true, reason: 'replay_detectado_tempo_muito_curto' };
    }
    
    if (timeDiff < 5000) { // Menos de 5 segundos
      return { isReplay: true, reason: 'replay_suspeito_nonce_reutilizado_rapidamente' };
    }
  }

  return { isReplay: false, reason: 'verificacao_passou' };
}

/**
 * Verifica se há flooding (mesma assinatura repetida)
 */
export function isFloodingAttack(
  requestSignature: string,
  clientIp: string
): {
  isFlooding: boolean;
  requestCount: number;
} {
  const key = `${clientIp}:${requestSignature}`;
  const now = Date.now();
  const lastRequestTime = requestSignatures.get(key) || 0;
  const count = (requestSignatures.get(`count:${key}`) || 0) + 1;

  // Atualizar contadores
  requestSignatures.set(key, now);
  requestSignatures.set(`count:${key}`, count);

  // Verificar se há muitas requisições seguidas
  if (now - lastRequestTime < 100 && count > FLOOD_THRESHOLD) {
    return { isFlooding: true, requestCount: count };
  }

  // Resetar contador se passou tempo suficiente
  if (now - lastRequestTime > 10000) { // 10 segundos
    requestSignatures.delete(`count:${key}`);
  }

  return { isFlooding: false, requestCount: count };
}

/**
 * Verifica e registra fingerprint do cliente
 */
export function validateClientFingerprint(
  fingerprint: string,
  ip: string
): {
  isValid: boolean;
  isNewClient: boolean;
  reason?: string;
} {
  const now = Date.now();
  const entry = clientFingerprintStore.get(fingerprint);

  if (!entry) {
    // Novo cliente
    clientFingerprintStore.set(fingerprint, { fingerprint, timestamp: now, ip });
    return { isValid: true, isNewClient: true };
  }

  // Verificar mudança suspeita de IP em curto período
  const timeDiff = now - entry.timestamp;
  
  if (timeDiff < 60000 && entry.ip !== ip) {
    // Fingerprint mudou de IP em menos de 1 minuto - muito suspeito
    // Possível ataque ou uso de VPN/Proxy
    return { isValid: true, isNewClient: false, reason: 'mudanca_rapida_de_ip_suspeita' };
  }

  // Verificar se fingerprint é muito antigo
  if (timeDiff > CLIENT_FINGERPRINT_TTL) {
    // Fingerprint expirou
    clientFingerprintStore.set(fingerprint, { fingerprint, timestamp: now, ip });
    return { isValid: true, isNewClient: true, reason: 'fingerprint_expirado_gerado_novo' };
  }

  return { isValid: true, isNewClient: false };
}

/**
 * Consume e invalida um nonce (após uso bem-sucedido)
 */
export function consumeNonce(nonce: string): void {
  nonceStore.delete(nonce);
}

/**
 * Limpa nonces expirados para liberar memória
 * Deve ser chamado periodicamente (ex: a cada 5 minutos)
 */
export function clearExpiredNonces(): number {
  const now = Date.now();
  let cleared = 0;

  for (const [key, entry] of nonceStore.entries()) {
    if (isNonceExpired(entry.timestamp)) {
      nonceStore.delete(key);
      cleared++;
    }
  }

  // Limpar fingerprints antigos
  for (const [key, entry] of clientFingerprintStore.entries()) {
    if ((now - entry.timestamp) > CLIENT_FINGERPRINT_TTL) {
      clientFingerprintStore.delete(key);
    }
  }

  // Limpar assinaturas de flood antigas
  for (const [key, value] of requestSignatures.entries()) {
    if ((now - value) > 60000) { // 1 minuto
      requestSignatures.delete(key);
    }
  }

  return cleared;
}

/**
 * Gera assinatura única da requisição para detectar duplicatas
 * Combina: Método + Caminho + Timestamp + IP + Fingerprint
 */
export function generateRequestSignature(
  method: string,
  path: string,
  body: any,
  clientIp: string,
  clientFingerprint: string
): string {
  const bodyHash = body ? JSON.stringify(body).substring(0, 50) : '';
  const data = `${method}:${path}:${bodyHash}:${clientIp}:${clientFingerprint}:${Date.now()}`;
  
  // Hash rápido (não precisa ser criptográfico)
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return hash.toString(16);
}

/**
 * Limpa o cache de segurança
 * Para ser chamado em caso de ataque DDoS para liberar memória
 */
export function clearSecurityCache(): void {
  nonceStore.clear();
  clientFingerprintStore.clear();
  requestSignatures.clear();
}

/**
 * Obtém estatísticas da proteção anti-replay
 */
export function getReplayProtectionStats(): {
  totalNonces: number;
  activeNonces: number;
  totalClientFingerprints: number;
  blockedRequests: number;
} {
  const now = Date.now();
  let activeNonces = 0;
  let blockedRequests = 0;

  for (const entry of nonceStore.values()) {
    if (!isNonceExpired(entry.timestamp)) {
      activeNonces++;
    }
  }

  // Estimar requisições bloqueadas baseadas em detecções de flood
  for (const entry of requestSignatures.entries()) {
    if (entry[0].startsWith('count:') && (now - entry[1]) < 60000) {
      if ((entry[1] as number) > FLOOD_THRESHOLD) {
        blockedRequests++;
      }
    }
  }

  return {
    totalNonces: nonceStore.size,
    activeNonces,
    totalClientFingerprints: clientFingerprintStore.size,
    blockedRequests
  };
}
