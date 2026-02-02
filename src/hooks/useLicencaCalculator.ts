// Hook Customizado: Motor de Cálculo de Licença-Prêmio
// Implementa a lógica de negócio do VBA original

import { useState, useCallback, useMemo } from 'react';
import { 
  addDays, 
  differenceInDays, 
  isAfter, 
  isBefore, 
  isWithinInterval,
  format 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { 
  Servidor, 
  Processo, 
  Falta, 
  Afastamento,
  CalculoLicenca,
  PenalidadeDetalhe,
  StatusLicenca,
  DashboardKPIs,
  SystemConfig
} from '@/types/licenca';
import { DEFAULT_CONFIG } from '@/types/licenca';

// Constantes do sistema
const DIAS_QUINQUENIO = 1825; // 5 anos

// Função auxiliar: Calcula status baseado nos dias restantes
export function calcularStatus(diasRestantes: number): StatusLicenca {
  if (diasRestantes < 0) return 'VENCIDO';
  if (diasRestantes <= 30) return 'URGENTE';
  if (diasRestantes <= 90) return 'PROXIMO';
  if (diasRestantes <= 180) return 'EM_BREVE';
  return 'NORMAL';
}

// Função auxiliar: Encontra o último processo finalizado (DEFERIDO ou INDEFERIDO PUBLICADO)
export function buscarUltimoProcessoFinalizado(
  processos: Processo[], 
  matricula: string
): Processo | null {
  const processosServidor = processos.filter(p => 
    p.matriculaServidor === matricula &&
    p.statusGeral === 'FINALIZADO' &&
    (p.situacao === 'DEFERIDO PUBLICADO' || p.situacao === 'INDEF. PUBLICADO')
  );
  
  if (processosServidor.length === 0) return null;
  
  // Ordena por data de abertura (mais recente primeiro)
  processosServidor.sort((a, b) => {
    const dateA = new Date(a.dataAbertura).getTime();
    const dateB = new Date(b.dataAbertura).getTime();
    return dateB - dateA;
  });
  
  return processosServidor[0];
}

// Função auxiliar: Extrai número do quinquênio
export function extrairNumeroQuinquenio(quinquenio: string): number {
  if (!quinquenio) return 1;
  
  // Padrões possíveis: "3º", "3º E 4º", "2º AO 7º"
  const match = quinquenio.match(/(\d+)º/);
  if (match) {
    return parseInt(match[1]);
  }
  return 1;
}

// Função principal: Calcula próxima licença para um servidor
export function calcularProximaLicenca(
  servidor: Servidor,
  processos: Processo[],
  faltas: Falta[],
  afastamentos: Afastamento[],
  config: SystemConfig = DEFAULT_CONFIG
): CalculoLicenca | null {
  const ultimoProcesso = buscarUltimoProcessoFinalizado(processos, servidor.matricula);
  
  if (!ultimoProcesso || !ultimoProcesso.dataFinal) {
    return null;
  }
  
  const hoje = new Date();
  let dataInicioQuinquenio: Date;
  let dataFimQuinquenio: Date;
  let proximoQuinquenio: number;
  
  const situacao = ultimoProcesso.situacao.toUpperCase();
  const dataFinal = new Date(ultimoProcesso.dataFinal);
  
  if (situacao === 'INDEF. PUBLICADO' || situacao === 'INDEFERIDO PUBLICADO') {
    // Para INDEFERIDO: dataFinal é quando fará jus ao quinquênio solicitado
    dataFimQuinquenio = dataFinal;
    dataInicioQuinquenio = addDays(dataFimQuinquenio, -config.diasQuinquenio);
    proximoQuinquenio = extrairNumeroQuinquenio(ultimoProcesso.quinquenio);
  } else {
    // Para DEFERIDO: próximo quinquênio começa em dataFinal + 1 + 1825 dias
    dataInicioQuinquenio = addDays(dataFinal, 1);
    dataFimQuinquenio = addDays(dataInicioQuinquenio, config.diasQuinquenio);
    proximoQuinquenio = extrairNumeroQuinquenio(ultimoProcesso.quinquenio) + 1;
  }
  
  // Calcula penalidades (faltas e afastamentos não computáveis dentro do período)
  const detalhesPenalidade: PenalidadeDetalhe[] = [];
  let diasPenalidade = 0;
  
  // Processa faltas dentro do período
  const faltasServidor = faltas.filter(f => f.matriculaServidor === servidor.matricula);
  for (const falta of faltasServidor) {
    const dataInicioFalta = new Date(falta.dataInicio);
    const dataFimFalta = new Date(falta.dataFim);
    
    // Verifica se a falta está dentro do período do quinquênio
    if (
      isWithinInterval(dataInicioFalta, { start: dataInicioQuinquenio, end: dataFimQuinquenio }) ||
      isWithinInterval(dataFimFalta, { start: dataInicioQuinquenio, end: dataFimQuinquenio })
    ) {
      diasPenalidade += falta.quantidadeDias;
      detalhesPenalidade.push({
        tipo: 'FALTA',
        descricao: `Falta - ${falta.tipo}`,
        dataInicio: dataInicioFalta,
        dataFim: dataFimFalta,
        diasDescontados: falta.quantidadeDias,
      });
    }
  }
  
  // Processa afastamentos não computáveis dentro do período
  const afastamentosServidor = afastamentos.filter(
    a => a.matriculaServidor === servidor.matricula && !a.computavel
  );
  for (const afastamento of afastamentosServidor) {
    const dataInicioAfast = new Date(afastamento.dataInicio);
    const dataFimAfast = new Date(afastamento.dataFim);
    
    if (
      isWithinInterval(dataInicioAfast, { start: dataInicioQuinquenio, end: dataFimQuinquenio }) ||
      isWithinInterval(dataFimAfast, { start: dataInicioQuinquenio, end: dataFimQuinquenio })
    ) {
      diasPenalidade += afastamento.quantidadeDias;
      detalhesPenalidade.push({
        tipo: 'AFASTAMENTO',
        descricao: `Afastamento - ${afastamento.tipo}`,
        dataInicio: dataInicioAfast,
        dataFim: dataFimAfast,
        diasDescontados: afastamento.quantidadeDias,
      });
    }
  }
  
  // Data prevista = Data fim do quinquênio + dias de penalidade
  const dataPrevista = addDays(dataFimQuinquenio, diasPenalidade);
  const diasRestantes = differenceInDays(dataPrevista, hoje);
  const status = calcularStatus(diasRestantes);
  
  return {
    servidor,
    ultimoProcesso,
    proximoQuinquenio,
    dataInicioQuinquenio,
    dataFimQuinquenio,
    diasPenalidade,
    detalhesPenalidade,
    dataPrevista,
    diasRestantes,
    status,
  };
}

// Função: Calcula KPIs do Dashboard
export function calcularKPIs(
  servidores: Servidor[],
  processos: Processo[],
  faltas: Falta[],
  afastamentos: Afastamento[]
): DashboardKPIs {
  const kpis: DashboardKPIs = {
    totalServidores: servidores.length,
    totalProcessosVencidos: 0,
    totalProcessosUrgentes: 0,
    totalProcessosProximos: 0,
    totalProcessosEmBreve: 0,
    tempoMedioPublicacao: 0,
    processosAtivos: 0,
    processosPendentes: 0,
  };
  
  // Calcula por status
  for (const servidor of servidores) {
    const calculo = calcularProximaLicenca(servidor, processos, faltas, afastamentos);
    if (calculo) {
      switch (calculo.status) {
        case 'VENCIDO': kpis.totalProcessosVencidos++; break;
        case 'URGENTE': kpis.totalProcessosUrgentes++; break;
        case 'PROXIMO': kpis.totalProcessosProximos++; break;
        case 'EM_BREVE': kpis.totalProcessosEmBreve++; break;
      }
    }
  }
  
  // Calcula tempo médio de publicação
  const processosPublicados = processos.filter(p => 
    p.statusGeral === 'FINALIZADO' &&
    (p.situacao === 'DEFERIDO PUBLICADO' || p.situacao === 'INDEF. PUBLICADO') &&
    p.dataPublicacao
  );
  
  if (processosPublicados.length > 0) {
    let totalDias = 0;
    for (const p of processosPublicados) {
      if (p.dataPublicacao) {
        const dias = differenceInDays(new Date(p.dataPublicacao), new Date(p.dataAbertura));
        if (dias > 0 && dias < 3650) { // Ignora valores inválidos
          totalDias += dias;
        }
      }
    }
    kpis.tempoMedioPublicacao = Math.round(totalDias / processosPublicados.length);
  }
  
  // Processos ativos e pendentes
  kpis.processosAtivos = processos.filter(p => p.statusGeral === 'ATIVO').length;
  kpis.processosPendentes = processos.filter(p => p.situacao === 'PENDENTE').length;
  
  return kpis;
}

// Hook Principal
export function useLicencaCalculator() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Calcula licença para um servidor específico
  const calcularParaServidor = useCallback((
    servidor: Servidor,
    processos: Processo[],
    faltas: Falta[],
    afastamentos: Afastamento[]
  ): CalculoLicenca | null => {
    try {
      return calcularProximaLicenca(servidor, processos, faltas, afastamentos);
    } catch (err) {
      setError(`Erro ao calcular licença: ${err}`);
      return null;
    }
  }, []);
  
  // Calcula licenças para todos os servidores
  const calcularTodos = useCallback((
    servidores: Servidor[],
    processos: Processo[],
    faltas: Falta[],
    afastamentos: Afastamento[]
  ): CalculoLicenca[] => {
    setIsLoading(true);
    setError(null);
    
    try {
      const resultados: CalculoLicenca[] = [];
      
      for (const servidor of servidores) {
        const calculo = calcularProximaLicenca(servidor, processos, faltas, afastamentos);
        if (calculo) {
          resultados.push(calculo);
        }
      }
      
      // Ordena por dias restantes (mais urgentes primeiro)
      resultados.sort((a, b) => a.diasRestantes - b.diasRestantes);
      
      return resultados;
    } catch (err) {
      setError(`Erro ao calcular licenças: ${err}`);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Filtra por status
  const filtrarPorStatus = useCallback((
    calculos: CalculoLicenca[],
    status: StatusLicenca | 'TODOS'
  ): CalculoLicenca[] => {
    if (status === 'TODOS') return calculos;
    return calculos.filter(c => c.status === status);
  }, []);
  
  // Gera KPIs
  const gerarKPIs = useCallback((
    servidores: Servidor[],
    processos: Processo[],
    faltas: Falta[],
    afastamentos: Afastamento[]
  ): DashboardKPIs => {
    return calcularKPIs(servidores, processos, faltas, afastamentos);
  }, []);
  
  return {
    isLoading,
    error,
    calcularParaServidor,
    calcularTodos,
    filtrarPorStatus,
    gerarKPIs,
    calcularStatus,
  };
}

// Funções auxiliares para formatação
export function formatarData(data: Date | null | undefined): string {
  if (!data) return '-';
  try {
    return format(new Date(data), 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return '-';
  }
}

export function formatarDiasRestantes(dias: number): string {
  if (dias < 0) {
    const diasAbsolutos = Math.abs(dias);
    if (diasAbsolutos === 1) return '1 dia vencido';
    return `${diasAbsolutos} dias vencidos`;
  }
  if (dias === 0) return 'Hoje';
  if (dias === 1) return '1 dia';
  return `${dias} dias`;
}

export function diasPorExtenso(dias: number): string {
  if (dias === 0) return 'zero dias';
  if (dias === 1) return 'um dia';
  
  const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const especiais = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
  
  if (dias < 10) return `${unidades[dias]} dias`;
  if (dias < 20) return `${especiais[dias - 10]} dias`;
  if (dias < 100) {
    const dezena = Math.floor(dias / 10);
    const unidade = dias % 10;
    if (unidade === 0) return `${dezenas[dezena]} dias`;
    return `${dezenas[dezena]} e ${unidades[unidade]} dias`;
  }
  
  // Para valores maiores, usa número
  return `${dias} dias`;
}

export default useLicencaCalculator;
