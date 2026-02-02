// Importador de Arquivos Excel (.xlsm)
// Usa biblioteca xlsx para leitura

import * as XLSX from 'xlsx';
import { 
  Servidor, 
  Processo, 
  Falta, 
  SituacaoProcesso, 
  StatusGeral,
  ImportResult,
  ImportError 
} from '@/types/licenca';
import { 
  saveServidores, 
  saveProcessos, 
  saveFaltas,
  clearAllData 
} from './database';

// Função auxiliar: Limpa matrícula (remove pontos, traços, etc.)
export function limparMatricula(txt: string | number | null | undefined): string {
  if (txt === null || txt === undefined || txt === '') return '';
  const str = String(txt).trim();
  return str.replace(/[^0-9]/g, '');
}

// Função auxiliar: Converte data do Excel para Date
export function excelDateToDate(serial: number | string | null | undefined): Date | null {
  if (serial === null || serial === undefined || serial === '') return null;
  
  // Se já é uma string de data
  if (typeof serial === 'string') {
    // Tenta vários formatos
    const patterns = [
      /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/, // DD/MM/YYYY ou DD/MM/YY
      /^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/, // DD.MM.YYYY
      /^(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD (ISO)
    ];
    
    for (const pattern of patterns) {
      const match = serial.match(pattern);
      if (match) {
        let [, part1, part2, part3] = match;
        
        // Para formato ISO
        if (pattern.source.includes('\\d{4}')) {
          return new Date(parseInt(part1), parseInt(part2) - 1, parseInt(part3));
        }
        
        // Para formatos DD/MM/YYYY
        let year = parseInt(part3);
        if (year < 100) year += 2000;
        return new Date(year, parseInt(part2) - 1, parseInt(part1));
      }
    }
    
    // Tenta parse direto
    const parsed = new Date(serial);
    if (!isNaN(parsed.getTime())) return parsed;
    
    return null;
  }
  
  // Se é um número (serial date do Excel)
  if (typeof serial === 'number') {
    // Excel usa 1/1/1900 como base (com bug do ano bissexto de 1900)
    const excelEpoch = new Date(1899, 11, 30);
    const days = Math.floor(serial);
    const date = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
    return date;
  }
  
  return null;
}

// Função auxiliar: Gera ID único
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Função auxiliar: Normaliza situação do processo
function normalizeSituacao(situacao: string | null | undefined): SituacaoProcesso {
  if (!situacao) return 'PENDENTE';
  
  const upper = situacao.toUpperCase().trim();
  
  const mapping: Record<string, SituacaoProcesso> = {
    'PENDENTE': 'PENDENTE',
    'AGUARDANDO INFO.': 'AGUARDANDO INFO.',
    'AGUARDANDO INFO': 'AGUARDANDO INFO.',
    'DEFERIDO P/ PUBL.': 'DEFERIDO P/ PUBL.',
    'DEFERIDO P/ PUBLICAR': 'DEFERIDO P/ PUBL.',
    'INDEF. P/ PUBLICAR': 'INDEF. P/ PUBLICAR',
    'INDEFERIDO P/ PUBLICAR': 'INDEF. P/ PUBLICAR',
    'ENC. P/ PUBL. (DEFERIDO)': 'ENC. P/ PUBL. (DEFERIDO)',
    'ENC. P/ PUBL. (INDEFERIDO)': 'ENC. P/ PUBL. (INDEFERIDO)',
    'DEFERIDO PUBLICADO': 'DEFERIDO PUBLICADO',
    'INDEF. PUBLICADO': 'INDEF. PUBLICADO',
    'INDEFERIDO PUBLICADO': 'INDEF. PUBLICADO',
    'INCAPAZ DE PROSSEGUIR - ARQUIVA-SE': 'INCAPAZ DE PROSSEGUIR - ARQUIVA-SE',
  };
  
  return mapping[upper] || 'PENDENTE';
}

// Função auxiliar: Normaliza status geral
function normalizeStatusGeral(status: string | null | undefined): StatusGeral {
  if (!status) return 'ATIVO';
  const upper = status.toUpperCase().trim();
  if (upper === 'FINALIZADO') return 'FINALIZADO';
  return 'ATIVO';
}

// Função auxiliar: Extrai texto de cargo (remove prefixo "CARGO:" e área de qualificação)
function limparCargo(cargoRaw: string | null | undefined): string {
  if (!cargoRaw) return '';
  let cargo = String(cargoRaw);
  cargo = cargo.replace(/^CARGO:\s*/i, '');
  
  const areaIndex = cargo.indexOf(' - ÁREA');
  if (areaIndex > 0) {
    cargo = cargo.substring(0, areaIndex);
  }
  
  return cargo.trim();
}

// Interface para os dados brutos das abas
interface RawServidorRow {
  [key: string]: any;
}

interface RawProcessoRow {
  [key: string]: any;
}

interface RawFaltaRow {
  [key: string]: any;
}

// Processa aba de Servidores (4.Dados de Servidores)
function processarAbaServidores(
  worksheet: XLSX.WorkSheet, 
  errors: ImportError[]
): Servidor[] {
  const servidores: Servidor[] = [];
  const raw = XLSX.utils.sheet_to_json<RawServidorRow>(worksheet, { header: 1 });
  
  // A primeira linha é o cabeçalho
  // Colunas esperadas: A=Nome, D=Matrícula, I=Cargo, J=Lotação
  for (let i = 1; i < raw.length; i++) {
    const row = raw[i] as any[];
    if (!row || row.length === 0) continue;
    
    const matricula = limparMatricula(row[3]); // Coluna D (índice 3)
    if (!matricula) continue;
    
    const nome = String(row[0] || '').trim(); // Coluna A
    if (!nome) continue;
    
    try {
      servidores.push({
        id: generateId(),
        matricula,
        nome,
        cargo: limparCargo(row[8]), // Coluna I
        lotacao: String(row[9] || '').trim(), // Coluna J
        dataAdmissao: null,
        situacao: 'ATIVO',
      });
    } catch (err) {
      errors.push({
        linha: i + 1,
        aba: '4.Dados de Servidores',
        campo: 'geral',
        mensagem: `Erro ao processar linha: ${err}`,
      });
    }
  }
  
  return servidores;
}

// Processa aba de Processos (2. Controle de Processos)
function processarAbaProcessos(
  worksheet: XLSX.WorkSheet,
  errors: ImportError[]
): Processo[] {
  const processos: Processo[] = [];
  const raw = XLSX.utils.sheet_to_json<RawProcessoRow>(worksheet, { header: 1 });
  
  // Colunas esperadas baseadas no VBA:
  // C=Data Abertura, F=Nome, G=Nº Processo, H=Quinquênio, 
  // K=Data Publicação, L=Situação, M=Status Geral, O=Matrícula, P=Data Final
  
  for (let i = 2; i < raw.length; i++) { // Começa na linha 3 (índice 2)
    const row = raw[i] as any[];
    if (!row || row.length === 0) continue;
    
    const matricula = limparMatricula(row[14]); // Coluna O (índice 14)
    const numeroProcesso = String(row[6] || '').trim(); // Coluna G
    
    if (!matricula || !numeroProcesso) continue;
    
    try {
      const dataAbertura = excelDateToDate(row[2]); // Coluna C
      const dataPublicacao = excelDateToDate(row[10]); // Coluna K
      const dataFinal = excelDateToDate(row[15]); // Coluna P
      
      processos.push({
        id: generateId(),
        numeroProcesso,
        matriculaServidor: matricula,
        nomeServidor: String(row[5] || '').trim(), // Coluna F
        quinquenio: String(row[7] || '').trim(), // Coluna H
        tipo: 'LICENCA_PREMIO',
        dataAbertura: dataAbertura || new Date(),
        dataFinal,
        dataPublicacao,
        situacao: normalizeSituacao(row[11]), // Coluna L
        statusGeral: normalizeStatusGeral(row[12]), // Coluna M
        observacoes: '',
      });
    } catch (err) {
      errors.push({
        linha: i + 1,
        aba: '2. Controle de Processos',
        campo: 'geral',
        mensagem: `Erro ao processar linha: ${err}`,
      });
    }
  }
  
  return processos;
}

// Processa aba de Faltas (3.Registro de Faltas)
function processarAbaFaltas(
  worksheet: XLSX.WorkSheet,
  errors: ImportError[]
): Falta[] {
  const faltas: Falta[] = [];
  const raw = XLSX.utils.sheet_to_json<RawFaltaRow>(worksheet, { header: 1 });
  
  // Estrutura esperada: Matrícula, Data Início, Data Fim, Dias, Tipo
  for (let i = 1; i < raw.length; i++) {
    const row = raw[i] as any[];
    if (!row || row.length === 0) continue;
    
    const matricula = limparMatricula(row[0]);
    if (!matricula) continue;
    
    try {
      const dataInicio = excelDateToDate(row[1]);
      const dataFim = excelDateToDate(row[2]);
      const dias = parseInt(row[3]) || 0;
      
      if (dataInicio && dias > 0) {
        faltas.push({
          id: generateId(),
          matriculaServidor: matricula,
          dataInicio,
          dataFim: dataFim || dataInicio,
          quantidadeDias: dias,
          tipo: 'FALTA_INJUSTIFICADA',
          observacoes: String(row[4] || ''),
        });
      }
    } catch (err) {
      errors.push({
        linha: i + 1,
        aba: '3.Registro de Faltas',
        campo: 'geral',
        mensagem: `Erro ao processar linha: ${err}`,
      });
    }
  }
  
  return faltas;
}

// Função principal de importação
export async function importarExcel(
  file: File,
  limparDadosAntigos: boolean = false
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    servidoresImportados: 0,
    processosImportados: 0,
    faltasImportadas: 0,
    afastamentosImportados: 0,
    errors: [],
    warnings: [],
  };

  try {
    // Lê o arquivo
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
    
    // Verifica abas disponíveis
    const sheetNames = workbook.SheetNames;
    
    // Mapeia nomes de abas (tolerante a variações)
    const findSheet = (patterns: string[]): XLSX.WorkSheet | null => {
      for (const pattern of patterns) {
        const found = sheetNames.find(name => 
          name.toLowerCase().includes(pattern.toLowerCase())
        );
        if (found) return workbook.Sheets[found];
      }
      return null;
    };
    
    // Encontra as abas
    const wsServidores = findSheet(['4.Dados de Servidores', 'Dados de Servidores', 'Servidores']);
    const wsProcessos = findSheet(['2. Controle de Processos', 'Controle de Processos', 'Processos']);
    const wsFaltas = findSheet(['3.Registro de Faltas', 'Registro de Faltas', 'Faltas']);
    
    // Processa cada aba
    let servidores: Servidor[] = [];
    let processos: Processo[] = [];
    let faltas: Falta[] = [];
    
    if (wsServidores) {
      servidores = processarAbaServidores(wsServidores, result.errors);
      result.servidoresImportados = servidores.length;
    } else {
      result.warnings.push('Aba de Servidores não encontrada');
    }
    
    if (wsProcessos) {
      processos = processarAbaProcessos(wsProcessos, result.errors);
      result.processosImportados = processos.length;
    } else {
      result.warnings.push('Aba de Processos não encontrada');
    }
    
    if (wsFaltas) {
      faltas = processarAbaFaltas(wsFaltas, result.errors);
      result.faltasImportadas = faltas.length;
    } else {
      result.warnings.push('Aba de Faltas não encontrada');
    }
    
    // Limpa dados antigos se solicitado
    if (limparDadosAntigos) {
      await clearAllData();
    }
    
    // Salva no banco
    if (servidores.length > 0) await saveServidores(servidores);
    if (processos.length > 0) await saveProcessos(processos);
    if (faltas.length > 0) await saveFaltas(faltas);
    
    result.success = 
      servidores.length > 0 || 
      processos.length > 0 || 
      faltas.length > 0;
    
  } catch (err) {
    result.errors.push({
      linha: 0,
      aba: 'geral',
      campo: 'arquivo',
      mensagem: `Erro ao processar arquivo: ${err}`,
    });
  }
  
  return result;
}

// Função para extrair preview dos dados antes de importar
export async function previewExcel(file: File): Promise<{
  abas: string[];
  preview: Record<string, any[]>;
}> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  
  const preview: Record<string, any[]> = {};
  
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    preview[sheetName] = data.slice(0, 5); // Primeiras 5 linhas
  }
  
  return {
    abas: workbook.SheetNames,
    preview,
  };
}
