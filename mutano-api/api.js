/**
 * API MutanoX - Versão Simplificada
 * Endpoint consolidado para consultas de CPF, Nome e Número
 *
 * Porta: 8080
 * Autor: @MutanoX
 *
 * CONSULTAS DISPONÍVEIS:
 * ✅ CPF - Consulta completa de dados pessoais
 * ✅ Nome - Busca por nome completo
 * ✅ Número - Consulta por telefone
 */

const http = require('http');
const { URL } = require('url');

// ==========================================
// CONFIGURAÇÕES
// ==========================================

const PORT = 8080;

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Valida se uma string não é vazia ou undefined
 */
function isValidString(str) {
  return typeof str === 'string' && str.trim().length > 0;
}

/**
 * Valida URL
 */
function isValidUrl(urlString) {
  try {
    new URL(urlString);
    return true;
  } catch {
    return false;
  }
}

/**
 * Cria URL segura sem espaços extras
 */
function createApiUrl(baseUrl, params) {
  try {
    const url = new URL(baseUrl);
    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    }
    return url.toString();
  } catch (error) {
    console.error('[createApiUrl] Erro ao criar URL:', error.message);
    return null;
  }
}

/**
 * Registra log de consulta
 */
function logConsulta(tipo, dados, resultado) {
  const log = {
    timestamp: new Date().toISOString(),
    tipo,
    dados,
    sucesso: resultado.sucesso,
    criador: resultado.criador
  };
  console.log(JSON.stringify(log));
  return log;
}

// ==========================================
// PARSER FUNCTIONS
// ==========================================

function parseCPFData(text) {
  if (!isValidString(text)) {
    console.warn('[parseCPFData] Texto inválido recebido');
    return { erro: 'Resposta inválida da API', textoRecebido: text };
  }

  const data = {
    dadosBasicos: {},
    dadosEconomicos: {},
    enderecos: [],
    tituloEleitor: {},
    dadosFiscais: {},
    beneficiosSociais: [],
    pessoaExpostaPoliticamente: {},
    servidorPublico: {},
    perfilConsumo: {},
    vacinas: [],
    informacoesImportantes: {}
  };

  const nomeMatch = text.match(/• Nome: (.+)/);
  if (nomeMatch) data.dadosBasicos.nome = nomeMatch[1].trim();

  const cpfMatch = text.match(/• CPF: (\d+)/);
  if (cpfMatch) data.dadosBasicos.cpf = cpfMatch[1];

  const cnsMatch = text.match(/• CNS: (\d+)/);
  if (cnsMatch) data.dadosBasicos.cns = cnsMatch[1];

  const dataNascimentoMatch = text.match(/• Data de Nascimento: (.+)/);
  if (dataNascimentoMatch) data.dadosBasicos.dataNascimento = dataNascimentoMatch[1].trim();

  const sexoMatch = text.match(/• Sexo: (.+)/);
  if (sexoMatch) data.dadosBasicos.sexo = sexoMatch[1].trim();

  const nomeMaeMatch = text.match(/• Nome da Mãe: (.+)/);
  if (nomeMaeMatch) data.dadosBasicos.nomeMae = nomeMaeMatch[1].trim();

  const nomePaiMatch = text.match(/• Nome do Pai: (.+)/);
  if (nomePaiMatch) data.dadosBasicos.nomePai = nomePaiMatch[1].trim();

  const situacaoCadastralMatch = text.match(/• Situação Cadastral: (.+)/);
  if (situacaoCadastralMatch) data.dadosBasicos.situacaoCadastral = situacaoCadastralMatch[1].trim();

  const dataSituacaoMatch = text.match(/• Data da Situação: (.+)/);
  if (dataSituacaoMatch) data.dadosBasicos.dataSituacao = dataSituacaoMatch[1].trim();

  const rendaMatch = text.match(/• Renda: (.+)/);
  if (rendaMatch) data.dadosEconomicos.renda = rendaMatch[1].trim();

  const poderAquisitivoMatch = text.match(/• Poder Aquisitivo: (.+)/);
  if (poderAquisitivoMatch) data.dadosEconomicos.poderAquisitivo = poderAquisitivoMatch[1].trim();

  const faixaRendaMatch = text.match(/• Faixa de Renda: (.+)/);
  if (faixaRendaMatch) data.dadosEconomicos.faixaRenda = faixaRendaMatch[1].trim();

  const scoreMatch = text.match(/• Score CSBA: (.+)/);
  if (scoreMatch) data.dadosEconomicos.scoreCSBA = scoreMatch[1].trim();

  const addressBlocks = text.split('🏠 ENDEREÇO');
  for (let i = 1; i < addressBlocks.length; i++) {
    const endereco = {};
    const logradouroMatch = addressBlocks[i].match(/• Logradouro:\s*(.+)/);
    if (logradouroMatch) endereco.logradouro = logradouroMatch[1].trim();

    const bairroMatch = addressBlocks[i].match(/• Bairro:\s*(.+)/);
    if (bairroMatch) endereco.bairro = bairroMatch[1].trim();

    const cidadeMatch = addressBlocks[i].match(/• Cidade\/UF:\s*(.+)/);
    if (cidadeMatch) endereco.cidadeUF = cidadeMatch[1].trim();

    const cepMatch = addressBlocks[i].match(/• CEP:\s*(.+)/);
    if (cepMatch) endereco.cep = cepMatch[1].trim();

    if (Object.keys(endereco).length > 0) {
      data.enderecos.push(endereco);
    }
  }

  const cpfValidoMatch = text.match(/• CPF Válido: (.+)/);
  if (cpfValidoMatch) data.informacoesImportantes.cpfValido = cpfValidoMatch[1].trim();

  const obitoInfoMatch = text.match(/• Óbito: (.+)/);
  if (obitoInfoMatch) data.informacoesImportantes.obito = obitoInfoMatch[1].trim();

  const pepInfoMatch = text.match(/• PEP: (.+)/);
  if (pepInfoMatch) data.informacoesImportantes.pep = pepInfoMatch[1].trim();

  return data;
}

