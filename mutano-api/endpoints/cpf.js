/**
 * Endpoint CPF - Consulta de dados pessoais
 * Autor: @MutanoX
 */

const { URL } = require('url');

function isValidString(str) {
  return typeof str === 'string' && str.trim().length > 0;
}

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

module.exports = { consultarCPF };
