import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const tipo = searchParams.get('tipo');

    const skip = (page - 1) * limit;

    const where = tipo ? { tipo } : {};

    const [logs, total] = await Promise.all([
      db.consultaLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      db.consultaLog.count({ where })
    ]);

    return NextResponse.json({
      sucesso: true,
      dados: logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('[API Logs] Erro:', error);
    return NextResponse.json(
      {
        sucesso: false,
        erro: 'Erro ao buscar logs de consultas'
      },
      { status: 500 }
    );
  }
}
