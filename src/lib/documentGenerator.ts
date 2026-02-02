// Gerador de Documentos Word (.docx)
// Usa docxtemplater + pizzip

import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { CalculoLicenca, TemplateVariables } from '@/types/licenca';
import { diasPorExtenso } from '@/hooks/useLicencaCalculator';

// Formata data para o padrão brasileiro
function formatarData(data: Date | null | undefined): string {
  if (!data) return '___/___/______';
  try {
    return format(new Date(data), 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return '___/___/______';
  }
}

// Formata data por extenso
function formatarDataExtenso(data: Date | null | undefined): string {
  if (!data) return '_______________________________';
  try {
    return format(new Date(data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  } catch {
    return '_______________________________';
  }
}

// Converte cálculo para variáveis do template
export function calcularVariaveisTemplate(calculo: CalculoLicenca): TemplateVariables {
  const servidor = calculo.servidor;
  const processo = calculo.ultimoProcesso;
  
  return {
    // Dados do Servidor
    nome_servidor: servidor.nome,
    matricula: servidor.matricula,
    cargo: servidor.cargo || '',
    lotacao: servidor.lotacao || '',
    data_admissao: formatarData(servidor.dataAdmissao),
    
    // Dados do Quinquênio
    quinquenio_atual: processo?.quinquenio || '',
    proximo_quinquenio: `${calculo.proximoQuinquenio}º`,
    data_quinquenio_inicio: formatarData(calculo.dataInicioQuinquenio),
    data_quinquenio_fim: formatarData(calculo.dataFimQuinquenio),
    data_quinquenio_inicio_extenso: formatarDataExtenso(calculo.dataInicioQuinquenio),
    data_quinquenio_fim_extenso: formatarDataExtenso(calculo.dataFimQuinquenio),
    
    // Cálculo da Licença
    data_prevista: formatarData(calculo.dataPrevista),
    data_prevista_extenso: formatarDataExtenso(calculo.dataPrevista),
    dias_restantes: String(calculo.diasRestantes),
    status: calculo.status,
    
    // Penalidades
    dias_penalidade: String(calculo.diasPenalidade),
    dias_penalidade_extenso: diasPorExtenso(calculo.diasPenalidade),
    
    // Processo
    numero_processo: processo?.numeroProcesso || '',
    data_publicacao: formatarData(processo?.dataPublicacao),
    data_abertura: formatarData(processo?.dataAbertura),
    situacao: processo?.situacao || '',
    
    // Data atual
    data_atual: formatarData(new Date()),
    data_atual_extenso: formatarDataExtenso(new Date()),
  };
}

// Gera documento a partir do template
export async function gerarDocumento(
  templateFile: File,
  calculos: CalculoLicenca | CalculoLicenca[],
  nomeArquivo?: string
): Promise<void> {
  try {
    // Lê o arquivo de template
    const arrayBuffer = await templateFile.arrayBuffer();
    const zip = new PizZip(arrayBuffer);
    
    // Cria o docxtemplater
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{', end: '}' },
    });
    
    // Se é um array, usa o primeiro ou cria uma lista
    const isMultiple = Array.isArray(calculos);
    const dataArray = isMultiple ? calculos : [calculos];
    
    if (dataArray.length === 1) {
      // Documento único
      const data = calcularVariaveisTemplate(dataArray[0]);
      doc.render(data);
    } else {
      // Documento com lista (se o template suportar)
      const lista = dataArray.map(c => calcularVariaveisTemplate(c));
      doc.render({
        servidores: lista,
        total_servidores: lista.length,
        data_geracao: formatarData(new Date()),
        data_geracao_extenso: formatarDataExtenso(new Date()),
      });
    }
    
    // Gera o blob
    const blob = doc.getZip().generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    
    // Define nome do arquivo
    const fileName = nomeArquivo || 
      (dataArray.length === 1 
        ? `licenca_${dataArray[0].servidor.matricula}_${format(new Date(), 'yyyyMMdd')}.docx`
        : `mapa_licencas_${format(new Date(), 'yyyyMMdd')}.docx`
      );
    
    // Salva o arquivo
    saveAs(blob, fileName);
    
  } catch (error) {
    console.error('Erro ao gerar documento:', error);
    throw new Error(`Falha ao gerar documento: ${error}`);
  }
}

// Gera documento para um único servidor
export async function gerarDocumentoServidor(
  templateFile: File,
  calculo: CalculoLicenca
): Promise<void> {
  return gerarDocumento(templateFile, calculo);
}

// Gera mapa geral de licenças
export async function gerarMapaLicencas(
  templateFile: File,
  calculos: CalculoLicenca[]
): Promise<void> {
  return gerarDocumento(templateFile, calculos, `mapa_licencas_${format(new Date(), 'yyyyMMdd')}.docx`);
}

// Lista de variáveis disponíveis para o template
export const VARIAVEIS_DISPONIVEIS: { nome: string; descricao: string }[] = [
  { nome: '{nome_servidor}', descricao: 'Nome completo do servidor' },
  { nome: '{matricula}', descricao: 'Matrícula do servidor' },
  { nome: '{cargo}', descricao: 'Cargo do servidor' },
  { nome: '{lotacao}', descricao: 'Lotação do servidor' },
  { nome: '{data_admissao}', descricao: 'Data de admissão (DD/MM/AAAA)' },
  { nome: '{quinquenio_atual}', descricao: 'Quinquênio atual (ex: 5º)' },
  { nome: '{proximo_quinquenio}', descricao: 'Próximo quinquênio' },
  { nome: '{data_quinquenio_inicio}', descricao: 'Início do quinquênio' },
  { nome: '{data_quinquenio_fim}', descricao: 'Fim do quinquênio' },
  { nome: '{data_prevista}', descricao: 'Data prevista com penalidades' },
  { nome: '{data_prevista_extenso}', descricao: 'Data prevista por extenso' },
  { nome: '{dias_penalidade}', descricao: 'Total de dias de penalidade' },
  { nome: '{dias_penalidade_extenso}', descricao: 'Dias de penalidade por extenso' },
  { nome: '{numero_processo}', descricao: 'Número do processo' },
  { nome: '{data_publicacao}', descricao: 'Data de publicação' },
  { nome: '{situacao}', descricao: 'Situação do processo' },
  { nome: '{data_atual}', descricao: 'Data atual' },
  { nome: '{data_atual_extenso}', descricao: 'Data atual por extenso' },
];

// Valida se um template contém as variáveis esperadas
export async function validarTemplate(templateFile: File): Promise<{
  valido: boolean;
  variaveisEncontradas: string[];
  variaveisNaoReconhecidas: string[];
}> {
  try {
    const arrayBuffer = await templateFile.arrayBuffer();
    const zip = new PizZip(arrayBuffer);
    
    // Lê o conteúdo XML do documento
    const content = zip.file('word/document.xml')?.asText() || '';
    
    const variaveisConhecidas = VARIAVEIS_DISPONIVEIS.map(v => v.nome);
    const encontradas: string[] = [];
    const naoReconhecidas: string[] = [];
    
    // Regex para encontrar variáveis {xxx}
    const regex = /\{([^}]+)\}/g;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      const variavel = `{${match[1]}}`;
      if (variaveisConhecidas.includes(variavel)) {
        if (!encontradas.includes(variavel)) {
          encontradas.push(variavel);
        }
      } else {
        if (!naoReconhecidas.includes(variavel)) {
          naoReconhecidas.push(variavel);
        }
      }
    }
    
    return {
      valido: true,
      variaveisEncontradas: encontradas,
      variaveisNaoReconhecidas: naoReconhecidas,
    };
    
  } catch (error) {
    return {
      valido: false,
      variaveisEncontradas: [],
      variaveisNaoReconhecidas: [],
    };
  }
}
