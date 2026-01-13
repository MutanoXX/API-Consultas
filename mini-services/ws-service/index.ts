import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

const PORT = 3003;

const httpServer = createServer();
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Armazenar clientes conectados
const connectedClients = new Map<string, any>();

// Estatísticas em tempo real
const stats = {
  totalConsultas: 0,
  consultasCPF: 0,
  consultasNome: 0,
  consultasNumero: 0,
  consultasSucesso: 0,
  consultasErro: 0,
  ultimasConsultas: [] as any[],
  consultasPorHora: {} as Record<string, number>
};

io.on('connection', (socket) => {
  console.log(`[WebSocket] Cliente conectado: ${socket.id}`);
  connectedClients.set(socket.id, {
    connectedAt: new Date(),
    lastActivity: new Date()
  });

  // Enviar estatísticas atuais para o novo cliente
  socket.emit('stats', stats);

  // Listener para nova consulta
  socket.on('nova-consulta', (data) => {
    console.log(`[WebSocket] Nova consulta recebida:`, data);

    // Atualizar estatísticas
    stats.totalConsultas++;

    switch (data.tipo) {
      case 'cpf':
        stats.consultasCPF++;
        break;
      case 'nome':
        stats.consultasNome++;
        break;
      case 'numero':
        stats.consultasNumero++;
        break;
    }

    if (data.sucesso) {
      stats.consultasSucesso++;
    } else {
      stats.consultasErro++;
    }

    // Adicionar às últimas consultas (manter apenas as últimas 50)
    stats.ultimasConsultas.unshift({
      id: data.id || Date.now(),
      timestamp: new Date().toISOString(),
      tipo: data.tipo,
      dados: data.dados,
      sucesso: data.sucesso,
      tempoResposta: data.tempoResposta
    });

    if (stats.ultimasConsultas.length > 50) {
      stats.ultimasConsultas = stats.ultimasConsultas.slice(0, 50);
    }

    // Atualizar consultas por hora
    const hora = new Date().toISOString().slice(0, 13);
    stats.consultasPorHora[hora] = (stats.consultasPorHora[hora] || 0) + 1;

    // Broadcast para todos os clientes conectados
    io.emit('stats', stats);
    io.emit('nova-consulta', {
      ...data,
      id: data.id || Date.now(),
      timestamp: new Date().toISOString()
    });
  });

  // Listener para solicitar estatísticas
  socket.on('get-stats', () => {
    socket.emit('stats', stats);
  });

  // Listener para limpar histórico
  socket.on('limpar-historico', () => {
    stats.ultimasConsultas = [];
    io.emit('stats', stats);
    io.emit('historico-limpo', { timestamp: new Date().toISOString() });
  });

  // Listener para resetar estatísticas
  socket.on('reset-stats', () => {
    stats.totalConsultas = 0;
    stats.consultasCPF = 0;
    stats.consultasNome = 0;
    stats.consultasNumero = 0;
    stats.consultasSucesso = 0;
    stats.consultasErro = 0;
    stats.ultimasConsultas = [];
    stats.consultasPorHora = {};
    io.emit('stats', stats);
    io.emit('stats-reset', { timestamp: new Date().toISOString() });
  });

  // Listener para teste de latência
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: Date.now() });
  });

  socket.on('disconnect', () => {
    console.log(`[WebSocket] Cliente desconectado: ${socket.id}`);
    connectedClients.delete(socket.id);
  });

  socket.on('error', (error) => {
    console.error(`[WebSocket] Erro no socket ${socket.id}:`, error);
  });
});

// Intervalo para enviar heartbeat
setInterval(() => {
  const heartbeat = {
    timestamp: new Date().toISOString(),
    connectedClients: connectedClients.size
  };
  io.emit('heartbeat', heartbeat);
}, 30000);

httpServer.listen(PORT, () => {
  console.log(`✅ WebSocket Service rodando na porta ${PORT}`);
  console.log(`📡 WebSocket endpoint: /?XTransformPort=${PORT}`);
});

export { io };
