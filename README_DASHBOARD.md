# 🚀 MutanoX Premium Dashboard - Documentação Completa

Sistema de dashboard administrativo avançado com autenticação por API-KEY, cache inteligente, gerenciamento de chaves e monitoramento em tempo real.

## 📋 Índice

1. [Arquitetura do Sistema](#arquitetura-do-sistema)
2. [Autenticação e Segurança](#autenticação-e-segurança)
3. [Sistema de Cache Inteligente](#sistema-de-cache-inteligente)
4. [API Endpoints](#api-endpoints)
5. [Frontend](#frontend)
6. [Dashboard Features](#dashboard-features)
7. [Deploy](#deploy)

---

## 🏗 Arquitetura do Sistema

```
my-project/
├── src/
│   ├── app/
│   │   ├── page.tsx                  # Redirecionamento automático
│   │   ├── login/
│   │   │   └── page.tsx         # Tela de login com API-KEY
│   │   ├── dashboard/
│   │   │   └── page.tsx         # Dashboard principal protegido
│   │   └── api/
│   │       ├── consultas/
│   │       │   ├── route.ts       # Endpoint público (sem auth)
│   │       │   └── protected/
│   │       │       └── route.ts   # Endpoint protegido com cache
│   │       ├── admin/
│   │       │   ├── keys/
│   │       │   │   ├── route.ts   # Criar/listar API-KEYs
│   │       │   │   └── [id]/
│   │       │   │       └── route.ts # Toggle/delatar API-KEYs
│   │       │   └── stats/
│   │       │       └── route.ts   # Estatísticas completas
│   │       ├── dashboard/
│   │       │   ├── stats/
│   │       │   │   └── route.ts   # Estatísticas do dashboard
│   │       │   └── logs/
│   │       │       └── route.ts   # Logs do dashboard
│   │       └── route.ts           # API route principal
│   ├── lib/
│   │   ├── auth/
│   │   │   ├── auth-service.ts    # Serviço de autenticação
│   │   │   └── middleware/
│   │   │       └── auth.middleware.ts  # Middleware de proteção
│   │   ├── cache/
│   │   │   └── cache-service.ts   # Serviço de cache inteligente
│   │   └── db.ts               # Cliente Prisma
│   └── store/
│       └── dashboard.ts            # Zustand store (WebSocket)
├── prisma/
│   └── schema.prisma              # Schema do banco de dados
└── mini-services/
    └── ws-service/               # Servidor WebSocket
```

---

## 🔐 Autenticação e Segurança

### Sistema de API-KEYs

#### Chave de Admin (Master)
```
AMDIM;MutanoX3397
```
Esta chave tem acesso total ao sistema, sem limites de rate limiting.

#### Chaves de Usuário
Formato para criação:
```
{
  nome: "Cliente Premium #1",
  tipo: "premium",    // ou "standard", "admin"
  rateLimit: 100,    // requests por hora
  dailyLimit: 1000,   // requests por dia
  adminKey: "AMDIM;MutanoX3397"
}
```

#### Como Autenticar

**Via Header:**
```http
GET /api/consultas/protected?tipo=cpf&cpf=12345678900
x-api-key: AMDIM;MutanoX3397
```

**Via Query Parameter:**
```http
GET /api/consultas/protected?tipo=cpf&cpf=12345678900&apiKey=SUA_CHAVE
```

**Via Cookie:**
```javascript
document.cookie = 'apiKey=AMDIM;MutanoX3397';
```

### Rate Limiting

- **Limite Padrão**: 100 requests/hora, 1000 requests/dia
- **Chave Admin**: Sem limites
- **Reset Automático**: Contadores resetados a cada hora/dia
- **Resposta em Excesso**: HTTP 429 com detalhes

### Auditoria

Todas as ações são registradas:
```typescript
{
  apiKeyId: string;        // ID da chave usada
  acao: string;           // login, consulta, cache_hit, cache_miss, error
  tipo: string;            // cpf, nome, numero, admin
  ip: string;
  userAgent: string;
  sucesso: boolean;
  detalhes: any;           // JSON com detalhes adicionais
  createdAt: DateTime;
}
```

---

## 🗄 Sistema de Cache Inteligente

### Como Funciona

1. **Primeira Consulta**: Busca na API externa, salva no cache
2. **Consultas Repetidas**: Retorna do cache (muito mais rápido)
3. **Expiração Automática**: Cache expira automaticamente
4. **Hit Counter**: Registra quantas vezes cada consulta foi usada do cache

### Duração do Cache por Tipo

```typescript
CPF    → 24 horas
Nome    → 1 hora
Número  → 2 horas
```

### Cache Hit Example

**Primeira consulta (Cache Miss):**
```json
{
  "fromCache": false,
  "tempoResposta": 1250,
  "data": { ... }
}
```

**Mesma consulta depois (Cache Hit):**
```json
{
  "fromCache": true,
  "tempoResposta": 45,
  "hitCount": 1,
  "data": { ... }
}
```

### Gerenciamento do Cache

**Limpar Cache Expirado:**
```typescript
GET /api/admin/cache/clear-expired
x-admin-key: AMDIM;MutanoX3397
```

**Limpar Todo o Cache:**
```typescript
GET /api/admin/cache/clear-all
x-admin-key: AMDIM;MutanoX3397
```

---

## 📡 API Endpoints

### Consultas Protegidas (Requer API-KEY)

#### Consultar CPF
```http
GET /api/consultas/protected?tipo=cpf&cpf=12345678900
x-api-key: SUA_API_KEY
```

#### Consultar Nome
```http
GET /api/consultas/protected?tipo=nome&q=JOAO%20DA%20SILVA
x-api-key: SUA_API_KEY
```

#### Consultar Número
```http
GET /api/consultas/protected?tipo=numero&q=11999999999
x-api-key: SUA_API_KEY
```

#### Respostas

**Sucesso:**
```json
{
  "success": true,
  "data": { ... },
  "tempoResposta": 1234,
  "fromCache": false,
  "hitCount": 0,
  "criador": "@MutanoX"
}
```

**Cache Hit:**
```json
{
  "success": true,
  "data": { ... },
  "tempoResposta": 45,
  "fromCache": true,
  "hitCount": 5,
  "criador": "@MutanoX"
}
```

**Erros:**

| Código | Status | Descrição |
|--------|---------|-----------|
| `MISSING_API_KEY` | 401 | API-KEY não fornecida |
| `INVALID_API_KEY` | 401 | API-KEY inválida/desativada/expirada |
| `RATE_LIMIT_EXCEEDED` | 429 | Limite de requisições excedido |
| `MISSING_PARAM` | 400 | Parâmetro não fornecido |
| `UNKNOWN_TYPE` | 400 | Tipo de consulta inválido |

### Admin Endpoints (Requer Admin Key)

#### Criar API-KEY
```http
POST /api/admin/keys
Content-Type: application/json
x-admin-key: AMDIM;MutanoX3397

{
  "nome": "Cliente #1",
  "tipo": "premium",
  "rateLimit": 100,
  "dailyLimit": 1000,
  "adminKey": "AMDIM;MutanoX3397"
}
```

#### Listar API-KEYs
```http
GET /api/admin/keys
x-admin-key: AMDIM;MutanoX3397
```

#### Ativar/Desativar API-KEY
```http
PATCH /api/admin/keys/{keyId}
x-admin-key: AMDIM;MutanoX3397
```

#### Deletar API-KEY
```http
DELETE /api/admin/keys/{keyId}
x-admin-key: AMDIM;MutanoX3397
```

#### Estatísticas Gerais
```http
GET /api/admin/stats
x-admin-key: AMDIM;MutanoX3397
```

Retorna:
- Estatísticas gerais
- Por tipo de consulta
- Logs recentes
- Auditoria
- Estatísticas de cache

---

## 🎨 Frontend

### Páginas

#### 1. Tela de Login (`/login`)

**Features:**
- Formulário de API-KEY
- Validação de formato
- Feedback visual de carregamento
- Mensagens de sucesso/erro
- Redirecionamento automático

**API-KEYs Válidas:**
- Chave Admin: `AMDIM;MutanoX3397`
- Chaves de Usuário (criadas via admin)

#### 2. Dashboard Principal (`/dashboard`)

**Abas:**

**Visão Geral (`overview`)**
- Cards de métricas principais
- Gráfico de consultas por hora (Line + Area)
- Gráfico semanal (Bar)
- Gráfico de distribuição (Pie)
- Gráfico de tempo de resposta (Area)
- Gráfico de performance (Radar)
- Indicadores de cache
- Contadores em tempo real

**Atividade (`atividade`)**
- Log de auditoria em tempo real
- Filtros por ação
- Timeline de eventos
- Detalhes de cada ação

**API Keys (`apikeys`)**
- Lista de todas as chaves
- Status (ativa/inativa)
- Limite de uso
- Criar nova chave
- Editar/Deletar chaves
- Estatísticas por chave

**Consultas (`consultas`)**
- Tabela de todas as consultas
- Filtros por tipo/data
- Busca em tempo real
- Detalhes expandidos
- Exportar dados

**Testar API (`teste`)**
- Formulário interativo
- Validação em tempo real
- Loading states
- Exibição de resultados
- Animações suaves

**Configurações (`config`)**
- Configurações do sistema
- Controle de cache
- Configurações de segurança
- Preferências do dashboard

### Componentes

#### Charts Avançados

1. **LineChart + AreaChart** - Consultas por hora
   - Mostra tendência de volume
   - Destaca sucesso (verde)
   - Gradiente preenchido

2. **BarChart** - Comparativo semanal
   - Comparação de dias
   - Barras com borda arredondada
   - Cores por dia

3. **PieChart** - Distribuição por tipo
   - CPF, Nome, Número
   - Cores da paleta premium
   - Labels com porcentagens

4. **RadarChart** - Métricas de performance
   - Performance, Confiabilidade, Velocidade
   - Segurança, Cache, Disponibilidade
   - Hexágono animado

5. **AreaChart** - Tempo de resposta
   - Tendência de performance
   - Gradiente suave
   - Pontos conectados

### UI Components

- **Cards Premium**: Glassmorphism, gradientes, glow effects
- **Sidebar Colapsável**: Navegação elegante
- **Top Bar Fixa**: Status, latência, notificações
- **Scroll Areas**: Conteúdo longo scrollável
- **Buttons Animados**: Hover effects, loading states
- **Badges**: Indicadores de status

---

## 📊 Dashboard Features

### Gráficos

1. **Consultas por Hora (24h)**
   - Área com gradiente roxo
   - Linha de sucesso em verde
   - Eixo X: Horas
   - Eixo Y: Quantidade
   - Tooltip detalhado

2. **Comparativo Semanal**
   - Barras por dia da semana
   - Cores: Laranja premium
   - Mostra volume por dia

3. **Distribuição por Tipo**
   - Pie chart interativo
   - CPF (roxo), Nome (amarelo), Número (rosa)
   - Legenda automática
   - Porcentagens

4. **Performance do Cache**
   - Cache Hit vs Miss
   - Cores contrastantes
   - Porcentagem de hit rate

5. **Tempo Médio de Resposta**
   - Tendência de 7 dias
   - Área com gradiente roxo
   - Valores em milissegundos

6. **Métricas Radar**
   - Performance: 85%
   - Confiabilidade: 92%
   - Velocidade: 78%
   - Segurança: 95%
   - Cache: 88%
   - Disponibilidade: 99%

### Métricas em Tempo Real

- **Total de Consultas**: Contador geral
- **Consultas de Sucesso**: Contagem positiva
- **Consultas com Erro**: Alerta se alto
- **Taxa de Sucesso**: Porcentagem
- **Cache Hit Rate**: Eficiência do cache
- **Tempo Médio de Resposta**: Performance
- **Latência**: Ping ao servidor (WebSocket)
- **Status de Conexão**: Online/Offline

### Controles Administrativos

- **Limpar Histórico**: Remove logs visuais
- **Resetar Estatísticas**: Zera contadores
- **Limpar Cache**: Remove entradas expiradas ou todas
- **Exportar Dados**: Download de logs/consultas
- **Criar API-KEY**: Formulário de criação
- **Gerenciar Keys**: Ativar/desativar/deletar

---

## 🚀 Deploy

### Requisitos

- Node.js 18+
- Bun (opcional, para desenvolvimento)
- SQLite (automático com Prisma)
- Next.js 15+

### Variáveis de Ambiente

```env
DATABASE_URL="file:./db/custom.db"
```

### Scripts

```bash
# Desenvolvimento
bun run dev

# Build
bun run build

# Produção
bun run start

# Banco de dados
bun run db:push      # Atualiza schema
bun run db:generate   # Gera cliente Prisma
```

### Deploy no Discloud (API Separada)

1. Subir `mutano-api/` com discloud CLI
2. O arquivo `discloud.config` está incluído:
   ```
   ID=mutano-x
   TYPE=site
   MAIN=api.js
   NAME=MutanoX-Premium
   RAM=512
   VERSION=latest
   AUTORESTART=true
   ```

### Deploy do Dashboard (Next.js)

O dashboard é uma aplicação Next.js e pode ser deployada em:
- **Vercel** (recomendado)
- **Netlify**
- **Railway**
- **Render**
- **Discloud** (como site estático)

### URLs Após Deploy

- Dashboard: `https://seu-dominio.com`
- API Endpoint: `https://api.seu-dominio.com/api/consultas/protected`
- WebSocket: `wss://ws.seu-dominio.com`

---

## 🔧 Configurações Avançadas

### Limite de Cache

Editável em `/src/lib/cache/cache-service.ts`:
```typescript
CPF: 24 horas
Nome: 1 hora
Número: 2 horas
```

### Rate Limit

Configurável por API-KEY:
```json
{
  "rateLimit": 100,    // por hora
  "dailyLimit": 1000   // por dia
}
```

### Timeout de Requisição

```typescript
signal: AbortSignal.timeout(30000)  // 30 segundos
```

---

## 📈 Monitoramento

### Métricas Coletadas

1. **Volume de Consultas**
   - Por hora
   - Por dia
   - Por semana
   - Por mês

2. **Performance**
   - Tempo médio de resposta
   - Tempo p90, p95, p99
   - Taxa de erro

3. **Cache**
   - Hit rate
   - Miss rate
   - Eficiência
   - Tamanho do cache

4. **Segurança**
   - Tentativas de login
   - Chaves expiradas
   - Rate limit hits
   - IPs suspeitos

5. **Disponibilidade**
   - Uptime
   - Tempo online
   - Latência

### Alertas

O sistema pode ser extendido para enviar alertas:
- Taxa de erro > 10%
- Tempo de resposta > 5 segundos
- Cache hit rate < 50%
- Limite de rate approaching
- Chave administrador usada

---

## 📚 Bibliotecas e Tecnologias

### Frontend
- **Next.js 15** - Framework React
- **TypeScript 5** - Tipagem estática
- **Tailwind CSS 4** - Estilização
- **shadcn/ui** - Componentes UI
- **Recharts** - Gráficos
- **Zustand** - Gerenciamento de estado
- **Socket.io Client** - WebSocket
- **date-fns** - Manipulação de datas
- **Lucide Icons** - Ícones

### Backend
- **Next.js API Routes** - Rotas da API
- **Prisma** - ORM
- **SQLite** - Banco de dados
- **Socket.io Server** - WebSocket

### Ferramentas
- **Bun** - Runtime JavaScript
- **ESLint** - Linting
- **TypeScript** - Compilação

---

## 📝 Uso

### Exemplos de Consulta

#### Usando Fetch
```javascript
const response = await fetch('https://seu-dominio.com/api/consultas/protected?tipo=cpf&cpf=12345678900', {
  headers: {
    'x-api-key': 'AMDIM;MutanoX3397'
  }
});
const data = await response.json();
```

#### Usando Axios
```javascript
import axios from 'axios';

const response = await axios.get('https://seu-dominio.com/api/consultas/protected', {
  headers: {
    'x-api-key': 'AMDIM;MutanoX3397'
  },
  params: {
    tipo: 'cpf',
    cpf: '12345678900'
  }
});
const data = response.data;
```

#### Usando cURL
```bash
curl -X GET "https://seu-dominio.com/api/consultas/protected?tipo=cpf&cpf=12345678900" \
  -H "x-api-key: AMDIM;MutanoX3397"
```

---

## 🎯 Best Practices

### Performance
- Use sempre o endpoint `/protected` para consultas
- Valide inputs antes de enviar
- Implemente retry com exponential backoff
- Use cache para consultas repetidas
- Monitorize tempo de resposta

### Segurança
- Nunca exponha API-KEYs no frontend
- Use HTTPS em produção
- Valide sempre as chaves
- Implemente rate limiting no cliente
- Rotacione chaves periodicamente

### Monitoramento
- Monitore taxas de erro
- Acompanhe performance de cache
- Tracke uso de API-KEYs
- Configure alertas proativos
- Revise logs de auditoria

---

## 🐛 Troubleshooting

### Erros Comuns

**401 Unauthorized**
- Verifique se a API-KEY está correta
- Confirme se a chave está ativa
- Verifique se não expirou

**429 Rate Limit**
- Aguarde 1 hora antes de tentar novamente
- Use chaves diferentes para diferentes aplicações
- Considere aumentar limites da chave

**Cache Issues**
- Se os dados estão desatualizados
- Limpar cache manualmente
- Verificar duração do cache

**WebSocket Connection Issues**
- Verifique se o serviço está rodando
- Confirme se a porta está correta
- Verifique se há firewall bloqueando

---

## 📞 Suporte

Para suporte, entre em contato:
- **Email**: suporte@mutanox.com
- **Discord**: [Link do Discord]
- **Documentação**: docs.mutanox.com

---

**Desenvolvido com ❤️ usando tecnologia de ponta por @MutanoX**
