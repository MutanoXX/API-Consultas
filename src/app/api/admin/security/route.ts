import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  getReplayProtectionStats,
  clearExpiredNonces,
  clearSecurityCache,
  getReplayProtectionStats
} from '@/lib/security/anti-replay';
import { CacheService } from '@/lib/cache/cache-service';
import { AuthService } from '@/lib/auth/auth-service';
import { getAdminKey, isProduction, SECURITY_LOG_PREFIX } from '@/lib/security/config';

/**
 * Endpoint de Status de Segurança
 * Fornece métricas em tempo real do sistema de proteção
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar Admin Key
    const adminKey = request.headers.get('x-admin-key') ||
                     request.nextUrl.searchParams.get('adminKey');

    if (!AuthService.isAdmin(adminKey)) {
      return NextResponse.json(
        { success: false, error: 'Acesso negado. Chave de administrador inválida.' },
        { status: 403 }
      );
    }

    // Obter estatísticas de replay protection
    const replayStats = getReplayProtectionStats();

    // Obter estatísticas de cache
    const cacheStats = await CacheService.getStats();

    // Contar API-KEYs
    const apiKeysCount = await db.apiKey.count();
    const activeApiKeys = await db.apiKey.count({ where: { isActive: true } });

    // Obter logs recentes de segurança
    const recentSecurityLogs = await db.auditLog.findMany({
      where: {
        acao: {
          in: [
            'sql_injection_detected',
            'replay_attack_detected',
            'flood_attack_detected',
            'rate_limit_exceeded',
            'unauthorized_access',
            'invalid_tipo',
            'invalid_input_validation'
          ]
        }
      },
      take: 20,
      orderBy: { createdAt: 'desc' }
    });

    // Calcular métricas de ameaça
    const totalLogs = await db.auditLog.count();
    const securityEvents = await db.auditLog.count({
      where: {
        acao: {
          in: [
            'sql_injection_detected',
            'replay_attack_detected',
            'flood_attack_detected',
            'unauthorized_access'
          ]
        }
      }
    });

    // Threat score (0-100)
    const threatScore = Math.min(
      Math.round((securityEvents / Math.max(totalLogs, 1)) * 100),
      100
    );

    // Threat level
    let threatLevel = 'BAIXO';
    if (threatScore > 70) {
      threatLevel = 'CRÍTICO';
    } else if (threatScore > 50) {
      threatLevel = 'ALTO';
    } else if (threatScore > 20) {
      threatLevel = 'MÉDIO';
    }

    // Obter logs por tipo de ataque
    const sqlInjectionLogs = await db.auditLog.count({
      where: { acao: 'sql_injection_detected' }
    });
    const replayAttackLogs = await db.auditLog.count({
      where: { acao: 'replay_attack_detected' }
    });
    const floodAttackLogs = await db.auditLog.count({
      where: { acao: 'flood_attack_detected' }
    });
    const rateLimitLogs = await db.auditLog.count({
      where: { acao: 'rate_limit_exceeded' }
    });
    const unauthorizedLogs = await db.auditLog.count({
      where: { acao: 'unauthorized_access' }
    });

    // Status dos sistemas de proteção
    const protectionSystems = {
      antiReplay: {
        enabled: true,
        activeNonces: replayStats.activeNonces,
        totalNonces: replayStats.totalNonces,
        blockedRequests: replayStats.blockedRequests,
        status: 'ATIVO'
      },
      cacheSystem: {
        enabled: true,
        hitRate: cacheStats.hitRate,
        totalEntries: cacheStats.totalEntries,
        expiredCount: cacheStats.expiredCount,
        status: cacheStats.hitRate > 50 ? 'OTIMIZADO' : 'BOM'
      },
      rateLimiting: {
        enabled: true,
        activeKeys: activeApiKeys,
        totalKeys: apiKeysCount,
        status: 'ATIVO'
      },
      sqlInjection: {
        enabled: true,
        detectedAttempts: sqlInjectionLogs,
        blockedRequests: sqlInjectionLogs,
        status: 'ATIVO'
      }
    };

    return NextResponse.json({
      success: true,
      systemInfo: {
        environment: isProduction() ? 'PRODUÇÃO' : 'DESENVOLVIMENTO',
        timestamp: new Date().toISOString(),
        adminKeyStatus: 'ATIVO',
        adminKeyHash: getAdminKey().substring(0, 8) + '...' + getAdminKey().substring(getAdminKey().length - 4)
      },
      threatAssessment: {
        threatScore,
        threatLevel,
        totalEvents: securityEvents,
        eventsLast24h: await db.auditLog.count({
          where: {
            acao: {
              in: [
                'sql_injection_detected',
                'replay_attack_detected',
                'flood_attack_detected',
                'unauthorized_access'
              ]
            },
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          }
        }),
        recommendation: getThreatRecommendation(threatScore, threatLevel)
      },
      attackStatistics: {
        sqlInjection: sqlInjectionLogs,
        replayAttacks: replayAttackLogs,
        floodAttacks: floodAttackLogs,
        rateLimitBreaches: rateLimitLogs,
        unauthorizedAttempts: unauthorizedLogs,
        totalSecurityEvents: securityEvents,
        successfulAttacks: await db.auditLog.count({ where: { acao: 'consulta' } }),
        threatPercentage: totalLogs > 0 
          ? ((securityEvents / totalLogs) * 100).toFixed(1) 
          : '0.0'
      },
      protectionSystems,
      cacheMetrics: {
        totalEntries: cacheStats.totalEntries,
        byType: cacheStats.byType,
        expiredCount: cacheStats.expiredCount,
        hitRate: cacheStats.hitRate,
        efficiency: cacheStats.hitRate > 70 ? 'ALTA' : cacheStats.hitRate > 50 ? 'MÉDIA' : 'BAIXA'
      },
      recentSecurityLogs: recentSecurityLogs.map(log => ({
        id: log.id,
        timestamp: log.createdAt,
        action: log.acao,
        type: log.tipo,
        ip: log.ip,
        success: log.sucesso,
        details: log.detalhes ? JSON.parse(log.detalhes) : null
      })),
      recommendations: getSecurityRecommendations(protectionSystems, threatLevel)
    });

  } catch (error) {
    console.error('[API Security Status] Erro:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao obter status de segurança' },
      { status: 500 }
    );
  }
}

/**
 * Ação de limpar cache de segurança
 */
