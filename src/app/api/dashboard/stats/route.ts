import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const [totalCPF, totalNome, totalNumero, totalSucesso, totalErro, ultimasConsultas] =
      await Promise.all([
        db.consultaLog.count({ where: { tipo: 'cpf' } }),
        db.consultaLog.count({ where: { tipo: 'nome' } }),
        db.consultaLog.count({ where: { tipo: 'numero' } }),
        db.consultaLog.count({ where: { sucesso: true } }),
        db.consultaLog.count({ where: { sucesso: false } }),
        db.consultaLog.findMany({
          orderBy: { createdAt: 'desc' },
          take: 50
        })
      ]);

    const totalConsultas = totalCPF + totalNome + totalNumero;
    const taxaSucesso =
      totalConsultas > 0 ? ((totalSucesso / totalConsultas) * 100).toFixed(1) : '0.0';

    // Consultas por hora (últimas 24 horas)
    const horasAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const consultasRecentes = await db.consultaLog.findMany({
      where: {
        createdAt: { gte: horasAgo }
      },
      select: {
        createdAt: true
      }
    });

    const consultasPorHora: Record<string, number> = {};
    consultasRecentes.forEach((log) => {
      const hora = log.createdAt.toISOString().slice(0, 13);
      consultasPorHora[hora] = (consultasPorHora[hora] || 0) + 1;
    });

    return NextResponse.json({
      sucesso: true,
      estatisticas: {
        totalConsultas,
        consultasCPF: totalCPF,
        consultasNome: totalNome,
        consultasNumero: totalNumero,
        consultasSucesso: totalSucesso,
        consultasErro: totalErro,
        taxaSucesso,
        ultimasConsultas: ultimasConsultas.map((log) => ({
          ...log,
          dadosConsulta: JSON.parse(log.dadosConsulta),
          resultado: JSON.parse(log.resultado)
        })),
        consultasPorHora
      }
    });
  } catch (error) {
    console.error('[API Stats] Erro:', error);
    return NextResponse.json(
      {
        sucesso: false,
        erro: 'Erro ao buscar estatísticas'
      },
      { status: 500 }
    );
  }
}
