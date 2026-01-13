import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AuthService } from '@/lib/auth/auth-service';
import {
  validateNonce,
  isFloodingAttack,
  clearSecurityCache,
  getReplayProtectionStats
} from '@/lib/security/anti-replay';

/**
 * Criar nova API-KEY (apenas admin)
 * Proteção avançada contra ataques
 */
export async function POST(request: NextRequest) {
  try {
    // Obter headers
    const adminKey = request.headers.get('x-admin-key') ||
                     request.cookies.get('adminKey')?.value;

    // Verificar Admin Key
    if (!AuthService.isAdmin(adminKey)) {
      return NextResponse.json(
        { success: false, error: 'Chave de administrador inválida' },
        { status: 403 }
      );
    }

    // Anti-Flood protection
    const clientIp = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') || 'unknown';
    const signature = `POST:/api/admin/keys:${clientIp}`;

    const floodCheck = isFloodingAttack(signature, clientIp);
    if (floodCheck.isFlooding) {
      console.log(`[API Admin] Flooding detectado: ${floodCheck.requestCount} requests`);

      return NextResponse.json(
        {
          success: false,
          error: 'Too many requests. Please slow down.',
          floodDetected: true
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { nome, tipo, rateLimit, dailyLimit } = body;

    // Validação de entrada
    if (!nome || nome.length < 3 || nome.length > 50) {
      return NextResponse.json(
        { success: false, error: 'Nome deve ter entre 3 e 50 caracteres' },
        { status: 400 }
      );
    }

    const tiposValidos = ['premium', 'standard', 'admin'];
    if (!tipo || !tiposValidos.includes(tipo)) {
      return NextResponse.json(
        { success: false, error: `Tipo inválido. Tipos disponíveis: ${tiposValidos.join(', ')}` },
        { status: 400 }
      );
    }

    const rateLimitNum = parseInt(rateLimit) || 100;
    const dailyLimitNum = parseInt(dailyLimit) || 1000;

    if (isNaN(rateLimitNum) || rateLimitNum < 10 || rateLimitNum > 1000) {
      return NextResponse.json(
        { success: false, error: 'Rate limit por hora deve estar entre 10 e 1000' },
        { status: 400 }
      );
    }

    if (isNaN(dailyLimitNum) || dailyLimitNum < 100 || dailyLimitNum > 10000) {
      return NextResponse.json(
        { success: false, error: 'Rate limit por dia deve estar entre 100 e 10000' },
        { status: 400 }
      );
    }

    // Criar nova chave
    const result = await AuthService.createApiKey(
      nome,
      tipo,
      rateLimitNum,
      dailyLimitNum,
      'admin'
    );

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    // Log seguro (sem expor chave)
    await db.auditLog.create({
      data: {
        apiKeyId: 'admin',
        acao: 'create_api_key',
        tipo: 'admin',
        sucesso: true,
        detalhes: JSON.stringify({
          nome,
          tipo,
          rateLimit: rateLimitNum,
          dailyLimit: dailyLimitNum,
          clientIp
        })
      }
    });

    return NextResponse.json({
      success: true,
      key: result.key,
      message: 'API-KEY criada com sucesso',
      securityStats: getReplayProtectionStats()
    });

  } catch (error) {
    console.error('[API Admin Keys POST] Erro:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao criar API-KEY' },
      { status: 500 }
    );
  }
}

/**
 * Listar todas as API-KEYs (apenas admin)
 */
export async function GET(request: NextRequest) {
  try {
    const adminKey = request.headers.get('x-admin-key') ||
                     request.cookies.get('adminKey')?.value;

    if (!AuthService.isAdmin(adminKey)) {
      return NextResponse.json(
        { success: false, error: 'Chave de administrador inválida' },
        { status: 403 }
      );
    }

    // Listar chaves (já maskadas pelo auth-service)
    const keys = await AuthService.getAllApiKeys();

    return NextResponse.json({
      success: true,
      keys,
      count: keys.length,
      securityStats: getReplayProtectionStats()
    });

  } catch (error) {
    console.error('[API Admin Keys GET] Erro:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao listar API-KEYs' },
      { status: 500 }
    );
  }
}