function parseNomeData(text) {
  if (!isValidString(text)) return [];

  const results = [];
  const pessoaBlocks = text.split('👤 RESULTADO');
  for (let i = 1; i < pessoaBlocks.length; i++) {
    const pessoa = {};
    const cpfMatch = pessoaBlocks[i].match(/• CPF: (\d+)/);
    if (cpfMatch) pessoa.cpf = cpfMatch[1];

    const nomeMatch = pessoaBlocks[i].match(/• Nome: (.+)/);
    if (nomeMatch) pessoa.nome = nomeMatch[1].trim();

    const dataNascimentoMatch = pessoaBlocks[i].match(/• Data de Nascimento: (.+)/);
    if (dataNascimentoMatch) pessoa.dataNascimento = dataNascimentoMatch[1].trim();

    const nomeMaeMatch = pessoaBlocks[i].match(/• Nome da Mãe: (.+)/);
    if (nomeMaeMatch) pessoa.nomeMae = nomeMaeMatch[1].trim();

    const situacaoCadastralMatch = pessoaBlocks[i].match(/• Situação Cadastral: (.+)/);
    if (situacaoCadastralMatch) pessoa.situacaoCadastral = situacaoCadastralMatch[1].trim();

    const logradouroMatch = pessoaBlocks[i].match(/• Logradouro: (.+)/);
    if (logradouroMatch) pessoa.logradouro = logradouroMatch[1].trim();

    const bairroMatch = pessoaBlocks[i].match(/• Bairro: (.+)/);
    if (bairroMatch) pessoa.bairro = bairroMatch[1].trim();

    const cepMatch = pessoaBlocks[i].match(/• CEP: (\d+)/);
    if (cepMatch) pessoa.cep = cepMatch[1];

    results.push(pessoa);
  }
  return results;
}

