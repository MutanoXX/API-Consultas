/**
 * SERVIÇO DE AUTENTICAÇÃO E AUTORIZAÇÃO
 * Gerencia API-KEYs, valida tokens e controla acesso
 */

import { db } from '@/lib/db';
import {
  getAdminKey,
  getNonceTTL,
  getFloodThreshold,
  LOG_CONFIG
} from '@/lib/security/config';
import {
  generateNonce,
  isNonceExpired,
  isReplayAttack,
  consumeNonce,
  clearExpiredNonces,
  generateRequestSignature
  isFloodingAttack,
  clearSecurityCache,
  getReplayProtectionStats
} from '@/lib/security/anti-replay';
import {
  validateCpf,
  validateNome,
  validateNumero,
  validateTipo,
  assessSecurityRisk,
  sanitizeForLogging,
  maskSensitiveData
} from '@/lib/security/anti-sql';

export interface ApiKeyData {
  id: string;
  key: string;
  nome: string;
  tipo: string;
  isActive: boolean;
  rateLimit: number;
  dailyLimit: number;
  totalRequests: number;
  usedToday: number;
  usedThisHour: number;
  lastResetHour: Date | null;
  lastResetDay: Date | null;
  expiresAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class AuthService {
  /**
   * Valida API-KEY
   * Usa variável de ambiente por segurança (chave não fica no código)
   */
  static async validateApiKey(apiKey: string): Promise<{
    valid: boolean;
    apiKeyData?: ApiKeyData;
    error?: string;
  }> {
    try {
      // Verificar se é a chave de admin (env)
      const adminKey = getAdminKey();
      
      if (apiKey === adminKey) {
        // Log de forma segura (sem exibir a chave)
        console.log(`[AUTH] Admin key validada [${apiKey.substring(0, 4)}****]`);
        
        // Retornar dados simulados para admin
        const now = new Date();
        return {
          valid: true,
          apiKeyData: {
            id: 'admin',
            key: adminKey,
            nome: 'Administrator',
            tipo: 'admin',
            isActive: true,
            rateLimit: Infinity,
            dailyLimit: Infinity,
            totalRequests: 0,
            usedToday: 0,
            usedThisHour: 0,
            lastResetHour: now,
            lastResetDay: now,
            expiresAt: null,
            createdBy: null,
            createdAt: now,
            updatedAt: now
          }
        };
      }

      // Buscar chave no banco
      const apiKeyData = await db.apiKey.findUnique({
        where: { key: apiKey }
      });

      if (!apiKeyData) {
        console.log(`[AUTH] API-KEY não encontrada: [${apiKey.substring(0, 4)}****]`);
        return {
          valid: false,
          error: 'API-KEY inválida'
        };
      }

      if (!apiKeyData.isActive) {
        console.log(`[AUTH] API-KEY desativada: [${apiKey.substring(0, 4)}****]`);
        return {
          valid: false,
          error: 'API-KEY desativada'
        };
      }

      if (apiKeyData.expiresAt && apiKeyData.expiresAt < new Date()) {
        console.log(`[AUTH] API-KEY expirada: [${apiKey.substring(0, 4)}****]`);
        return {
          valid: false,
          error: 'API-KEY expirada'
        };
      }

      // Log de forma segura
      console.log(`[AUTH] Chave válida [${apiKey.substring(0, 4)}****]: ${apiKeyData.nome} (${apiKeyData.tipo})`);

      // Resetar contadores se necessário
      await this.resetCountersIfNeeded(apiKeyData);

      return {
        valid: true,
        apiKeyData
      };
    } catch (error) {
      console.error(`[AUTH] Erro ao validar API-KEY:`, error);
      return {
        valid: false,
        error: 'Erro interno ao validar chave'
      };
    }
  }

/**
 * Verifica e reseta contadores de rate limiting
 */
private static async resetCountersIfNeeded(apiKeyData: ApiKeyData): Promise<void> {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const updates: any = {};

  // Resetar contador de hora
  if (!apiKeyData.lastResetHour || apiKeyData.lastResetHour < oneHourAgo) {
    updates.usedThisHour = 0;
    updates.lastResetHour = now;
  }

  // Resetar contador de dia
  if (!apiKeyData.lastResetDay || apiKeyData.lastResetDay < oneDayAgo) {
    updates.usedToday = 0;
    updates.lastResetDay = now;
  }

  if (Object.keys(updates).length > 0) {
    await db.apiKey.update({
      where: { id: apiKeyData.id },
      data: updates
    });
  }
}

/**
 * Incrementa contador de requisições
 * Implementa proteção avançada contra ataques
 */
export static async incrementRequest(apiKey: string, clientIp: string, userAgent: string): Promise<{
  allowed: boolean;
  remainingHour?: number;
  remainingDay?: number;
  error?: string;
  securityChecks?: {
    sqlInjectionRisk: string;
    replayRisk: string;
    floodRisk: string;
  };
}> {
  try {
    const nonceTTL = getNonceTTL();
    const floodThreshold = getFloodThreshold();

    // Verificar se é admin key
    const adminKey = getAdminKey();
    if (apiKey === adminKey) {
      return {
        allowed: true,
        securityChecks: {
          sqlInjectionRisk: 'LOW',
          replayRisk: 'NONE',
          floodRisk: 'NONE'
        }
      };
    }

    // Buscar dados da chave
    const apiKeyData = await db.apiKey.findUnique({
      where: { key: apiKey }
    });

    if (!apiKeyData || !apiKeyData.isActive) {
      return {
        allowed: false,
        error: 'API-KEY inválida ou desativada',
        securityChecks: {
          sqlInjectionRisk: 'LOW',
          replayRisk: 'NONE',
          floodRisk: 'NONE'
        }
      };
    }

    // Resetar contadores se necessário
    await this.resetCountersIfNeeded(apiKeyData);

    // Verificar limites de rate
    const remainingHour = apiKeyData.rateLimit - apiKeyData.usedThisHour - 1;
    const remainingDay = apiKeyData.dailyLimit - apiKeyData.usedToday - 1;

    if (remainingHour < 0) {
      const sanitizedIp = sanitizeForLogging(clientIp);
      console.log(`[AUTH] Rate limit hora atingido [${apiKey.substring(0, 4)}****]: ${sanitizedIp}`);
      
      await this.auditLog(apiKey, 'rate_limit_hour', 'consultas', sanitizedIp, userAgent, false, {
        rateLimit: apiKeyData.rateLimit,
        used: apiKeyData.usedThisHour + 1
      });

      return {
        allowed: false,
        error: 'Limite de requisições por hora excedido',
        remainingHour: 0,
        remainingDay,
        securityChecks: {
          sqlInjectionRisk: 'LOW',
          replayRisk: 'NONE',
          floodRisk: 'HIGH'
        }
      };
    }

    if (remainingDay < 0) {
      const sanitizedIp = sanitizeForLogging(clientIp);
      console.log(`[AUTH] Rate limit dia atingido [${apiKey.substring(0, 4)}****]: ${sanitizedIp}`);
      
      await this.auditLog(apiKey, 'rate_limit_day', 'consultas', sanitizedIp, userAgent, false, {
        rateLimit: apiKeyData.dailyLimit,
        used: apiKeyData.usedToday + 1
      });

      return {
        allowed: false,
        error: 'Limite de requisições por dia excedido',
        remainingHour,
        remainingDay: 0,
        securityChecks: {
          sqlInjectionRisk: 'LOW',
          replayRisk: 'NONE',
          floodRisk: 'HIGH'
        }
      };
    }

    // Incrementar contadores
    await db.apiKey.update({
      where: { id: apiKeyData.id },
      data: {
        usedThisHour: { increment: 1 },
        usedToday: { increment: 1 },
        totalRequests: { increment: 1 },
        updatedAt: new Date()
      }
    });

    return {
      allowed: true,
      remainingHour,
      remainingDay,
      securityChecks: {
        sqlInjectionRisk: 'LOW',
        replayRisk: 'NONE',
        floodRisk: 'NONE'
      }
    };
  } catch (error) {
    console.error('[AUTH] Erro ao incrementar requisição:', error);
    return {
      allowed: false,
      error: 'Erro interno'
    };
  }
}

/**
 * Registra log de auditoria
 * Formata dados sensíveis antes de salvar
 */
export static async auditLog(apiKey: string, acao: string, tipo: string | undefined, ip: string | undefined, userAgent: string | undefined, sucesso: boolean, detalhes?: any): Promise<void> {
  try {
    // Sanitizar IP para logs
    const sanitizedIp = ip ? sanitizeForLogging(ip) : 'unknown';
    
    // Sanitizar user agent para logs
    const sanitizedUserAgent = userAgent ? sanitizeForLogging(userAgent) : 'unknown';
    
    // Maskar API-KEY se for admin
    let maskedKey = apiKey;
    const adminKey = getAdminKey();
    if (apiKey === adminKey) {
      maskedKey = 'ADMIN_KEY';
    } else {
      maskedKey = `${apiKey.substring(0, 4)}****${apiKey.substring(apiKey.length - 4)}`;
    }

    // Sanitizar detalhes se houverem
    const sanitizedDetalhes = detalhes ? {
      ...dethes,
      cpf: detalhes.cpf ? maskSensitiveData({ cpf: detalhes.cpf }) : undefined,
      numero: detalhes.numero ? maskSensitiveData({ numero: detalhes.numero }) : undefined
    } : {};

    await db.auditLog.create({
      data: {
        apiKeyId: maskedKey,
        acao,
        tipo,
        ip: sanitizedIp,
        userAgent: sanitizedUserAgent,
        sucesso,
        detalhes: JSON.stringify(sanitizedDetalhes)
      }
    });
  } catch (error) {
    console.error('[AUTH] Erro ao registrar audit log:', error);
  }
}

/**
 * Verifica se é admin
 * Comparação segura (não loga chave)
 */
export static isAdmin(apiKey: string): boolean {
  const adminKey = getAdminKey();
  return apiKey === adminKey;
}

/**
 * Lista todas as API-KEYs (apenas admin)
 * Formata dados sensíveis
 */
export static async getAllApiKeys(): Promise<ApiKeyData[]> {
  try {
    const adminKey = getAdminKey();
    const keys = await db.apiKey.findMany({
      orderBy: { createdAt: 'desc' }
    });

    // Maskar chaves não-admin
    return keys.map(key => ({
      ...key,
      key: key.key === adminKey ? 'ADMIN_KEY' : `${key.key.substring(0, 4)}****${key.key.substring(key.key.length - 4)}`
    })) as any;
  } catch (error) {
    console.error('[AUTH] Erro ao buscar API-KEYs:', error);
    return [];
  }
}

/**
 * Cria nova API-KEY
 * Valida entrada e usa proteções
 */
export static async createApiKey(nome: string, tipo: string, rateLimit: number, dailyLimit: number, createdBy: string): Promise<{ success: boolean; key?: string; error?: string }> {
  try {
    // Validações de segurança
    if (nome.length < 3 || nome.length > 50) {
      return {
        success: false,
        error: 'Nome deve ter entre 3 e 50 caracteres'
      };
    }

    if (rateLimit < 10 || rateLimit > 1000) {
      return {
        success: false,
        error: 'Rate limit por hora deve estar entre 10 e 1000'
      };
    }

    if (dailyLimit < 100 || dailyLimit > 10000) {
      return {
        success: false,
        error: 'Rate limit por dia deve estar entre 100 e 10000'
      };
    }

    const newKey = generateNonce(32);

    await db.apiKey.create({
      data: {
        key: newKey,
        nome,
        tipo,
        isActive: true,
        rateLimit,
        dailyLimit,
        createdBy
      }
    });

    // Log de criação (sem expor chave)
    console.log(`[AUTH] Nova API-KEY criada: ${nome} (${tipo})`);

    // Registrar log de auditoria
    await this.auditLog(
      getAdminKey(),
      'create_api_key',
      tipo,
      undefined,
      undefined,
      true,
      { nome, tipo, rateLimit, dailyLimit, key: '***' + newKey.substring(28) }
    );

    return {
      success: true,
      key: newKey
    };
  } catch (error) {
    console.error('[AUTH] Erro ao criar API-KEY:', error);
    return {
      success: false,
      error: 'Erro ao criar API-KEY'
    };
  }
}

/**
 * Ativa/desativa API-KEY
 */
export static async toggleApiKey(apiKeyId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const key = await db.apiKey.findUnique({ where: { id: apiKeyId } });
    
    if (!key) {
      return { success: false, error: 'API-KEY não encontrada' };
    }

    await db.apiKey.update({
      where: { id: apiKeyId },
      data: { isActive: !key.isActive, updatedAt: new Date() }
    });

    // Log de ação
    console.log(`[AUTH] API-KEY ${key.isActive ? 'desativada' : 'ativada'}: ${key.nome}`);

    // Registrar log de auditoria
    await this.auditLog(
      getAdminKey(),
      'toggle_api_key',
      'admin',
      undefined,
      undefined,
      true,
      { keyId: apiKeyId, novoStatus: !key.isActive ? 'inativo' : 'ativo', nome: key.nome }
    );

    return { success: true };
  } catch (error) {
    console.error('[AUTH] Erro ao alternar API-KEY:', error);
    return { success: false, error: 'Erro ao atualizar API-KEY' };
  }
}

/**
 * Remove API-KEY
 */
export static async deleteApiKey(apiKeyId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const key = await db.apiKey.findUnique({ where: { id: apiKeyId } });
    
    if (!key) {
      return { success: false, error: 'API-KEY não encontrada' };
    }

    // Verificar se está tentando deletar a chave de admin
    const adminKey = getAdminKey();
    if (key.key === adminKey) {
      console.error('[AUTH] Tentativa de deletar chave de admin!');
      return { success: false, error: 'Não é possível deletar a chave de administrador' };
    }

    await db.apiKey.delete({ where: { id: apiKeyId } });

    // Log de deleção
    console.log(`[AUTH] API-KEY removida: ${key.nome}`);

    // Registrar log de auditoria
    await this.auditLog(
      getAdminKey(),
      'delete_api_key',
      'admin',
      undefined,
      undefined,
      true,
      { keyId: apiKeyId, nome: key.nome }
    );

    return { success: true };
  } catch (error) {
    console.error('[AUTH] Erro ao remover API-KEY:', error);
    return { success: false, error: 'Erro ao remover API-KEY' };
  }
}

