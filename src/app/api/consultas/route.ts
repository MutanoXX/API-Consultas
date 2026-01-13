import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tipo = searchParams.get('tipo');
  const startTime = Date.now();

  if (!tipo) {
    return NextResponse.json(
      {
        sucesso: false,
        erro: 'Tipo de consulta não especificado',
        tiposDisponiveis: ['cpf', 'nome', 'numero']
      },
      { status: 400 }
    );
  }

  try {
    let apiUrl = '';
    const tipoLower = tipo.toLowerCase();

    switch (tipoLower) {
      case 'cpf':
        const cpf = searchParams.get('cpf');
        if (!cpf) {
          return NextResponse.json(
            { sucesso: false, erro: 'CPF não fornecido' },
            { status: 400 }
          );
        }
        apiUrl = `https://world-ecletix.onrender.com/api/consultarcpf?cpf=${cpf}`;
        break;
      case 'nome':
        const nome = searchParams.get('q');
        if (!nome) {
          return NextResponse.json(
            { sucesso: false, erro: 'Nome não fornecido' },
            { status: 400 }
          );
        }
        apiUrl = `https://world-ecletix.onrender.com/api/nome-completo?q=${encodeURIComponent(nome)}`;
        break;
      case 'numero':
        const numero = searchParams.get('q');
        if (!numero) {
          return NextResponse.json(
            { sucesso: false, erro: 'Número não fornecido' },
            { status: 400 }
          );
        }
        apiUrl = `https://world-ecletix.onrender.com/api/numero?q=${numero}`;
        break;
      default:
        return NextResponse.json(
          {
            sucesso: false,
            erro: `Tipo desconhecido: ${tipo}`,
            tiposDisponiveis: ['cpf', 'nome', 'numero']
          },
          { status: 400 }
        );
    }

    // Fazer a requisição para a API externa
    const response = await fetch(apiUrl, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    const tempoResposta = Date.now() - startTime;
    
    // Converter sucesso para Boolean
    let sucesso = false;
    
    // A API externa pode retornar sucesso de diferentes formas
    if (typeof data.sucesso === 'boolean') {
      sucesso = data.sucesso;
    } else if (typeof data.sucesso === 'string') {
      // Se sucesso for uma string, verificamos se não começa com indicador de erro
      sucesso = !data.sucesso.includes('erro') && !data.sucesso.includes('Erro') && !data.sucesso.includes('Error');
    } else if (data.dados || data.resultados || data.resultado) {
      sucesso = true;
    }
    
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Registrar log no banco de dados
    try {
      await db.consultaLog.create({
        data: {
          tipo: tipoLower,
          dadosConsulta: JSON.stringify({
            cpf: searchParams.get('cpf'),
            nome: searchParams.get('q'),
            numero: searchParams.get('q')
          }),
          resultado: JSON.stringify(data),
          sucesso,
          tempoResposta,
          ip,
          userAgent
        }
      });
    } catch (logError) {
      console.error('[API Consultas] Erro ao salvar log:', logError);
    }

    return NextResponse.json({
      sucesso,
      dados: data,
      tempoResposta,
      criador: '@MutanoX'
    });
  } catch (error) {
    console.error('[API Consultas] Erro:', error);
    const tempoResposta = Date.now() - startTime;

    return NextResponse.json(
      {
        sucesso: false,
        erro: error instanceof Error ? error.message : 'Erro ao processar consulta',
        tempoResposta,
        criador: '@MutanoX'
      },
      { status: 500 }
    );
  }
}