export async function POST(request: NextRequest) {
  try {
    const adminKey = request.headers.get('x-admin-key') ||
                     request.nextUrl.searchParams.get('adminKey');

    if (!AuthService.isAdmin(adminKey)) {
      return NextResponse.json(
        { success: false, error: 'Acesso negado' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'clear_expired_nonces') {
      const cleared = await clearExpiredNonces();
      return NextResponse.json({
        success: true,
        message: `${cleared} nãoces expirados limpos`
      });
    }

    if (action === 'clear_security_cache') {
      clearSecurityCache();
      return NextResponse.json({
        success: true,
        message: 'Cache de segurança limpo'
      });
    }

    if (action === 'clear_all_cache') {
      const cleared = await CacheService.clearAll();
      return NextResponse.json({
        success: true,
        message: `${cleared} entradas de cache limpas`
      });
    }

    return NextResponse.json(
      { success: false, error: 'Ação inválida' },
      { status: 400 }
    );

  } catch (error) {
    console.error('[API Security Status] Erro:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno' },
      { status: 500 }
    );
  }
}

function getThreatRecommendation(score: number, level: string): string {
  if (score > 70) {
    return 'Nível CRÍTICO de ameaça detectado. Revise logs imediatamente e considere bloquear IPs suspeitos.';
  }
  if (score > 50) {
    return 'Nível ALTO de ameaça. Monitore logs ativamente e investigue acessos suspeitos.';
  }
  if (score > 20) {
    return 'Nível MÉDIO de ameaça. Mantenha monitoramento e esteja preparado.';
  }
  return 'Nível BAIXO de ameaça. O sistema está operando dentro dos parâmetros normais de segurança.';
}

function getSecurityRecommendations(systems: any, threatLevel: string): string[] {
  const recommendations: string[] = [];

  if (threatLevel === 'CRÍTICO' || threatLevel === 'ALTO') {
    recommendations.push('Considere habilitar firewall WAF');
    recommendations.push('Revise logs de auditoria para IPs suspeitos');
    recommendations.push('Considere bloquear temporariamente IPs com muitas falhas');
    recommendations.push('Aumente a rigorosidade da validação');
  }

  if (systems.cacheSystem.hitRate < 50) {
    recommendations.push('Otimize a estratégia de cache para melhorar hit rate');
  }

  if (systems.antiReplay.blockedRequests > systems.antiReplay.totalNonces / 2) {
    recommendations.push('Muitas requisições bloqueadas por replay. Considere ajustar TTL');
  }

  if (recommendations.length === 0) {
    recommendations.push('Sistema operando com segurança ótima. Continue monitorando.');
  }

  return recommendations;
}
