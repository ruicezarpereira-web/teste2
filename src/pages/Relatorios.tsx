// Página: Gerador de Relatórios Word

import { useState, useEffect } from 'react';
import { 
  FileText, 
  Upload, 
  Download, 
  FileCheck,
  AlertCircle,
  HelpCircle,
  Users,
  User,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  gerarDocumentoServidor, 
  gerarMapaLicencas,
  VARIAVEIS_DISPONIVEIS,
  validarTemplate
} from '@/lib/documentGenerator';
import { 
  getAllServidores, 
  getAllProcessos, 
  getAllFaltas, 
  getAllAfastamentos 
} from '@/lib/database';
import { useLicencaCalculator } from '@/hooks/useLicencaCalculator';
import type { CalculoLicenca, StatusLicenca } from '@/types/licenca';
import { StatusBadge } from '@/components/StatusBadge';
import { cn } from '@/lib/utils';

export default function Relatorios() {
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templateValidation, setTemplateValidation] = useState<{
    valido: boolean;
    variaveisEncontradas: string[];
    variaveisNaoReconhecidas: string[];
  } | null>(null);
  const [calculos, setCalculos] = useState<CalculoLicenca[]>([]);
  const [selectedServidor, setSelectedServidor] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<StatusLicenca | 'TODOS'>('TODOS');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const { calcularTodos, filtrarPorStatus } = useLicencaCalculator();
  
  // Carrega dados
  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const [serv, proc, falt, afast] = await Promise.all([
          getAllServidores(),
          getAllProcessos(),
          getAllFaltas(),
          getAllAfastamentos(),
        ]);
        
        const calculosResult = calcularTodos(serv, proc, falt, afast);
        setCalculos(calculosResult);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);
  
  // Valida template quando selecionado
  const handleTemplateSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith('.docx')) {
      setTemplateFile(file);
      const validation = await validarTemplate(file);
      setTemplateValidation(validation);
    }
  };
  
  // Gera documento individual
  const handleGerarIndividual = async () => {
    if (!templateFile || !selectedServidor) return;
    
    const calculo = calculos.find(c => c.servidor.id === selectedServidor);
    if (!calculo) return;
    
    setIsGenerating(true);
    try {
      await gerarDocumentoServidor(templateFile, calculo);
    } catch (error) {
      console.error('Erro ao gerar documento:', error);
      alert('Erro ao gerar documento. Verifique o console.');
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Gera mapa geral
  const handleGerarMapa = async () => {
    if (!templateFile) return;
    
    let calculosParaGerar = calculos;
    if (selectedStatus !== 'TODOS') {
      calculosParaGerar = filtrarPorStatus(calculos, selectedStatus);
    }
    
    if (calculosParaGerar.length === 0) {
      alert('Nenhum servidor encontrado com os filtros selecionados.');
      return;
    }
    
    setIsGenerating(true);
    try {
      await gerarMapaLicencas(templateFile, calculosParaGerar);
    } catch (error) {
      console.error('Erro ao gerar mapa:', error);
      alert('Erro ao gerar documento. Verifique o console.');
    } finally {
      setIsGenerating(false);
    }
  };
  
  const calculosFiltrados = selectedStatus === 'TODOS' 
    ? calculos 
    : filtrarPorStatus(calculos, selectedStatus);
  
  return (
    <div className="flex-1 p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Gerador de Relatórios</h1>
        <p className="page-description">
          Gere documentos Word personalizados com os dados calculados
        </p>
      </div>
      
      {/* Template Upload */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Template Word
          </CardTitle>
          <CardDescription>
            Carregue um arquivo .docx com as variáveis de substituição
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label htmlFor="template-file" className="sr-only">Selecionar template</Label>
                <Input
                  id="template-file"
                  type="file"
                  accept=".docx"
                  onChange={handleTemplateSelect}
                  className="cursor-pointer"
                />
              </div>
              {templateFile && (
                <Badge variant="secondary" className="gap-1">
                  <FileCheck className="w-3 h-3" />
                  {templateFile.name}
                </Badge>
              )}
            </div>
            
            {/* Validation Result */}
            {templateValidation && (
              <div className="space-y-3">
                {templateValidation.variaveisEncontradas.length > 0 && (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4 text-status-em-breve" />
                    <AlertTitle>Variáveis reconhecidas</AlertTitle>
                    <AlertDescription>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {templateValidation.variaveisEncontradas.map(v => (
                          <Badge key={v} variant="secondary" className="text-xs">
                            {v}
                          </Badge>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
                
                {templateValidation.variaveisNaoReconhecidas.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Variáveis não reconhecidas</AlertTitle>
                    <AlertDescription>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {templateValidation.variaveisNaoReconhecidas.map(v => (
                          <Badge key={v} variant="outline" className="text-xs">
                            {v}
                          </Badge>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Generation Tabs */}
      <Tabs defaultValue="individual" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="individual" className="gap-2">
            <User className="w-4 h-4" />
            Documento Individual
          </TabsTrigger>
          <TabsTrigger value="mapa" className="gap-2">
            <Users className="w-4 h-4" />
            Mapa Geral
          </TabsTrigger>
        </TabsList>
        
        {/* Individual Document */}
        <TabsContent value="individual">
          <Card>
            <CardHeader>
              <CardTitle>Gerar Documento Individual</CardTitle>
              <CardDescription>
                Selecione um servidor para gerar o documento personalizado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Servidor</Label>
                <Select value={selectedServidor} onValueChange={setSelectedServidor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um servidor..." />
                  </SelectTrigger>
                  <SelectContent>
                    <ScrollArea className="h-[300px]">
                      {calculos.map((c) => (
                        <SelectItem key={c.servidor.id} value={c.servidor.id}>
                          <div className="flex items-center gap-2">
                            <span>{c.servidor.matricula}</span>
                            <span>-</span>
                            <span className="truncate max-w-[200px]">{c.servidor.nome}</span>
                            <StatusBadge status={c.status} size="sm" />
                          </div>
                        </SelectItem>
                      ))}
                    </ScrollArea>
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                onClick={handleGerarIndividual}
                disabled={!templateFile || !selectedServidor || isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Gerar Documento
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* General Map */}
        <TabsContent value="mapa">
          <Card>
            <CardHeader>
              <CardTitle>Gerar Mapa Geral</CardTitle>
              <CardDescription>
                Gere um documento com todos os servidores filtrados por status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Filtrar por Status</Label>
                <Select value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as StatusLicenca | 'TODOS')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS">Todos ({calculos.length})</SelectItem>
                    <SelectItem value="VENCIDO">
                      Vencidos ({calculos.filter(c => c.status === 'VENCIDO').length})
                    </SelectItem>
                    <SelectItem value="URGENTE">
                      Urgentes ({calculos.filter(c => c.status === 'URGENTE').length})
                    </SelectItem>
                    <SelectItem value="PROXIMO">
                      Próximos ({calculos.filter(c => c.status === 'PROXIMO').length})
                    </SelectItem>
                    <SelectItem value="EM_BREVE">
                      Em Breve ({calculos.filter(c => c.status === 'EM_BREVE').length})
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="bg-muted rounded-lg p-4 text-sm">
                <p className="font-medium mb-1">Servidores incluídos: {calculosFiltrados.length}</p>
                <p className="text-muted-foreground text-xs">
                  O documento será gerado com a lista de todos os servidores selecionados.
                </p>
              </div>
              
              <Button 
                onClick={handleGerarMapa}
                disabled={!templateFile || calculosFiltrados.length === 0 || isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Gerar Mapa ({calculosFiltrados.length} servidores)
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Variables Reference */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            Variáveis Disponíveis
          </CardTitle>
          <CardDescription>
            Use estas variáveis no seu template Word entre chaves
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {VARIAVEIS_DISPONIVEIS.map((v) => (
              <div 
                key={v.nome} 
                className="flex items-start gap-3 p-3 bg-muted rounded-lg"
              >
                <code className="bg-background px-2 py-1 rounded text-xs font-mono shrink-0">
                  {v.nome}
                </code>
                <span className="text-xs text-muted-foreground">{v.descricao}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
