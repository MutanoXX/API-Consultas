# MutanoX Dashboard Admin

Dashboard administrativo avançado para gerenciamento da API MutanoX com consultas de CPF, Nome e Número em tempo real.

## 🚀 Funcionalidades

### Dashboard em Tempo Real
- **WebSocket Integration**: Atualizações instantâneas de estatísticas e consultas
- **Monitoramento em Tempo Real**: Visualize consultas conforme são realizadas
- **Latência Monitorada**: Medição de ping em tempo real

### Estatísticas Completas
- **Total de Consultas**: Contagem total de todas as consultas realizadas
- **Taxa de Sucesso**: Porcentagem de consultas bem-sucedidas
- **Distribuição por Tipo**: CPF, Nome e Número
- **Consultas por Hora**: Gráfico de área com volume por hora
- **Gráfico de Pizza**: Distribuição visual por tipo de consulta

### Gestão de Logs
- **Histórico Completo**: Todas as consultas registradas
- **Filtros por Tipo**: Filtrar por CPF, Nome ou Número
- **Paginação**: Navegação eficiente pelos logs
- **Detalhes da Consulta**: IP, User-Agent, tempo de resposta

### Controles Administrativos
- **Limpar Histórico**: Remove todas as consultas recentes do dashboard
- **Resetar Estatísticas**: Zera todas as contagens e métricas
- **Teste de API**: Interface para testar consultas diretamente do dashboard

### Interface Moderna
- **Design Responsivo**: Funciona em desktop, tablet e mobile
- **Tema Escuro**: Interface elegante com gradientes
- **Animações Suaves**: Transições fluidas usando Framer Motion
- **Componentes shadcn/ui**: Interface consistente e acessível

## 📡 Estrutura do Projeto

```
mutano-api/              # API Node.js separada para deploy no Discloud
├── api.js              # Arquivo principal da API
├── index.js            # Entry point
├── package.json        # Dependências
├── discloud.config     # Configuração de deploy no Discloud
├── endpoints/          # Endpoints separados
│   ├── cpf.js         # Consulta CPF
│   ├── nome.js        # Consulta Nome
│   └── numero.js      # Consulta Número
└── README.md

mini-services/
└── ws-service/        # Serviço WebSocket
    ├── index.ts       # Servidor WebSocket
    └── package.json

src/
├── app/
│   ├── api/
│   │   ├── consultas/      # Endpoint de consultas (proxy)
│   │   └── dashboard/
│   │       ├── logs/       # Endpoint de logs
│   │       └── stats/      # Endpoint de estatísticas
│   └── page.tsx        # Dashboard admin
├── store/
│   └── dashboard.ts    # Zustand store para estado global
└── lib/
    └── db.ts          # Cliente Prisma

prisma/
└── schema.prisma      # Schema do banco de dados
```

## 🔌 Endpoints da API

### Consultas
```
GET /api/consultas?tipo=cpf&cpf=12345678900
GET /api/consultas?tipo=nome&q=Nome Completo
GET /api/consultas?tipo=numero&q=11999999999
```

### Dashboard
```
GET /api/dashboard/logs?page=1&limit=50&tipo=cpf
GET /api/dashboard/stats
```

## 🗄️ Banco de Dados

### Modelos do Prisma

#### ConsultaLog
Registra todas as consultas realizadas:
- `tipo`: Tipo da consulta (cpf, nome, numero)
- `dadosConsulta`: Dados enviados na consulta (JSON)
- `resultado`: Resultado retornado (JSON)
- `sucesso`: Se a consulta foi bem-sucedida
- `tempoResposta`: Tempo em milissegundos
- `ip`: IP do cliente
- `userAgent`: User-Agent do cliente
- `createdAt`: Timestamp da consulta

#### Estatisticas
Estatísticas agregadas das consultas:
- `totalConsultas`: Total de consultas
- `consultasCPF`, `consultasNome`, `consultasNumero`: Contagem por tipo
- `consultasSucesso`, `consultasErro`: Contagem de sucesso/erro
- `data`, `updatedAt`: Timestamps

#### APISettings
Configurações da API:
- `apiKey`: Chave de API
- `isActive`: Se a chave está ativa
- `maxRequestsPerHour`: Limite de requisições por hora

## 🎨 Stack Tecnológica

### Frontend
- **Next.js 15**: Framework React com App Router
- **TypeScript 5**: Tipagem estática
- **Tailwind CSS 4**: Estilização utilitária
- **shadcn/ui**: Componentes UI prontos
- **Recharts**: Gráficos interativos
- **socket.io-client**: Cliente WebSocket
- **Zustand**: Gerenciamento de estado global
- **Lucide Icons**: Ícones modernos
- **date-fns**: Manipulação de datas

### Backend
- **Next.js API Routes**: Rotas da API
- **Prisma ORM**: Mapeamento objeto-relacional
- **SQLite**: Banco de dados
- **Socket.io**: Comunicação em tempo real

### API Separada (Mutano)
- **Node.js**: Runtime JavaScript
- **HTTP nativo**: Servidor web

## 🚀 Deploy

### Dashboard Admin (Next.js)
```bash
bun run dev       # Desenvolvimento
bun run build     # Build para produção
bun run start     # Servidor de produção
```

### API Mutano (Discloud)
1. Upload do arquivo `mutano-api.zip`
2. O arquivo `discloud.config` configura automaticamente:
   - ID: mutano-x
   - Tipo: site
   - RAM: 512MB
   - Porta: 8080
   - Auto-restart: habilitado

### WebSocket Service
```bash
cd mini-services/ws-service
bun run dev        # Inicia na porta 3003
```

## 📊 Como Usar

1. **Acesse o Dashboard**: Abra `http://localhost:3000`
2. **WebSocket**: Conexão automática ao serviço WebSocket
3. **Visualizar Estatísticas**: Aba "Visão Geral" mostra gráficos e métricas
4. **Ver Consultas Recentes**: Aba "Consultas Recentes" mostra o histórico
5. **Testar API**: Aba "Testar API" permite testar as consultas

## 🌐 API Externa

O dashboard atua como um proxy para a API externa:
- **API Base**: `https://world-ecletix.onrender.com`
- **Endpoints**: `/api/consultarcpf`, `/api/nome-completo`, `/api/numero`

Todas as consultas são registradas no banco de dados e broadcast via WebSocket.

## 📝 Notas

- O WebSocket Service deve estar rodando para funcionalidades em tempo real
- Logs são salvos no banco de dados SQLite em `db/custom.db`
- O arquivo `mutano-api.zip` contém tudo necessário para deploy no Discloud

## 👤 Autor

@MutanoX

---

**Desenvolvido com ❤️ usando Next.js, TypeScript e Socket.io**
