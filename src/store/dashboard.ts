import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

export interface Consulta {
  id: number;
  timestamp: string;
  tipo: 'cpf' | 'nome' | 'numero';
  dados: any;
  sucesso: boolean;
  tempoResposta?: number;
}

export interface Stats {
  totalConsultas: number;
  consultasCPF: number;
  consultasNome: number;
  consultasNumero: number;
  consultasSucesso: number;
  consultasErro: number;
  ultimasConsultas: Consulta[];
  consultasPorHora: Record<string, number>;
}

interface DashboardState {
  socket: Socket | null;
  connected: boolean;
  stats: Stats;
  historicoLimpo: boolean;
  setStats: (stats: Stats) => void;
  conectar: () => void;
  desconectar: () => void;
  limparHistorico: () => void;
  resetStats: () => void;
  emitNovaConsulta: (consulta: Partial<Consulta>) => void;
}

const initialStats: Stats = {
  totalConsultas: 0,
  consultasCPF: 0,
  consultasNome: 0,
  consultasNumero: 0,
  consultasSucesso: 0,
  consultasErro: 0,
  ultimasConsultas: [],
  consultasPorHora: {}
};

export const useDashboardStore = create<DashboardState>((set, get) => ({
  socket: null,
  connected: false,
  stats: initialStats,
  historicoLimpo: false,

  setStats: (stats) => set({ stats }),

  conectar: () => {
    const { socket: existingSocket } = get();
    if (existingSocket?.connected) return;

    const socket = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socket.on('connect', () => {
      console.log('[Dashboard] Conectado ao WebSocket');
      set({ connected: true });
    });

    socket.on('disconnect', () => {
      console.log('[Dashboard] Desconectado do WebSocket');
      set({ connected: false });
    });

    socket.on('stats', (newStats: Stats) => {
      set({ stats: newStats });
    });

    socket.on('nova-consulta', (consulta: Consulta) => {
      const { stats } = get();
      set({
        stats: {
          ...stats,
          ultimasConsultas: [consulta, ...stats.ultimasConsultas].slice(0, 50)
        }
      });
    });

    socket.on('historico-limpo', () => {
      set({ historicoLimpo: true, stats: { ...get().stats, ultimasConsultas: [] } });
    });

    socket.on('stats-reset', () => {
      set({ stats: initialStats });
    });

    socket.on('connect_error', (error) => {
      console.error('[Dashboard] Erro de conexão:', error);
      set({ connected: false });
    });

    set({ socket });
  },

  desconectar: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, connected: false });
    }
  },

  limparHistorico: () => {
    const { socket } = get();
    if (socket?.connected) {
      socket.emit('limpar-historico');
    }
  },

  resetStats: () => {
    const { socket } = get();
    if (socket?.connected) {
      socket.emit('reset-stats');
    }
  },

  emitNovaConsulta: (consulta) => {
    const { socket } = get();
    if (socket?.connected) {
      socket.emit('nova-consulta', consulta);
    }
  }
}));
