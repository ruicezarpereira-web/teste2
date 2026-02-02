// Tipos principais do Sistema de Licença-Prêmio
// Mapeamento das estruturas do Excel legado

export interface Servidor {
  id: string;
  matricula: string;
  nome: string;
  cargo: string;
  lotacao: string;
  dataAdmissao?: Date | null;
  situacao?: string;
  email?: string;
  telefone?: string;
}

export interface Processo {
  id: string;
  numeroProcesso: string;
  matriculaServidor: string;
  nomeServidor?: string;
  quinquenio: string;
  tipo: TipoProcesso;
  dataAbertura: Date;
  dataFinal?: Date | null;
  dataPublicacao?: Date | null;
  situacao: SituacaoProcesso;
  statusGeral: StatusGeral;
  observacoes?: string;
}

export type TipoProcesso = 
  | 'LICENCA_PREMIO'
  | 'ABONO_PERMANENCIA'
  | 'OUTROS';

export type SituacaoProcesso =
  | 'PENDENTE'
  | 'AGUARDANDO INFO.'
  | 'DEFERIDO P/ PUBL.'
  | 'INDEF. P/ PUBLICAR'
  | 'ENC. P/ PUBL. (DEFERIDO)'
  | 'ENC. P/ PUBL. (INDEFERIDO)'
  | 'DEFERIDO PUBLICADO'
  | 'INDEF. PUBLICADO'
  | 'INCAPAZ DE PROSSEGUIR - ARQUIVA-SE';

export type StatusGeral = 
  | 'ATIVO'
  | 'FINALIZADO';

export interface Falta {
  id: string;
  matriculaServidor: string;
  dataInicio: Date;
  dataFim: Date;
  quantidadeDias: number;
  tipo: TipoFalta;
  observacoes?: string;
}

export type TipoFalta =
  | 'FALTA_INJUSTIFICADA'
  | 'FALTA_JUSTIFICADA'
  | 'SUSPENSAO';

export interface Afastamento {
  id: string;
  matriculaServidor: string;
  tipo: TipoAfastamento;
  dataInicio: Date;
  dataFim: Date;
  quantidadeDias: number;
  computavel: boolean; // Se conta para o tempo de serviço
  observacoes?: string;
}

export type TipoAfastamento =
  | 'LICENCA_MEDICA'
  | 'LICENCA_MATERNIDADE'
  | 'LICENCA_PATERNIDADE'
  | 'LICENCA_SEM_VENCIMENTOS'
  | 'AFASTAMENTO_ELEITORAL'
  | 'SUSPENSAO_DISCIPLINAR'
  | 'OUTROS';

// Status calculado para exibição no Dashboard
export type StatusLicenca = 
  | 'VENCIDO'      // dias < 0 (vermelho)
  | 'URGENTE'      // 0-30 dias (laranja)
  | 'PROXIMO'      // 31-90 dias (amarelo)
  | 'EM_BREVE'     // 91-180 dias (verde)
  | 'NORMAL';      // > 180 dias

export interface CalculoLicenca {
  servidor: Servidor;
  ultimoProcesso?: Processo;
  proximoQuinquenio: number;
  dataInicioQuinquenio: Date;
  dataFimQuinquenio: Date;
  diasPenalidade: number;
  detalhesPenalidade: PenalidadeDetalhe[];
  dataPrevista: Date;
  diasRestantes: number;
  status: StatusLicenca;
}

export interface PenalidadeDetalhe {
  tipo: 'FALTA' | 'AFASTAMENTO';
  descricao: string;
  dataInicio: Date;
  dataFim: Date;
  diasDescontados: number;
}

// KPIs do Dashboard
export interface DashboardKPIs {
  totalServidores: number;
  totalProcessosVencidos: number;
  totalProcessosUrgentes: number;
  totalProcessosProximos: number;
  totalProcessosEmBreve: number;
  tempoMedioPublicacao: number;
  processosAtivos: number;
  processosPendentes: number;
}

// Dados para gráficos
export interface ChartData {
  name: string;
  value: number;
  color?: string;
}

// Template para geração de documentos Word
export interface TemplateVariables {
  nome_servidor: string;
  matricula: string;
  cargo: string;
  lotacao: string;
  data_admissao: string;
  quinquenio_atual: string;
  data_quinquenio_inicio: string;
  data_quinquenio_fim: string;
  data_prevista: string;
  dias_penalidade: string;
  dias_penalidade_extenso: string;
  numero_processo: string;
  data_publicacao: string;
  situacao: string;
  data_atual: string;
  [key: string]: string; // Permite variáveis dinâmicas
}

// Resultado da importação do Excel
export interface ImportResult {
  success: boolean;
  servidoresImportados: number;
  processosImportados: number;
  faltasImportadas: number;
  afastamentosImportados: number;
  errors: ImportError[];
  warnings: string[];
}

export interface ImportError {
  linha: number;
  aba: string;
  campo: string;
  mensagem: string;
}

// Configurações do sistema
export interface SystemConfig {
  diasQuinquenio: number; // Padrão: 1825
  diasAlertaUrgente: number; // Padrão: 30
  diasAlertaProximo: number; // Padrão: 90
  diasAlertaEmBreve: number; // Padrão: 180
  formatoData: string; // Padrão: 'dd/MM/yyyy'
}

export const DEFAULT_CONFIG: SystemConfig = {
  diasQuinquenio: 1825,
  diasAlertaUrgente: 30,
  diasAlertaProximo: 90,
  diasAlertaEmBreve: 180,
  formatoData: 'dd/MM/yyyy',
};
