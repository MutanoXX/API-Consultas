/**
 * CONFIGURAÇÃO DE SEGURANÇA
 * Gerenciamento de variáveis de ambiente sensíveis
 */

/**
 * Obtém a chave de administrador
 * Usa variável de ambiente por segurança
 */
export function getAdminKey(): string {
  const key = process.env.ADMIN_KEY;
  
  if (!key) {
    // Em desenvolvimento, usa uma chave fallback para testes
    // Em produção, isso deve gerar erro de build
    if (process.env.NODE_ENV === 'development') {
      console.warn('[SECURITY] ADMIN_KEY não definida em ambiente de desenvolvimento. Usando fallback para testes.');
      return 'AMDIM;MutanoX3397'; // Fallback DEV ONLY
    }
    
    throw new Error('ADMIN_KEY não configurada. Defina em .env ou variáveis de ambiente.');
  }
  
  return key;
}

/**
 * Obtém o TTL do nonce de anti-replay (em milissegundos)
 * Padrão: 5000ms (5 segundos)
 */
export function getNonceTTL(): number {
  const ttl = process.env.SECURITY_NONCE_TTL;
  return ttl ? parseInt(ttl, 10) : 5000;
}

/**
 * Obtém o limite de rate para proteção contra floods
 * Padrão: 10 requisições por nonce
 */
export function getFloodThreshold(): number {
  const threshold = process.env.SECURITY_FLOOD_THRESHOLD;
  return threshold ? parseInt(threshold, 10) : 10;
}

/**
 * Obtém o timeout para validação de integridade
 * Padrão: 30000ms (30 segundos)
 */
export function getIntegrityTimeout(): number {
  const timeout = process.env.SECURITY_INTEGRITY_TIMEOUT;
  return timeout ? parseInt(timeout, 10) : 30000;
}

/**
 * Verifica se o ambiente é de produção
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Obtém a URL da API externa
 */
export function getExternalApiUrl(): string {
  return process.env.EXTERNAL_API_URL || 'https://world-ecletix.onrender.com';
}

/**
 * Obtém a URL do serviço WebSocket
 */
export function getWebSocketUrl(): string {
  return process.env.WEBSOCKET_URL || 'http://localhost:3003';
}

/**
 * Validação de ambiente
 */
export function validateEnvironment(): {
  isValid: boolean;
  missing: string[];
  errors: string[];
} {
  const errors: string[] = [];
  const missing: string[] = [];
  
  // Verificar ADMIN_KEY
  if (!process.env.ADMIN_KEY) {
    missing.push('ADMIN_KEY');
  } else if (process.env.ADMIN_KEY.length < 20) {
    errors.push('ADMIN_KEY deve ter pelo menos 20 caracteres');
  }
  
  // Verificar variáveis opcionais
  const optionalVars = [
    { name: 'SECURITY_NONCE_TTL', default: '5000' },
    { name: 'SECURITY_FLOOD_THRESHOLD', default: '10' },
    { name: 'SECURITY_INTEGRITY_TIMEOUT', default: '30000' },
    { name: 'EXTERNAL_API_URL', default: 'https://world-ecletix.onrender.com' },
    { name: 'WEBSOCKET_URL', default: 'http://localhost:3003' }
  ];
  
  for (const opt of optionalVars) {
    const value = process.env[opt.name];
    if (value && isNaN(parseInt(value))) {
      errors.push(`${opt.name} deve ser um número válido`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    missing,
    errors
  };
}

/**
 * Configurações de log (para não expor dados sensíveis)
 */
export const LOG_CONFIG = {
  // NUNCA logar chaves de API completas
  maskApiKeys: true,
  
  // NUNCA logar valores de headers sensíveis completos
  maskSensitiveHeaders: true,
  
  // NUNCA logar corpo de request completo em produção
  logRequestBody: process.env.NODE_ENV !== 'production',
  
  // Sempre sanitizar logs
  sanitizeLogs: true,
  
  // Nível mínimo de log em produção
  productionLogLevel: 'error', // 'debug' em desenvolvimento
  
  // Logs de segurança sempre ativados
  logSecurityEvents: true
};

/**
 * Valida se uma variável de ambiente está configurada
 */
export function isEnvConfigured(varName: string): boolean {
  return !!process.env[varName];
}

/**
 * Prefixo para logs de segurança (facilita busca)
 */
export const SECURITY_LOG_PREFIX = '[SEC]';
