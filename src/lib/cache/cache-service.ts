import { db } from '@/lib/db';

export interface CacheEntry {
  id: string;
  tipo: string;
  query: string;
  resultado: any;
  sucesso: boolean;
  tempoResposta: number;
  createdAt: Date;
  expiresAt: Date;
  hitCount: number;
}

export class CacheService {
  private static readonly CACHE_DURATION = {
    CPF: 24 * 60 * 60 * 1000,      // 24 horas
    NOME: 1 * 60 * 60 * 1000,      // 1 hora
    NUMERO: 2 * 60 * 60 * 1000,    // 2 horas
  };

  /**
   * Busca no cache
   */
  static async get(tipo: string, query: string): Promise<CacheEntry | null> {
    try {
      const normalisedQuery = query.trim().toUpperCase();
      
      const cached = await db.consultaCache.findFirst({
        where: {
          tipo,
          query: normalisedQuery,
          expiresAt: {
            gt: new Date()
          }
        }
      });

      if (cached) {
        // Atualizar hit count
        await db.consultaCache.update({
          where: { id: cached.id },
          data: { hitCount: cached.hitCount + 1 }
        });

        return {
          id: cached.id,
          tipo: cached.tipo,
          query: cached.query,
          resultado: JSON.parse(cached.resultado),
          sucesso: cached.sucesso,
          tempoResposta: cached.tempoResposta,
          createdAt: cached.createdAt,
          expiresAt: cached.expiresAt,
          hitCount: cached.hitCount + 1
        };
      }

      return null;
    } catch (error) {
      console.error('[CacheService] Erro ao buscar cache:', error);
      return null;
    }
  }

  /**
   * Salva no cache
   */
  static async set(
    tipo: string,
    query: string,
    resultado: any,
    sucesso: boolean,
    tempoResposta: number
  ): Promise<void> {
    try {
      const normalisedQuery = query.trim().toUpperCase();
      const duration = this.getCacheDuration(tipo);
      const expiresAt = new Date(Date.now() + duration);

      // Verificar se já existe
      const existing = await db.consultaCache.findFirst({
        where: {
          tipo,
          query: normalisedQuery
        }
      });

      if (existing) {
        await db.consultaCache.update({
          where: { id: existing.id },
          data: {
            resultado: JSON.stringify(resultado),
            sucesso,
            tempoResposta,
            expiresAt,
            createdAt: new Date()
          }
        });
      } else {
        await db.consultaCache.create({
          data: {
            tipo,
            query: normalisedQuery,
            resultado: JSON.stringify(resultado),
            sucesso,
            tempoResposta,
            expiresAt
          }
        });
      }

      console.log(`[CacheService] Cache salvo: ${tipo} - ${normalisedQuery} (expira em ${duration}ms)`);
    } catch (error) {
      console.error('[CacheService] Erro ao salvar cache:', error);
    }
  }

  /**
   * Retorna a duração do cache baseada no tipo
   */
  private static getCacheDuration(tipo: string): number {
    switch (tipo) {
      case 'cpf':
        return this.CACHE_DURATION.CPF;
      case 'nome':
        return this.CACHE_DURATION.NOME;
      case 'numero':
        return this.CACHE_DURATION.NUMERO;
      default:
        return this.CACHE_DURATION.NOME;
    }
  }

  /**
   * Limpa cache expirado
   */
  static async clearExpired(): Promise<number> {
    try {
      const result = await db.consultaCache.deleteMany({
        where: {
          expiresAt: {
            lte: new Date()
          }
        }
      });

      console.log(`[CacheService] ${result.count} entradas expiradas removidas`);
      return result.count;
    } catch (error) {
      console.error('[CacheService] Erro ao limpar cache:', error);
      return 0;
    }
  }

  /**
   * Limpa todo o cache
   */
  static async clearAll(): Promise<number> {
    try {
      const result = await db.consultaCache.deleteMany({});
      console.log(`[CacheService] Todo o cache limpo (${result.count} entradas)`);
      return result.count;
    } catch (error) {
      console.error('[CacheService] Erro ao limpar todo o cache:', error);
      return 0;
    }
  }

  /**
   * Retorna estatísticas do cache
   */
  static async getStats(): Promise<{
    totalEntries: number;
    byType: Record<string, number>;
    expiredCount: number;
    hitRate: number;
  }> {
    try {
      const [totalEntries, expiredCount, entriesByType] = await Promise.all([
        db.consultaCache.count(),
        db.consultaCache.count({
          where: {
            expiresAt: {
              lte: new Date()
            }
          }
        }),
        db.consultaCache.groupBy({
          by: ['tipo'],
          _count: true
        })
      ]);

      const byType: Record<string, number> = {};
      entriesByType.forEach((entry) => {
        byType[entry.tipo] = entry._count;
      });

      const totalHits = await db.consultaCache.aggregate({
        _sum: {
          hitCount: true
        }
      });

      const hitRate = totalEntries > 0 
        ? ((totalHits._sum.hitCount || 0) / totalEntries) * 100 
        : 0;

      return {
        totalEntries,
        byType,
        expiredCount,
        hitRate: Math.round(hitRate * 100) / 100
      };
    } catch (error) {
      console.error('[CacheService] Erro ao buscar estatísticas:', error);
      return {
        totalEntries: 0,
        byType: {},
        expiredCount: 0,
        hitRate: 0
      };
    }
  }
}
