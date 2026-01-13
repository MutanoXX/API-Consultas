import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth-service';
import {
  validateNonce,
  isReplayAttack,
  isFloodingAttack,
  clearSecurityCache,
  getReplayProtectionStats
} from '@/lib/security/anti-replay';

/**
 * Ativar/desativar API-KEY
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const adminKey = request.headers.get('x-admin-key') ||
                     request.cookies.get('adminKey')?.value;

    if (!AuthService.isAdmin(adminKey)) {
      return NextResponse.json(
        { success: false, error: 'Chave de administrador inválida' },
        { status: 403 }
      );
    }

    // Anti-replay protection
    const clientIp = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const replayCheck = isReplayAttack(params.id, clientIp, userAgent);
    if (replayCheck.isReplay) {
      console.log(`[API Admin Keys PATCH] Replay detectado: ${replayCheck.reason}`);
      return NextResponse.json(
        { success: false, error: replayCheck.reason },
        { status: 429 }
      );
    }

    const floodCheck = isFloodingAttack(`PATCH:/api/admin/keys/${params.id}`, clientIp);
    if (floodCheck.isFlooding) {
      return NextResponse.json(
        { success: false, error: `Too many requests (${floodCheck.requestCount})` },
        { status: 429 }
      );
    }

    const result = await AuthService.toggleApiKey(params.id);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    await db.auditLog.create({
      data: {
        apiKeyId: 'admin',
        acao: 'toggle_api_key',
        tipo: 'admin',
        sucesso: true,
        detalhes: JSON.stringify({ keyId: params.id })
      }
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API Admin Keys PATCH] Erro ao alternar API-KEY:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar API-KEY' },
      { status: 500 }
    );
  }
}

/**
 * Deletar API-KEY
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const adminKey = request.headers.get('x-admin-key') ||
                     request.cookies.get('adminKey')?.value;

    if (!AuthService.isAdmin(adminKey)) {
      return NextResponse.json(
        { success: false, error: 'Chave de administrador inválida' },
        { status: 403 }
      );
    }

    // Anti-replay protection
    const clientIp = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const replayCheck = isReplayAttack(params.id, clientIp, userAgent);
    if (replayCheck.isReplay) {
      console.log(`[API Admin Keys DELETE] Replay detectado: ${replayCheck.reason}`);
      return NextResponse.json(
        { success: false, error: replayCheck.reason },
        { status: 429 }
      );
    }

    const floodCheck = isFloodingAttack(`DELETE:/api/admin/keys/${params.id}`, clientIp);
    if (floodCheck.isFlooding) {
      return NextResponse.json(
        { success: false, error: `Too many requests (${floodCheck.requestCount})` },
        { status: 429 }
      );
    }

    const result = await AuthService.deleteApiKey(params.id);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    await db.auditLog.create({
      data: {
        apiKeyId: 'admin',
        acao: 'delete_api_key',
        tipo: 'admin',
        sucesso: true,
        detalhes: JSON.stringify({ keyId: params.id })
      }
    });

    return NextResponse.json({
      success: true,
      message: 'API-KEY removida com sucesso',
      securityStats: getReplayProtectionStats()
    });
  } catch (error) {
    console.error('[API Admin Keys DELETE] Erro ao remover API-KEY:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao remover API-KEY' },
      { status: 500 }
    );
  }
}
