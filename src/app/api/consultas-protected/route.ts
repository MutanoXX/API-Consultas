import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { CacheService } from '@/lib/cache/cache-service';
import { AuthService } from '@/lib/auth/auth-service';
import {
  validateTipo,
  validateCpf,
  validateNome,
  validateNumero,
  containsSqlKeywords,
  detectSqlInjection,
  assessSecurityRisk,
  maskSensitiveData
} from '@/lib/security/anti-sql';
import {
  validateCpfResponse,
  validateNomeResponse,
  validateNumeroResponse,
  analyzePackageSecurity,
  maskPackageData
} from '@/lib/security/integrity';
import {
  validateNonce,
  calculateClientFingerprint,
  isReplayAttack,
  generateRequestSignature,
  isFloodingAttack
} from '@/lib/security/anti-replay';

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // Obter API-KEY
  const apiKey = request.headers.get('x-api-key') ||
                  request.nextUrl.searchParams.get('apiKey') ||
                  request.cookies.get('apiKey')?.value;

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

  // 1. VALIDAR API-KEY
  const authValidation = await AuthService.validateApiKey(apiKey);
  if (!authValidation.valid) {
    await AuthService.auditLog(apiKey, 'unauthorized_access', undefined, request.headers.get('user-agent'), false, { error: authValidation.error });
    return NextResponse.json(
      {
        success: false,
        error: authValidation.error,
        code: 'INVALID_API_KEY'
      },
      { status: 401 }
    );
  }

  // 2. VERIFICAR RATE LIMIT
  const rateCheck = await AuthService.incrementRequest(apiKey, request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown', request.headers.get('user-agent') || 'unknown');
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

  // 3. OBTER PARÂMETROS
  const searchParams = request.nextUrl.searchParams;
  const tipo = searchParams.get('tipo');
  const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const acceptHeader = request.headers.get('accept');
  const acceptEncoding = request.headers.get('accept-encoding');
  const acceptLanguage = request.headers.get('accept-language');

  // 4. VALIDAR TIPO DE CONSULTA
  const tipoValidation = validateTipo(tipo);
  if (!tipoValidation.isValid) {
    await AuthService.auditLog(apiKey, 'invalid_tipo', undefined, clientIp, userAgent, false, { error: tipoValidation.error });
    return NextResponse.json(
      {
        success: false,
        error: tipoValidation.error,
        code: 'INVALID_TYPE'
      },
      { status: 400 }
    );
  }

  const tipoLower = tipo.toLowerCase();

  // 5. PREPARAR DADOS DE CONSULTA
  let query = '';
  let apiUrl = '';
  let validationError = null;

  switch (tipoLower) {
    case 'cpf':
      const cpf = searchParams.get('cpf');
      const cpfValidation = validateCpf(cpf || '');
      if (!cpfValidation.isValid) {
        validationError = cpfValidation.error;
        break;
      }
      query = cpf!.replace(/\D/g, '');

      // ANTI-SQL INJECTION: Detectar tentativas
      if (containsSqlKeywords(query) || detectSqlInjection(query)) {
        validationError = 'CPF contém caracteres ou padrões SQL inválidos';
      }

      apiUrl = `https://world-ecletix.onrender.com/api/consultarcpf?cpf=${query}`;
      break;

    case 'nome':
      const nome = searchParams.get('q');
      const nomeValidation = validateNome(nome || '');
      if (!nomeValidation.isValid) {
        validationError = nomeValidation.error;
        break;
      }
      query = nome!.trim();

      // ANTI-SQL INJECTION
      if (containsSqlKeywords(query) || detectSqlInjection(query)) {
        validationError = 'Nome contém caracteres ou padrões SQL inválidos';
      }

      apiUrl = `https://world-ecletix.onrender.com/api/nome-completo?q=${encodeURIComponent(query)}`;
      break;

    case 'numero':
      const numero = searchParams.get('q');
      const numeroValidation = validateNumero(numero || '');
      if (!numeroValidation.isValid) {
        validationError = numeroValidation.error;
        break;
      }
      query = numero!.replace(/\D/g, '');

      // ANTI-SQL INJECTION
      if (containsSqlKeywords(query) || detectSqlInjection(query)) {
        validationError = 'Número contém caracteres ou padrões SQL inválidos';
      }

      apiUrl = `https://world-ecletix.onrender.com/api/numero?q=${encodeURIComponent(numero)}`;
      break;

    default:
      return NextResponse.json(
        {
          success: false,
          error: `Tipo desconhecido: ${tipo}`,
          code: 'UNKNOWN_TYPE',
          tiposDisponiveis: ['cpf', 'nome', 'numero']
        },
        { status: 400 }
      );
  }

  if (validationError) {
    await AuthService.auditLog(apiKey, 'invalid_input_validation', tipoLower, clientIp, userAgent, false, { error: validationError });
    return NextResponse.json(
      {
        success: false,
        error: validationError,
        code: 'VALIDATION_ERROR'
      },
      { status: 400 }
    );
  }

  // 6. VERIFICAR CACHE PRIMEIRO
  const cached = await CacheService.get(tipoLower, query);
  if (cached) {
    const tempoResposta = cached.tempoResposta;

    await AuthService.auditLog(apiKey, 'cache_hit', tipoLower, clientIp, userAgent, true, {
      cached: true,
      hitCount: cached.hitCount,
      tempo: tempoResposta
    });

    return NextResponse.json({
      success: true,
      data: cached.resultado,
      fromCache: true,
      tempoResposta,
      hitCount: cached.hitCount,
      cacheAge: Date.now() - cached.createdAt,
      criador: '@MutanoX',
      warnings: []
    });
  }

  // 7. VERIFICAR REPLAY ANTES DE FAZER REQUISIÇÃO
  const clientFingerprint = calculateClientFingerprint(clientIp, userAgent, acceptHeader, acceptEncoding, acceptLanguage);

  // 8. FAZER REQUISIÇÃO À API EXTERNA
  let data: any;
  let sucesso = false;
  let errorMessage = '';
  let integrityCheck: any = null;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MutanoX-Premium-API/v2.0'
      },
      signal: AbortSignal.timeout(30000) // 30 segundos timeout
    });

    data = await response.json();

    if (!response.ok) {
      errorMessage = data.erro || `Erro HTTP ${response.status}`;
      sucesso = false;
    } else {
      sucesso = data.sucesso === true || (data.dados || data.resultados || data.resultado);
      errorMessage = data.erro;

      if (!sucesso) {
        integrityCheck = analyzePackageSecurity(data, tipoLower);
      }
    }
  } catch (error: any) {
    console.error('[API Consultas Protected] Erro:', error);
    errorMessage = error.message || 'Erro de conexão';
    sucesso = false;
  }

  const tempoResposta = Date.now() - startTime;

  // 9. SE SUCESSO, SALVAR NO CACHE
  if (sucesso) {
    await CacheService.set(tipoLower, query, data, true, tempoResposta);
  }

  // 10. REGISTRAR LOG DE AUDITORIA
  await AuthService.auditLog(apiKey, 'consulta', tipoLower, clientIp, userAgent, sucesso, {
    query: maskSensitiveData({ [tipoLower]: query }, [tipoLower === 'cpf' ? 'cpf' : 'numero']),
    tempo: tempoResposta,
    cached: false,
    integrity: integrityCheck,
    error: errorMessage
  });

  return NextResponse.json({
    success: true,
    data: sucesso ? data : null,
    sucesso,
    tempoResposta,
    fromCache: false,
    error: errorMessage || undefined,
    integrity: integrityCheck,
    criador: '@MutanoX',
    warnings: []
  });
}
