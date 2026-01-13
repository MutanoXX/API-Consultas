# API MutanoX - Premium

API simplificada para consultas de CPF, Nome e Número.

## 📋 Consultas Disponíveis

### CPF
- **Endpoint:** `/api/consultas?tipo=cpf&cpf=XXXXX`
- **Descrição:** Consulta completa de dados pessoais
- **Retorno:** Dados básicos, econômicos, endereços, informações importantes

### Nome
- **Endpoint:** `/api/consultas?tipo=nome&q=NOME`
- **Descrição:** Busca por nome completo
- **Retorno:** Lista de pessoas encontradas

### Número
- **Endpoint:** `/api/consultas?tipo=numero&q=NUMERO`
- **Descrição:** Consulta por telefone
- **Retorno:** Lista de pessoas associadas ao número

## 🚀 Deploy no Discloud

O arquivo `discloud.config` já está configurado para deploy direto.

## 📡 Porta

O servidor roda na porta **8080**.

## 👤 Autor

@MutanoX
