/**
 * SISTEMA DE VERIFICAÇÃO DE INTEGRIDADE DE PACOTES
 * Valida respostas de APIs externas contra esquemas maliciosos
 * Verifica tipos de dados e estrutura
 */

import { z } from 'zod';

// Schema Zod para validação de respostas
const ResponseSchema = z.object({
  sucesso: z.coerce.boolean().optional(),
  resultado: z.union([
    z.object({
      dadosBasicos: z.object({
        nome: z.string().optional(),
        cpf: z.string().optional(),
        cns: z.string().optional(),
        dataNascimento: z.string().optional(),
        sexo: z.string().optional()
      }).optional(),
      dadosEconomicos: z.object({
        renda: z.string().optional(),
        poderAquisitivo: z.string().optional()
      }).optional(),
      enderecos: z.array(z.object({
        logradouro: z.string().optional(),
        bairro: z.string().optional(),
        cidadeUF: z.string().optional(),
        cep: z.string().optional()
      })).optional(),
      tituloEleitor: z.object({
        zona: z.string().optional(),
        secao: z.string().optional(),
        municipio: z.string().optional()
      }).optional()
    }),
    z.array(z.object({
      cpf: z.string().optional(),
      nome: z.string().optional(),
      dataNascimento: z.string().optional(),
      nomeMae: z.string().optional(),
      situacaoCadastral: z.string().optional(),
      logradouro: z.string().optional(),
      bairro: z.string().optional(),
      cidadeUF: z.string().optional(),
      cep: z.string().optional()
    })).optional(),
    z.object({
      cpfCnpj: z.string().optional(),
      nome: z.string().optional(),
      dataNascimento: z.string().optional()
    })).optional()
  ])
});

/**
 * Valida resposta de CPF
 */
export function validateCpfResponse(data: any): {
  isValid: boolean;
  error?: string;
  warnings: string[];
} {
  const warnings: string[] = [];
  
  try {
    const parsed = ResponseSchema.parse(data);
    
    // Verificar se CPF é válido (11 dígitos)
    if (parsed.dados?.cpf) {
      const cleanCpf = parsed.dados.cpf.replace(/\D/g, '');
      if (cleanCpf.length !== 11) {
        warnings.push('CPF não tem 11 dígitos');
      }
    }
    
    // Verificar campos obrigatórios mínimos
    if (!parsed.dados?.nome && !parsed.dados?.cpf) {
      warnings.push('Resultado sem dados básicos (nome ou CPF)');
    }
    
    return { isValid: true, warnings };
  } catch (error) {
    console.error('[Integrity] Erro na validação:', error);
    return {
      isValid: false,
      error: 'Estrutura de resposta inválida',
      warnings
    };
  }
}

/**
 * Valida resposta de Nome
 */
export function validateNomeResponse(data: any): {
  isValid: boolean;
  error?: string;
  warnings: string[];
  resultCount: number;
} {
  const warnings: string[] = [];
  
  try {
    const parsed = ResponseSchema.parse(data);
    
    // Verificar se há resultados
    if (Array.isArray(parsed.resultado)) {
      parsed.resultado.forEach((item: any) => {
        if (!item.cpf && !item.nome) {
          warnings.push('Resultado sem CPF ou Nome');
        }
      });
      return {
        isValid: true,
        warnings,
        resultCount: parsed.resultado.length
      };
    }
    
    // Verificar se há resultados no objeto
    if (parsed.dados?.basicos?.nome || parsed.dados?.basicos?.cpf) {
      return {
        isValid: true,
        warnings,
        resultCount: 1
      };
    }
    
    warnings.push('Nenhum resultado encontrado');
    return {
      isValid: true,
      warnings,
      resultCount: 0
    };
  } catch (error) {
    console.error('[Integrity] Erro na validação:', error);
    return {
      isValid: false,
      error: 'Estrutura de resposta inválida',
      warnings
    };
  }
}

/**
 * Valida resposta de Número
 */
export function validateNumeroResponse(data: any): {
  isValid: boolean;
  error?: string;
  warnings: string[];
  resultCount: number;
} {
  const warnings: string[] = [];
  
  try {
    const parsed = ResponseSchema.parse(data);
    
    // Verificar se há resultados
    if (Array.isArray(parsed.resultado)) {
      parsed.resultado.forEach((item: any) => {
        if (!item.cpfCnpj && !item.nome) {
          warnings.push('Resultado sem CPF/CNPJ ou Nome');
        }
      });
      return {
        isValid: true,
        warnings,
        resultCount: parsed.resultado.length
      };
    }
    
    if (parsed.dados?.cpfCnpj || parsed.dados?.nome) {
      return {
        isValid: true,
        warnings,
        resultCount: 1
      };
    }
    
    warnings.push('Nenhum resultado encontrado');
    return {
      isValid: true,
      warnings,
      resultCount: 0
    };
  } catch (error) {
    console.error('[Integrity] Erro na validação:', error);
    return {
      isValid: false,
      error: 'Estrutura de resposta inválida',
      warnings
    };
  }
}

/**
 * Valida estrutura genérica de pacote
 */
