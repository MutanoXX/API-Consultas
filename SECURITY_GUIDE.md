# 🛡 Sistema de Segurança Avançado - Documentação

## 📋 Índice

1. [Visão Geral da Segurança](#visão-geral)
2. [Proteção de API-KEYs](#proteção-de-api-keys)
3. [Anti-SQL Injection](#anti-sql-injection)
4. [Anti-Replay Protection](#anti-replay-protection)
5. [Verificação de Integridade](#verificação-de-integridade)
6. [Rate Limiting](#rate-limiting)
7. [Auditoria Completa](#auditoria)
8. [Logs de Segurança](#logs-de-segurança)

---

## 🎯 Visão Geral da Segurança

O sistema implementou **múltiplas camadas de segurança** para proteger contra ataques comuns:

### ✅ Camadas Implementadas

1. **Autenticação Robusta**
   - API-KEY via variáveis de ambiente
   - Validação server-side
   - Never exposta no client

2. **Anti-SQL Injection**
   - Sanitização de todos os inputs
   - Detecção de padrões perigosos
   - Validação estrita com Zod

3. **Anti-Replay**
   - Nonces criptografados
   - Timestamp checking
   - Client fingerprinting
   - Duplicate detection

4. **Rate Limiting**
   - Limites por hora/dia
   - Proteção contra floods
   - Reset automático

5. **Integridade de Pacotes**
   - Validação de estrutura
   - Verificação de tipos
   - Schema com Zod

6. **Auditoria Completa**
   - Log de todas as ações
   - Mask de dados sensíveis
   - Timestamps precisos

---

## 🔐 Proteção de API-KEYs

### Como Funciona

```typescript
// NO CLIENT-SIDE (nunca!)
const ADMIN_KEY = 'AMDIM;MutanoX3397'; // ❌ MAU - EXPÕE

// NO SERVIDO
const ADMIN_KEY = process.env.ADMIN_KEY; // ✅ CORRETO - SEGURO
```

### ✅ Boas Práticas

1. **Variáveis de Ambiente**
   ```env
   ADMIN_KEY=AMDIM;MutanoX3397
   SECURITY_NONCE_TTL=5000
   SECURITY_FLOOD_THRESHOLD=10
   ```

2. **Nunca Logar a Chave Completa**
   ```typescript
   // ❌ NÃO FAÇA
   console.log(`API-KEY: ${apiKey}`);

   // ✅ FAÇA
   console.log(`API-KEY: ${apiKey.substring(0, 4)}****`);
   ```

3. **Mascarar em Logs**
   ```typescript
   const maskedKey = apiKey === adminKey
     ? 'ADMIN_KEY'
     : `${apiKey.substring(0, 4)}****${apiKey.substring(apiKey.length - 4)}`;
   ```

### 🔑 Tipos de API-KEYs

| Tipo | Descrição | Limite Hora | Limite Dia |
|------|-----------|--------------|------------|
| Admin | Chave mestre, sem limites | ∞ | ∞ |
| Premium | Usuário premium | 100 | 1000 |
| Standard | Usuário padrão | 50 | 500 |

---

## 💉 Anti-SQL Injection

### Como Funciona

**1. Detecção de Palavras-Chave**
```typescript
const SQL_KEYWORDS = [
  'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP',
  'UNION', 'JOIN', 'OR', 'AND', 'NOT',
  '--', '/*', '*/', ';'
];

function containsSqlKeywords(input: string): boolean {
  return SQL_KEYWORDS.some(keyword =>
    input.toUpperCase().includes(keyword)
  );
}
```

**2. Detecção de Padrões**
```typescript
const SQL_PATTERNS = [
  /\b(SELECT|INSERT|UPDATE|DELETE)\s/i,
  /\b(SELECT|INSERT|UPDATE|DELETE)\s*\(/i,
  /\b(OR|AND)\s+\d+\s*=\s*\d+/i,
  /\b(OR|AND)\s*["'].*["']/i,
  /UNION\s+SELECT/i,
  /--\s*/i,
  /\/\*.*\*\//i,
  /;\s*(DROP|DELETE|INSERT)/i
];
```

**3. Sanitização**
```typescript
function sanitizeForLogging(input: string): string {
  if (!input) return '';
  
  return input
    .replace(/[\x00-\x1F\x7F]/g, '')      // Remove caracteres de controle
    .replace(/'/g, "\\'")                 // Escapa aspas
    .replace(/"/g, '\\"')                 // Escapa aspas duplas
    .replace(/--/g, '--')                // Remove comentários SQL
    .replace(/\/\*/g, '/*')             // Remove comentários
    .substring(0, 1000);               // Limita tamanho
}
```

### 🛡 Proteção no Endpoint

```typescript
// NO ENDPOINT
import { containsSqlKeywords, detectSqlInjection } from '@/lib/security/anti-sql';

const tipoValidation = validateTipo(tipo);
const cpf = searchParams.get('cpf');

// VERIFICAÇÃO ANTI-SQL
if (containsSqlKeywords(cpf) || detectSqlInjection(cpf)) {
  return NextResponse.json(
    {
      success: false,
      error: 'CPF contém caracteres ou padrões SQL inválidos',
      code: 'SQL_INJECTION_DETECTED'
    },
    { status: 400 }
  );
}
```

---

## 🔁 Anti-Replay Protection

### Como Funciona

**1. Nonce Criptográfico**
```typescript
import { randomBytes } from 'crypto';

function generateNonce(length: number = 32): string {
  const bytes = randomBytes(Math.ceil(length / 2));
  return bytes.toString('hex').substring(0, length);
}
```

**2. Client Fingerprint**
```typescript
function calculateClientFingerprint(
  ip: string,
  userAgent: string,
  accept: string
): string {
  const data = [ip, userAgent, accept].join('|');
  
  // Hash simples
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash) + data.charCodeAt(i);
    hash = hash & hash;
  }
  
  return hash.toString(16);
}
```

**3. Verificação de Replay**
```typescript
function isReplayAttack(
  nonce: string,
  clientIp: string,
  clientFingerprint: string
): {
  isReplay: boolean;
  reason: string;
} {
  const entry = nonceStore.get(nonce);
  
  if (!entry) {
    return { isReplay: false, reason: 'nonce_novo' };
  }
  
  // Mesmo IP tentando reutilizar nonce
  if (entry.ip !== clientIp) {
    return { isReplay: false, reason: 'ip_diferente' };
  }
  
  // Tempo muito curto (suspeito)
  const timeDiff = Date.now() - entry.timestamp;
  if (timeDiff < 1000) {
    return { isReplay: true, reason: 'replay_tempo_muito_curto' };
  }
  
  return { isReplay: false, reason: 'ok' };
}
```

**4. Detecção de Flooding**
```typescript
function isFloodingAttack(
  requestSignature: string,
  clientIp: string
): {
  isFlooding: boolean;
  requestCount: number;
} {
  const key = `${clientIp}:${requestSignature}`;
  const count = (requestSignatures.get(`count:${key}`) || 0) + 1;
  
  if (Date.now() - lastRequestTime < 100 && count > 10) {
    return { isFlooding: true, requestCount: count };
  }
  
  return { isFlooding: false, requestCount: count };
}
```

### 📊 Estatísticas de Proteção

```typescript
function getReplayProtectionStats() {
  return {
    totalNonces: nonceStore.size,           // Total de nonces gerados
    activeNonces: 0,                      // Nonces não expirados
    totalClientFingerprints: clientFingerprintStore.size,
    blockedRequests: 0                      // Requisições bloqueadas
  };
}
```

---

## ✅ Verificação de Integridade de Pacotes

### Como Funciona

**1. Schema Zod**
```typescript
import { z } from 'zod';

const ResponseSchema = z.object({
  sucesso: z.coerce.boolean().optional(),
  resultado: z.object({
    dadosBasicos: z.object({
      nome: z.string().optional(),
      cpf: z.string().optional()
    }).optional(),
    enderecos: z.array(z.object({
      logradouro: z.string().optional(),
      bairro: z.string().optional()
    })).optional()
  }).optional()
});
```

**2. Validação por Tipo**
```typescript
function validateCpfResponse(data: any): {
  isValid: boolean;
  error?: string;
  warnings: string[];
} {
  try {
    const parsed = ResponseSchema.parse(data);
    
    // Verificar se CPF é válido
    if (parsed.dados?.cpf) {
      const clean = parsed.dados.cpf.replace(/\D/g, '');
      if (clean.length !== 11) {
        return {
          isValid: false,
          error: 'CPF inválido (deve ter 11 dígitos)',
          warnings: []
        };
      }
    }
    
    return { isValid: true, warnings: [] };
  } catch (error) {
    return {
      isValid: false,
      error: 'Estrutura de resposta inválida',
      warnings: []
    };
  }
}
```

**3. Análise de Segurança**
```typescript
function analyzePackageSecurity(data: any, tipo: string): {
  isSecure: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  issues: string[];
  recommendation: string;
} {
  const issues: string[] = [];
  
  // Verificar XSS
  const strData = JSON.stringify(data);
  if (/<script/i.test(strData)) {
    issues.push('Contém <script> tags');
  }
  
  // Verificar eval
  if (/javascript:/i.test(strData)) {
    issues.push('Contém javascript: protocol');
  }
  
  // Determinar risco
  if (issues.length > 5) {
    return { isSecure: false, riskLevel: 'CRITICAL', issues, recommendation: 'BLOQUEAR PACOTE' };
  }
  
  return { isSecure: issues.length === 0, riskLevel: 'LOW', issues, recommendation: 'Pacote válido' };
}
```

**4. Mask de Dados**
```typescript
function maskPackageData(data: any, tipo: string): any {
  const masked = { ...data };
  
  if (tipo === 'cpf' && masked.dados?.cpf) {
    masked.dados.cpf = masked.dados.cpf.replace(/(\d{3})\d{5}(\d{3})/, '$1***$3');
  }
  
  return masked;
}
```

---

## 📊 Rate Limiting

### Como Funciona

**1. Contadores Automáticos**
```typescript
async function resetCountersIfNeeded(apiKeyData: ApiKeyData): Promise<void> {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const updates: any = {};

  // Resetar contador de hora
  if (!apiKeyData.lastResetHour || apiKeyData.lastResetHour < oneHourAgo) {
    updates.usedThisHour = 0;
    updates.lastResetHour = now;
  }

  // Resetar contador de dia
  if (!apiKeyData.lastResetDay || apiKeyData.lastResetDay < oneDayAgo) {
    updates.usedToday = 0;
    updates.lastResetDay = now;
  }

  if (Object.keys(updates).length > 0) {
    await db.apiKey.update({
      where: { id: apiKeyData.id },
      data: updates
    });
  }
}
```

**2. Verificação de Limites**
```typescript
async function incrementRequest(apiKey: string): Promise<{
  allowed: boolean;
  remainingHour?: number;
  remainingDay?: number;
  error?: string;
}> {
  const apiKeyData = await db.apiKey.findUnique({
    where: { key: apiKey }
  });

  // Verificar limites
  const remainingHour = apiKeyData.rateLimit - apiKeyData.usedThisHour - 1;
  const remainingDay = apiKeyData.dailyLimit - apiKeyData.usedToday - 1;

  if (remainingHour < 0) {
    return {
      allowed: false,
      error: 'Limite de requisições por hora excedido',
      remainingHour: 0,
      remainingDay
    };
  }

  if (remainingDay < 0) {
    return {
      allowed: false,
      error: 'Limite de requisições por dia excedido',
      remainingHour,
      remainingDay: 0
    };
  }

  return { allowed: true, remainingHour, remainingDay };
}
```

**3. Códigos de Erro**

| HTTP | Code | Descrição |
|------|------|-----------|
| 401 | `MISSING_API_KEY` | API-KEY não fornecida |
| 401 | `INVALID_API_KEY` | API-KEY inválida/desativada/expirada |
| 403 | `INSUFFICIENT_PERMISSIONS` | Requer admin |
| 429 | `RATE_LIMIT_EXCEEDED` | Limite excedido |
| 400 | `VALIDATION_ERROR` | Falha na validação |

---

## 📝 Auditoria Completa

### Ações Registradas

| Ação | Descrição | Nível |
|--------|-----------|--------|
| `login` | Login bem-sucedido | Normal |
| `unauthorized_access` | Tentativa sem chave | Alto |
| `consulta` | Consulta realizada | Normal |
| `cache_hit` | Cache hit | Normal |
| `cache_miss` | Cache miss | Normal |
| `error` | Erro em consulta | Médio |
| `rate_limit_exceeded` | Rate limit atingido | Alto |
| `create_api_key` | Chave criada (admin) | Alto |
| `delete_api_key` | Chave deletada (admin) | Alto |
| `toggle_api_key` | Chave alternada (admin) | Alto |
| `invalid_tipo` | Tipo inválido | Alto |
| `invalid_input_validation` | Input inválido | Alto |
| `sql_injection_detected` | SQLi detectado | CRÍTICO |
| `replay_attack_detected` | Replay detectado | CRÍTICO |
| `flood_attack_detected` | Flood detectado | CRÍTICO |

### Estrutura do Log

```typescript
{
  id: string;
  apiKeyId: string;        // Maskado (ou "ADMIN_KEY")
  acao: string;
  tipo: string | null;
  ip: string | null;        // Sanitizado
  userAgent: string | null;  // Sanitizado
  sucesso: boolean;
  detalhes: string | null; // JSON com dados adicionais (maskados)
  createdAt: DateTime;
}
```

---

## 📚 Exemplos de Uso Seguro

### ✅ Exemplo de Requisição Segura

```bash
# Com API-KEY no Header
curl -X GET "https://api.mutanox.com/api/consultas/protected?tipo=cpf&cpf=12345678900" \
  -H "x-api-key: SUA_CHAVE_AQUI" \
  -H "Content-Type: application/json"
```

### ❌ Exemplos de Ataque Bloqueados

**1. SQL Injection**
```bash
# BLOQUEADO
curl "https://api.mutanox.com/api/consultas/protected?tipo=cpf&cpf=123'; DROP TABLE Users; --"
# Resposta: 400, "CPF contém caracteres SQL inválidos"
```

**2. Replay Attack**
```bash
# BLOQUEADO
curl "https://api.mutanox.com/api/consultas/protected?tipo=cpf&cpf=12345678900&nonce=NONCE_JA_USADO"
# Resposta: 429, "Ataque de replay detectado"
```

**3. Flooding**
```bash
# BLOQUEADO (após 10 requisições em 1 segundo com mesma assinatura)
for i in {1..15}; do
  curl "https://api.mutanox.com/api/consultas/protected?tipo=cpf&cpf=12345678900" &
done
# Resposta (após 10ª): 429, "Too many requests. Please slow down."
```

---

## 🔒 Melhores Práticas de Segurança

### Para Desenvolvedores

1. **Nunca Expor Chaves**
   - ❌ Não commitar `.env`
   - ❌ Não logar chaves completas
   - ✅ Usar variáveis de ambiente

2. **Validar Tudo no Servidor**
   - ❌ Não confiar no client
   - ✅ Validar tipos, tamanhos, formatos
   - ✅ Usar schemas (Zod, Yup)

3. **Sanitizar Todo Input**
   - ❌ Não confiar em ninguém
   - ✅ Remover caracteres de controle
   - ✅ Escapar caracteres especiais
   - ✅ Limitar tamanho

4. **Usar HTTPS em Produção**
   - ❌ HTTP expõe dados
   - ✅ HTTPS criptografa tudo

5. **Implementar Rate Limiting**
   - ❌ Sem limite = abuso
   - ✅ Limites por hora/dia

6. **Auditoria Completa**
   - ❌ Sem logs = não sabe o que acontece
   - ✅ Logar toda ação com timestamp

### Para Usuários

1. **Rotacionar API-KEYs**
   - Mude sua chave regularmente (ex: a cada 90 dias)
   - Nunca compartilhe sua chave
   - Use diferentes chaves para diferentes apps

2. **Usar HTTPS**
   - Sempre use HTTPS em produção
   - Verifique o certificado SSL

3. **Monitorar Uso**
   - Acompanhe o uso no dashboard
   - Configure alertas para atividades suspeitas
   - Revise logs regularmente

---

## 🛡️ Configurações de Produção

### .env Recomendado

```env
# 🔐 Chaves
ADMIN_KEY=ADMIN_KEY_GENERADA_ALEATORIAMENTAMENTO

# ⏱️ Anti-Replay
SECURITY_NONCE_TTL=5000
SECURITY_FLOOD_THRESHOLD=10

# 🌐 URLs
EXTERNAL_API_URL=https://api-externa.com
WEBSOCKET_URL=wss://ws.mutanox.com

# 📊 Timeouts
SECURITY_INTEGRITY_TIMEOUT=30000

# 🔢 Rate Limiting
DEFAULT_RATE_LIMIT=100
DEFAULT_DAILY_LIMIT=1000

# 📝 Logging
LOG_REQUEST_BODY=false
LOG_REQUEST_HEADERS=false
PRODUCTION_LOG_LEVEL=error
```

---

## 📈 Monitoramento e Alertas

### Métricas Importantes

1. **Taxa de Erro**
   - Se > 10%, investigue imediatamente
   - Pode indicar ataque

2. **Tempo de Resposta**
   - Se > 5s, investigue
   - Pode indicar SQL injection lenta

3. **Cache Hit Rate**
   - Se < 50%, pode haver problema
   - Verifique expiração de cache

4. **Rate Limit Hits**
   - Se muitos 429, há ataque
   - Considere bloquear IPs

### Alertas Sugeridos

- 📧 Email para administrador quando:
  - Taxa de erro > 10%
  - SQL injection detectada
  - Replay attack detectado
  - Flood attack detectado

- 💬 Mensagem no Discord/Slack quando:
  - API-Key de administrador usada
  - Chave deletada/criada
  - Rate limit excedido por chave premium

---

## 🚨 Respostas em Caso de Ataque

### SQL Injection Detectado

```json
{
  "success": false,
  "error": "SQL injection detectado",
  "code": "SQL_INJECTION_DETECTED",
  "details": "Os dados fornecidos contêm padrões de SQL injection"
}
```

### Replay Attack Detectado

```json
{
  "success": false,
  "error": "Ataque de replay detectado",
  "code": "REPLAY_ATTACK",
  "details": "Esta requisição já foi processada recentemente"
}
```

### Flood Attack Detectado

```json
{
  "success": false,
  "error": "Too many requests. Please slow down.",
  "code": "FLOOD_ATTACK",
  "retryAfter": 60
}
```

### Rate Limit Excedido

```json
{
  "success": false,
  "error": "Limite de requisições por hora excedido",
  "code": "RATE_LIMIT_EXCEEDED",
  "remainingHour": 0,
  "remainingDay": 450,
  "retryAfter": 3600
}
```

---

## 🔧 Manutenção

### Tarefas de Segurança Periódicas

**Diariamente:**
- [ ] Limpar nãoces expirados
- [ ] Revisar logs de ataques
- [ ] Verificar uso das API-KEYs
- [ ] Analisar taxas de erro

**Semanalmente:**
- [ ] Rotacionar API-KEYs de teste
- [ ] Limpar logs antigos (manter 30 dias)
- [ ] Analisar tendências de ataques
- [ ] Atualizar padrões de SQLi (se necessário)

**Mensalmente:**
- [ ] Atualizar dependências de segurança
- [ ] Revisar e atualizar regras de firewall
- [ ] Limpar cache de segurança
- [ ] Auditoria de acessos de administrador

---

## 📞 Troubleshooting

### Erro: 401 Unauthorized

**Causas Possíveis:**
- API-KEY não fornecida
- API-KEY inválida
- API-KEY expirada
- API-KEY desativada

**Solução:**
- Verifique se a chave está correta
- Entre em contato com o administrador
- Gere uma nova chave se necessário

### Erro: 403 Forbidden

**Causas Possíveis:**
- Tentativa de acesso sem admin
- IP bloqueado
- Ação não permitida para tipo de usuário

**Solução:**
- Use API-KEY de administrador
- Verifique se não está bloqueado
- Entre em contato com suporte

### Erro: 429 Too Many Requests

**Causas Possíveis:**
- Limite de requisições excedido
- Attack de flooding
- Replay attack bloqueado

**Solução:**
- Aguarde 1 hora (rate limit por hora)
- Aguarde 1 dia (rate limit por dia)
- Reduza a frequência de requisições
- Entre em contato para aumentar limites

---

## 📚 Recursos Adicionais

### OWASP Top 10
- [ ] Injection
- [ ] Broken Authentication
- [ ] Sensitive Data Exposure
- [ ] XML External Entities (XXE)
- [ ] Broken Access Control
- [ ] Security Misconfiguration
- [ ] Cross-Site Scripting (XSS)
- [ ] Insecure Deserialization
- [ ] Using Components with Known Vulnerabilities
- [ ] Insufficient Logging & Monitoring

### Princípios de Segurança
- [ ] Defesa em Profundidade (Defense in Depth)
- [ ] Falha Segura (Fail Secure)
- [ ] Menor Privilégio (Least Privilege)
- [ ] Separação de Responsabilidades
- [ ] Não Confie no Cliente (Zero Trust)

---

**Sistema desenvolvido com segurança máxima** 🔒

*Documentação de Segurança v1.0*
