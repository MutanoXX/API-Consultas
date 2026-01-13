# 🚀 Instruções Rápidas - MutanoX Dashboard

## Acesso Rápido

### Dashboard Admin
🌐 **URL:** http://localhost:3000

O dashboard carrega automaticamente e conecta ao WebSocket na porta 3003.

## 📊 Funcionalidades Principais

### 1. Visão Geral
- Estatísticas em tempo real (total consultas, sucesso, erro, taxa)
- Gráfico de consultas por hora
- Gráfico de distribuição por tipo (CPF, Nome, Número)
- Controle para limpar histórico e resetar estatísticas

### 2. Consultas Recentes
- Lista das últimas 50 consultas
- Mostra tipo, dados, timestamp, tempo de resposta
- Indica se foi bem-sucedida (✅) ou falhou (❌)
- Atualização em tempo real via WebSocket

### 3. Testar API
- Interface para testar consultas
- Suporta CPF, Nome e Número
- Registra automaticamente no dashboard
- Mede tempo de resposta

## 🔌 Endpoints API

### Consultas (via Dashboard)
```
GET /api/consultas?tipo=cpf&cpf=12345678900
GET /api/consultas?tipo=nome&q=João Silva
GET /api/consultas?tipo=numero&q=11999999999
```

### Dashboard API
```
GET /api/dashboard/logs        # Histórico de consultas
GET /api/dashboard/stats       # Estatísticas completas
```

## 📦 Deploy no Discloud

O arquivo `mutano-api.zip` está pronto para deploy:

```bash
# Upload no Discloud Console
# O arquivo discloud.config configura automaticamente:
# - ID: mutano-x
# - Tipo: site
# - Porta: 8080
# - RAM: 512MB
```

## 🛠️ Comandos

### Iniciar Dashboard
```bash
cd /home/z/my-project
bun run dev
```

### Iniciar WebSocket Service (se necessário)
```bash
cd /home/z/my-project/mini-services/ws-service
bun run dev
```

### Verificar WebSocket
```bash
ps aux | grep ws-service
```

## 📈 Como Monitorar

1. **Abra o Dashboard**: http://localhost:3000
2. **Observe o indicador de conexão** (🟢 Conectado / 🔴 Desconectado)
3. **Latência** é atualizada a cada 30 segundos
4. **Consultas aparecem em tempo real** na aba "Consultas Recentes"
5. **Gráficos atualizam automaticamente**

## 🔍 Teste Rápido

1. Vá para a aba "Testar API"
2. Selecione o tipo de consulta
3. Digite o valor (CPF, Nome ou Número)
4. Clique em "Realizar Consulta"
5. Veja o resultado aparecer no dashboard em tempo real!

## 📝 Notas Importantes

- **WebSocket deve estar rodando** para funcionalidades em tempo real
- **Banco de dados é criado** automaticamente na primeira consulta
- **Logs são persistentes** no arquivo SQLite
- **Dashboard funciona offline** (apenas sem atualizações em tempo real)

## 🆘 Problemas Comuns

### WebSocket não conecta
```bash
# Verificar se o serviço está rodando
ps aux | grep ws-service

# Reiniciar se necessário
cd /home/z/my-project/mini-services/ws-service
bun run dev
```

### Erro ao fazer consulta
- Verifique se o endpoint externo está acessível
- Confira os dados sendo enviados
- Veja o log do dashboard para detalhes

### Dashboard não atualiza
- Verifique a conexão WebSocket (indicador verde)
- Teste a latência (clique em "Atualizar")
- Recarregue a página (F5)

## 📚 Documentação Completa

- `DASHBOARD_README.md` - Documentação detalhada do dashboard
- `PROJECT_SUMMARY.md` - Resumo completo do projeto
- `mutano-api/README.md` - Documentação da API MutanoX

---

**Desenvolvido por @MutanoX**
