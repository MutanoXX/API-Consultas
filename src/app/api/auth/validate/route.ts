import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth-service';

/**
 * Endpoint de Validação de API-KEY
 * Valida no servidor-side sem expor a chave real
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey } = body;

    if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 10) {
      return NextResponse.json(
        { 
          valid: false, 
          error: 'API-KEY inválida ou muito curta' 
        },
        { status: 400 }
      );
    }

    // Validar API-KEY
    const validation = await AuthService.validateApiKey(apiKey);

    if (!validation.valid) {
      return NextResponse.json(
        {
          valid: false,
          error: validation.error
        },
        { status: 401 }
      );
    }

    // Retornar dados do usuário sem expor a chave completa
    const userData = validation.apiKeyData;
    const maskedKey = userData?.key
      ? userData.key === 'ADMIN_KEY'
        ? 'ADMIN_KEY'
        : `${userData.key.substring(0, 4)}****${userData.key.substring(userData.key.length - 4)}`
      : '';

    return NextResponse.json({
      valid: true,
      userData: {
        nome: userData?.nome,
        tipo: userData?.tipo,
        isAdmin: AuthService.isAdmin(apiKey),
        maskedKey,
        rateLimit: userData?.rateLimit,
        dailyLimit: userData?.dailyLimit,
        usedToday: userData?.usedToday,
        usedThisHour: userData?.usedThisHour
      },
      message: 'API-KEY válida'
    });

  } catch (error) {
    console.error('[API Auth Validate] Erro:', error);
    return NextResponse.json(
      { 
        valid: false, 
        error: 'Erro interno ao validar API-KEY' 
      },
      { status: 500 }
    );
  }
}