function parseTelefoneData(text) {
  if (!isValidString(text)) return [];

  const results = [];
  const pessoaBlocks = text.split('👤 PESSOA');
  for (let i = 1; i < pessoaBlocks.length; i++) {
    const pessoa = {};
    const cpfCnpjMatch = pessoaBlocks[i].match(/• CPF\/CNPJ: (.+)/);
    if (cpfCnpjMatch) pessoa.cpfCnpj = cpfCnpjMatch[1].trim();

    const nomeMatch = pessoaBlocks[i].match(/• Nome: (.+)/);
    if (nomeMatch) pessoa.nome = nomeMatch[1].trim();

    const dataNascimentoMatch = pessoaBlocks[i].match(/• Data de Nascimento: (.+)/);
    if (dataNascimentoMatch) pessoa.dataNascimento = dataNascimentoMatch[1].trim();

    const bairroMatch = pessoaBlocks[i].match(/• Bairro: (.+)/);
    if (bairroMatch) pessoa.bairro = bairroMatch[1].trim();

    const cidadeUfMatch = pessoaBlocks[i].match(/• Cidade\/UF: (.+)/);
    if (cidadeUfMatch) pessoa.cidadeUF = cidadeUfMatch[1].trim();

    const cepMatch = pessoaBlocks[i].match(/• CEP: (\d+)/);
    if (cepMatch) pessoa.cep = cepMatch[1];

    results.push(pessoa);
  }
  return results;
}

// ==========================================
// API HANDLERS
// ==========================================

async function consultarCPF(cpf) {
  if (!isValidString(cpf)) {
    return { sucesso: false, erro: 'CPF inválido ou vazio', criador: '@MutanoX' };
  }

  try {
    const apiUrl = createApiUrl('https://world-ecletix.onrender.com/api/consultarcpf', { cpf });
    if (!apiUrl) throw new Error('URL inválida');

    console.log('[consultarCPF] Consultando CPF:', cpf);
    const response = await fetch(apiUrl);

    if (!response.ok) throw new Error(`API retornou status ${response.status}`);

    const data = await response.json();
    if (!data || !data.resultado) {
      return { sucesso: false, erro: 'Resposta inválida da API', resposta: data, criador: '@MutanoX' };
    }

    const parsedData = parseCPFData(data.resultado);
    return { sucesso: true, dados: parsedData, criador: '@MutanoX' };
  } catch (error) {
    console.error('[consultarCPF] Erro:', error.message);
    return { sucesso: false, erro: error.message, criador: '@MutanoX' };
  }
}

async function consultarNome(nome) {
  if (!isValidString(nome)) {
    return { sucesso: false, erro: 'Nome inválido ou vazio', criador: '@MutanoX' };
  }

  try {
    const apiUrl = createApiUrl('https://world-ecletix.onrender.com/api/nome-completo', { q: nome });
    if (!apiUrl) throw new Error('URL inválida');

    console.log('[consultarNome] Consultando nome:', nome);
    const response = await fetch(apiUrl);

    if (!response.ok) throw new Error(`API retornou status ${response.status}`);

    const data = await response.json();
    if (!data || !data.resultado) {
      return { sucesso: false, erro: 'Resposta inválida da API', resposta: data, criador: '@MutanoX' };
    }

    const parsedData = parseNomeData(data.resultado);
    return { sucesso: true, totalResultados: parsedData.length, resultados: parsedData, criador: '@MutanoX' };
  } catch (error) {
    console.error('[consultarNome] Erro:', error.message);
    return { sucesso: false, erro: error.message, criador: '@MutanoX' };
  }
}

