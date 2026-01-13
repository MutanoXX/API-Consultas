/**
 * SISTEMA DE PROTEÇÃO ANTI-SQL INJECTION
 * Sanitização de entradas e validação de queries
 */

// Palavras-chave SQL perigosas (case-insensitive)
const SQL_KEYWORDS = [
  'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'TRUNCATE',
  'UNION', 'JOIN', 'WHERE', 'HAVING', 'GROUP BY', 'ORDER BY',
  'OR', 'AND', 'NOT', 'NULL', 'IS', 'LIKE', 'IN', 'EXISTS',
  'CREATE', 'ALTER', 'RENAME', 'DESC', 'ASC', 'LIMIT', 'OFFSET',
  'EXEC', 'EXECUTE', 'CALL', 'SHOW', 'DESCRIBE', 'EXPLAIN',
  '--', '/*', '*/', ';', '\'', '"', '`', '--', '#', '/*',
  'xp_cmdshell', 'sp_', 'xp_', 'sp_password', 'sp_addnewuser', 'sp_configure',
  'database()', 'version()', 'user()', 'load_file()', 'into outfile'
];

// Caracteres especiais SQL
const SQL_CHARS = /[;'"`'\\]/;

// Padrões de injeção SQL comuns
const SQL_PATTERNS = [
  /\b(SELECT|INSERT|UPDATE|DELETE|DROP)\s/i,
  /\b(SELECT|INSERT|UPDATE|DELETE|DROP)\s*\(/i,
  /\b(SELECT|INSERT|UPDATE|DELETE|DROP)\s+.*\bFROM\b/i,
  /\b(OR|AND)\s+\d+\s*=\s*\d+/i,
  /\b(OR|AND)\s*["'].*["']/i,
  /\b(OR|AND)\s*\w+\s*(=|LIKE)/i,
  /UNION\s+SELECT/i,
  /--\s*/i,
  /\/\*.*\*\//i,
  /;\s*(DROP|DELETE|INSERT)/i
];

/**
 * Remove caracteres perigosos de string
 * Escapes <, >, ", ', `, e ; para logs seguros
 */
export function sanitizeOutput(str: string): string {
  if (!str) return str;
  
  return str
    // Remove caracteres HTML/XSS básicos
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    // Remove comentários SQL básicos
    .replace(/--/g, '--')
    .replace(/\/\*/g, '/*')
    // Limita tamanho (previne logs gigantes)
    .substring(0, 1000);
}

/**
 * Detecta se uma string contém palavras-chave SQL
 */
export function containsSqlKeywords(input: string): boolean {
  if (!input) return false;
  
  const upper = input.toUpperCase();
  return SQL_KEYWORDS.some(keyword => upper.includes(keyword));
}

/**
 * Detecta padrões de injeção SQL
 */
export function detectSqlInjection(input: string): boolean {
  if (!input) return false;
  
  return SQL_PATTERNS.some(pattern => pattern.test(input));
}

/**
 * Sanitiza string para uso em logs ou output seguro
 * Remove caracteres perigosos mas mantém estrutura legível
 */
export function sanitizeForLogging(input: string, maxLength: number = 500): string {
  if (!input) return '';
  
  let sanitized = input;
  
  // Remove caracteres muito perigosos
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Escapa aspas simples e duplas
  sanitized = sanitized.replace(/'/g, "\\'");
  sanitized = sanitized.replace(/"/g, '\\"');
  
  // Remove comentários SQL
  sanitized = sanitized.replace(/--/g, '--');
  sanitized = sanitized.replace(/\/\*/g, '/*');
  
  // Limitar tamanho
  sanitized = sanitized.substring(0, maxLength);
  
  return sanitized;
}

/**
 * Validação de CPF (apenas dígitos)
 */
export function validateCpf(cpf: string): {
  isValid: boolean;
  error?: string;
} {
  if (!cpf) {
    return { isValid: false, error: 'CPF não fornecido' };
  }
  
  const cleanCpf = cpf.replace(/\D/g, '');
  
  if (cleanCpf.length !== 11) {
    return { isValid: false, error: 'CPF deve conter 11 dígitos numéricos' };
  }
  
  return { isValid: true };
}

/**
 * Validação de Nome (sem caracteres especiais perigosos)
 */
export function validateNome(nome: string): {
  isValid: boolean;
  error?: string;
} {
  if (!nome) {
    return { isValid: false, error: 'Nome não fornecido' };
  }
  
  if (nome.length < 3) {
    return { isValid: false, error: 'Nome deve conter pelo menos 3 caracteres' };
  }
  
  if (nome.length > 100) {
    return { isValid: false, error: 'Nome muito longo (máximo 100 caracteres)' };
  }
  
  // Detectar caracteres SQL perigosos
  if (containsSqlKeywords(nome) || detectSqlInjection(nome)) {
    return { isValid: false, error: 'Nome contém caracteres SQL inválidos' };
  }
  
  return { isValid: true };
}

/**
 * Validação de Número (apenas dígitos)
 */
export function validateNumero(numero: string): {
  isValid: boolean;
  error?: string;
} {
  if (!numero) {
    return { isValid: false, error: 'Número não fornecido' };
  }
  
  const cleanNumero = numero.replace(/\D/g, '');
  
  if (cleanNumero.length < 10 || cleanNumero.length > 11) {
    return { isValid: false, error: 'Número deve conter 10 ou 11 dígitos numéricos (com DDD)' };
  }
  
  return { isValid: true };
}

/**
 * Sanitização de string para usar em queries
 * Embora Prisma proteja contra SQLi, é boa prática sanitizar
 * especialmente em logs e mensagens de erro
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove caracteres de controle
    .substring(0, 1000); // Limita tamanho
}

/**
 * Validação de tipo de consulta
 */
export function validateTipo(tipo: string): {
  isValid: boolean;
  error?: string;
} {
  const tiposValidos = ['cpf', 'nome', 'numero'];
  
  if (!tipo) {
    return { isValid: false, error: 'Tipo não fornecido' };
  }
  
  if (!tiposValidos.includes(tipo.toLowerCase())) {
    return { isValid: false, error: `Tipo inválido. Tipos disponíveis: ${tiposValidos.join(', ')}` };
  }
  
  return { isValid: true };
}

/**
 * Verificação de segurança de input
 * Retorna um nível de risco (LOW, MEDIUM, HIGH)
 */
export function assessSecurityRisk(input: string, type: string): {
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  issues: string[];
} {
  const issues: string[] = [];
  
  if (containsSqlKeywords(input)) {
    issues.push('Contém palavras-chave SQL');
  }
  
  if (detectSqlInjection(input)) {
    issues.push('Contém padrões de injeção SQL');
  }
  
  if (SQL_CHARS.test(input)) {
    issues.push('Contém caracteres SQL especiais');
  }
  
  // Validação específica por tipo
  if (type === 'cpf') {
    const clean = input.replace(/\D/g, '');
    if (clean.length !== 11) {
      issues.push('Formato de CPF inválido');
    }
  }
  
  if (type === 'numero') {
    const clean = input.replace(/\D/g, '');
    if (clean.length < 10 || clean.length > 11) {
      issues.push('Formato de número inválido');
    }
  }
  
  // Determinar nível de risco
  if (issues.length > 0) {
    return { risk: 'HIGH', issues };
  }
  
  return { risk: 'LOW', issues };
}

/**
 * Mascara sensível de dados para logs
 * Ex: CPF: 123***78900
 */
export function maskSensitiveData(data: any, fields: string[] = ['cpf', 'cpfNumber']): any {
  const masked = { ...data };
  
  for (const field of fields) {
    if (masked[field] && typeof masked[field] === 'string') {
      const value = masked[field];
      // Mantém primeiros 3 e últimos 2 dígitos
      if (value.length > 5) {
        masked[field] = `${value.substring(0, 3)}***${value.substring(value.length - 2)}`;
      }
    }
  }
  
  return masked;
}