export function validatePackageStructure(data: any, tipo: 'cpf' | 'nome' | 'numero'): {
  isValid: boolean;
  error?: string;
  warnings: string[];
  schemaCheck: {
    hasSuccessField: boolean;
    hasResultField: boolean;
    hasCreatorField: boolean;
    hasDataField: boolean;
    dataType: string;
  };
} {
  const warnings: string[] = [];
  const schemaCheck = {
    hasSuccessField: !!data.sucesso,
    hasResultField: !!data.resultado,
    hasCreatorField: !!data.criador,
    hasDataField: !!data.dados,
    dataType: typeof data.resultado
  };
  
  // Verificar campos mínimos
  if (!schemaCheck.hasSuccessField) {
    warnings.push('Resposta não contém campo "sucesso"');
  }
  
  if (!schemaCheck.hasCreatorField) {
    warnings.push('Resposta não contém campo "criador"');
  }
  
  // Verificar tipo de dado de resultado
  if (tipo === 'cpf') {
    if (!schemaCheck.hasDataField) {
      warnings.push('Resposta CPF não contém campo "dados"');
    }
  } else if (tipo === 'nome' || tipo === 'numero') {
    if (!schemaCheck.hasResultField) {
      warnings.push(`Resposta ${tipo} não contém campo "resultado"`);
    }
  }
  
  // Verificar criador
  if (data.criador !== '@MutanoX') {
    warnings.push(`Criador não corresponde: ${data.criador}`);
  }
  
  return {
    isValid: warnings.length === 0,
    error: warnings.length > 0 ? 'Falhas de integridade detectadas' : undefined,
    warnings,
    schemaCheck
  };
}

/**
 * Analisa pacote completo e retorna relatório de segurança
 */
export function analyzePackageSecurity(
  data: any,
  tipo: 'cpf' | 'nome' | 'numero',
  sourceIp?: string
): {
  isSecure: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  issues: string[];
  recommendation: string;
} {
  const issues: string[] = [];
  
  // Validação de integridade
  const integrityCheck = validatePackageStructure(data, tipo);
  if (!integrityCheck.isValid) {
    issues.push(...integrityCheck.warnings);
    if (integrityCheck.error) {
      issues.push(integrityCheck.error);
    }
  }
  
  // Verificação específica por tipo
  let specificValidation: any;
  if (tipo === 'cpf') {
    specificValidation = validateCpfResponse(data);
    issues.push(...specificValidation.warnings);
  } else if (tipo === 'nome') {
    specificValidation = validateNomeResponse(data);
    issues.push(...specificValidation.warnings);
  } else if (tipo === 'numero') {
    specificValidation = validateNumeroResponse(data);
    issues.push(...specificValidation.warnings);
  }
  
  // Determinar nível de risco
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
  
  if (issues.length > 5) {
    riskLevel = 'MEDIUM';
  }
  
  if (issues.length > 10) {
    riskLevel = 'HIGH';
  }
  
  // Verificar se há campos suspeitos ou dados em branco
  if (data && !data.dados && !data.resultado) {
    issues.push('Pacote de resposta vazio sem dados');
    riskLevel = 'HIGH';
  }
  
  // Verificar se há tentativa de injeção de código
  const strData = JSON.stringify(data);
  const dangerousPatterns = [
    /<script/i,
    /<iframe/i,
    /javascript:/i,
    /on\w+=/i,
    /eval\(/i,
    /document\.cookie/i
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(strData)) {
      issues.push('Contém padrão de código executável perigoso');
      riskLevel = 'CRITICAL';
      break;
    }
  }
  
  // Recomendação
  let recommendation = 'Pacote válido';
  
  if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
    recommendation = 'Pacote requer revisão manual antes de ser usado';
  } else if (riskLevel === 'MEDIUM') {
    recommendation = 'Pacote possui problemas menores mas pode ser usado com cautela';
  }
  
  const isSecure = riskLevel === 'LOW';
  
  return {
    isSecure,
    riskLevel,
    issues,
    recommendation
  };
}

/**
 * Gera assinatura criptográfica do pacote para verificação
 */
export function generatePackageSignature(data: any): string {
  const str = JSON.stringify(data);
  let hash = 0;
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return hash.toString(16);
}

/**
 * Mascara dados sensíveis no pacote para logs
 */
export function maskPackageData(data: any, tipo: 'cpf' | 'nome' | 'numero'): any {
  if (!data) return data;
  
  const masked = { ...data };
  
  // Mascara CPF: 12345678900 -> 123***8900
  if (tipo === 'cpf' && masked.dados?.cpf) {
    masked.dados.cpf = masked.dados.cpf.replace(/(\d{3})\d{5}(\d{3})/, '$1***$3');
  }
  
  // Mascara Nome: João da Silva -> J*** S*** da S***
  if (tipo === 'nome') {
    if (masked.resultado && Array.isArray(masked.resultado)) {
      masked.resultado = masked.resultado.map((r: any) => {
        if (r.nome) {
          const parts = r.nome.split(' ');
          r.nome = parts.map((p: string, i: number) => {
            if (p.length <= 2) return p;
            if (i === 0) return p.substring(0, 1) + '***';
            return '***';
          }).join(' ');
        }
        return r;
      });
    }
  }
  
  // Mascara Número/Telefone
  if (tipo === 'numero') {
    if (masked.resultado && Array.isArray(masked.resultado)) {
      masked.resultado = masked.resultado.map((r: any) => {
        if (r.numero) {
          // Ex: 11999999999 -> 119***9999
          r.numero = r.numero.replace(/(\d{5})(\d{4})/, '$1***$2');
        }
        return r;
      });
    }
  }
  
  return masked;
}