async function consultarNumero(numero) {
  if (!isValidString(numero)) {
    return { sucesso: false, erro: 'Número inválido ou vazio', criador: '@MutanoX' };
  }

  try {
    const apiUrl = createApiUrl('https://world-ecletix.onrender.com/api/numero', { q: numero });
    if (!apiUrl) throw new Error('URL inválida');

    console.log('[consultarNumero] Consultando número:', numero);
    const response = await fetch(apiUrl);

    if (!response.ok) throw new Error(`API retornou status ${response.status}`);

    const data = await response.json();
    if (!data || !data.resultado) {
      return { sucesso: false, erro: 'Resposta inválida da API', resposta: data, criador: '@MutanoX' };
    }

    const parsedData = parseTelefoneData(data.resultado);
    return { sucesso: true, totalResultados: parsedData.length, resultados: parsedData, criador: '@MutanoX' };
  } catch (error) {
    console.error('[consultarNumero] Erro:', error.message);
    return { sucesso: false, erro: error.message, criador: '@MutanoX' };
  }
}

// ==========================================
// HTTP SERVER
// ==========================================

const server = http.createServer(async (req, res) => {
  let parsedUrl;
  try {
    parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  } catch (error) {
    console.error('[Server] URL inválida:', error.message);
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ erro: 'URL inválida', criador: '@MutanoX' }));
    return;
  }

  const query = Object.fromEntries(parsedUrl.searchParams);
  const path = parsedUrl.pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  console.log(`[${new Date().toISOString()}] ${req.method} ${path}`);

  try {
    if (path === '/api/consultas') {
      const tipo = query.tipo;

      if (!tipo) {
        res.writeHead(400);
        res.end(JSON.stringify({
          sucesso: false,
          erro: 'Tipo de consulta não especificado',
          tiposDisponiveis: ['cpf', 'nome', 'numero'],
          criador: '@MutanoX'
        }, null, 2));
        return;
      }

      let result;
      let dadosConsulta = {};

      switch (tipo.toLowerCase()) {
        case 'cpf':
          dadosConsulta = { cpf: query.cpf };
          result = await consultarCPF(query.cpf);
          break;
        case 'nome':
          dadosConsulta = { nome: query.q };
          result = await consultarNome(query.q);
          break;
        case 'numero':
          dadosConsulta = { numero: query.q };
          result = await consultarNumero(query.q);
          break;
        default:
          res.writeHead(400);
          result = { sucesso: false, erro: `Tipo desconhecido: ${tipo}`, criador: '@MutanoX' };
      }

      // Registrar log
      logConsulta(tipo.toLowerCase(), dadosConsulta, result);

      res.writeHead(200);
      res.end(JSON.stringify(result, null, 2));
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(htmlInfo);
    }
  } catch (error) {
    console.error('[Server] Erro:', error);
    res.writeHead(500);
    res.end(JSON.stringify({ sucesso: false, erro: 'Erro interno do servidor', detalhes: error.message, criador: '@MutanoX' }, null, 2));
  }
});

const htmlInfo = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API MutanoX - @MutanoX</title>
    <style>
        body { font-family: 'Courier New', monospace; background: #0a0e27; color: #00ff00; padding: 20px; margin: 0; }
        .container { max-width: 1000px; margin: 0 auto; }
        h1 { text-align: center; color: #00ffff; text-shadow: 0 0 10px #00ffff; }
        .endpoint { background: #1a1e3f; border-left: 4px solid #00ff00; padding: 10px; margin: 10px 0; border-radius: 4px; }
        .endpoint code { background: #0a0e27; padding: 2px 6px; color: #00ffff; border-radius: 3px; }
        .status { text-align: center; color: #00ff00; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 API MutanoX - @MutanoX</h1>
        <p class="status">✅ Servidor rodando na porta 8080</p>
        <h2>📡 Endpoints Disponíveis</h2>
        <div class="endpoint"><strong>CPF:</strong><br><code>/api/consultas?tipo=cpf&cpf=XXXXX</code></div>
        <div class="endpoint"><strong>Nome:</strong><br><code>/api/consultas?tipo=nome&q=NOME</code></div>
        <div class="endpoint"><strong>Número:</strong><br><code>/api/consultas?tipo=numero&q=NUMERO</code></div>
    </div>
</body>
</html>`;

server.listen(PORT, () => {
  console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
  console.log(`📡 API MutanoX - @MutanoX`);
  console.log(`📡 Pressione Ctrl+C para parar`);
});