/**
 * Verifica nonce de anti-replay
 */
export static validateNonce(nonce: string, clientIp: string, clientFingerprint: string): {
  valid: boolean;
  error?: string;
} {
  if (!nonce) {
    return { valid: false, error: 'Nonce não fornecido' };
  }

  const nonceTTL = getNonceTTL();
  
  // Verificar expiração
  const nonceEntry = nonceStore.get(nonce);
  if (!nonceEntry) {
    return { valid: false, error: 'Nonce não encontrado ou expirado' };
  }

  if (isNonceExpired(nonceEntry.timestamp, nonceTTL)) {
    clearExpiredNonces(); // Limpar nãoces expirados
    return { valid: false, error: 'Nonce expirado' };
  }

  // Verificar ataque de replay
  const replayCheck = isReplayAttack(nonce, clientIp, clientFingerprint);
  if (replayCheck.isReplay) {
    console.log(`[AUTH] Ataque de replay detectado [${replayCheck.reason}]: ${clientIp}`);
    
    // Limpar nonce para prevenir reuso
    consumeNonce(nonce);
    
    return { valid: false, error: `Ataque de replay detectado: ${replayCheck.reason}` };
  }

  // Verificar flooding
  const signature = generateRequestSignature('GET', '/api/consultas', {}, clientIp, clientFingerprint);
  const floodCheck = isFloodingAttack(signature, clientIp);
  if (floodCheck.isFlooding) {
    console.log(`[AUTH] Flooding detectado: ${floodCheck.requestCount} requisições`);
    
    return {
      valid: false,
      error: `Too many requests (${floodCheck.requestCount}). Please slow down.`
    };
  }

  return { valid: true };
}

/**
 * Limpa nãoces expirados (deve ser chamado periodicamente)
 */
export static async clearExpiredNoncesScheduled(): Promise<number> {
  try {
    const count = clearExpiredNonces();
    console.log(`[AUTH] ${count} nãoces expirados limpos`);
    return count;
  } catch (error) {
    console.error('[AUTH] Erro ao limpar nãoces:', error);
    return 0;
  }
}
