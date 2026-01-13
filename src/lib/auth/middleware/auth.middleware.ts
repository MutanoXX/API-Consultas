import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth-service';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    apiKeyId: string;
    nome: string;
    tipo: string;
    isAdmin: boolean;
  };
}

/**
 * Middleware para autenticar requisições por API-KEY
 */
export async function withAuth(
  handler: (req: NextRequest, user: any) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const apiKey = req.headers.get('x-api-key') || 
                    req.nextUrl.searchParams.get('apiKey') || 
                    req.cookies.get('apiKey')?.value;

    if (!apiKey) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'API-KEY não fornecida',
          code: 'MISSING_API_KEY'
        },
        { status: 401 }
      );
    }

    const validation = await AuthService.validateApiKey(apiKey);

    if (!validation.valid) {
      return NextResponse.json(
        { 
          success: false, 
          error: validation.error,
          code: 'INVALID_API_KEY'
        },
        { status: 401 }
      );
    }

    // Verificar rate limit
    const rateCheck = await AuthService.incrementRequest(apiKey);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          error: rateCheck.error,
          code: 'RATE_LIMIT_EXCEEDED',
          remainingHour: rateCheck.remainingHour,
          remainingDay: rateCheck.remainingDay
        },
        { status: 429 }
      );
    }

    // Adicionar informações do usuário ao request
    (req as any).user = {
      apiKeyId: validation.apiKeyData?.id,
      nome: validation.apiKeyData?.nome,
      tipo: validation.apiKeyData?.tipo,
      isAdmin: AuthService.isAdmin(apiKey)
    };

    // Executar handler com usuário autenticado
    return handler(req, (req as any).user);
  };
}

/**
 * Middleware para rotas de admin apenas
 */
export async function withAdminAuth(
  handler: (req: NextRequest, user: any) => Promise<NextResponse>
) {
  return withAuth(async (req: NextRequest, user: any) => {
    if (!user?.isAdmin) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Acesso negado. Requer privilégios de administrador',
          code: 'INSUFFICIENT_PERMISSIONS'
        },
        { status: 403 }
      );
    }

    return handler(req, user);
  });
}
