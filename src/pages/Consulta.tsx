// Página: Consulta e Cálculo de Licenças

import { useEffect, useState, useMemo } from 'react';
import { 
  Search, 
  User, 
  Calendar, 
  Clock, 
  FileText,
  AlertTriangle,
  ChevronRight,
  Filter,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  getAllServidores, 
  getAllProcessos, 
  getAllFaltas, 
  getAllAfastamentos,
  getProcessosByMatricula
} from '@/lib/database';
import { 
  useLicencaCalculator, 
  formatarData, 
  formatarDiasRestantes,
  diasPorExtenso
} from '@/hooks/useLicencaCalculator';
import type { 
  Servidor, 
  Processo, 
  Falta, 
  Afastamento, 
  CalculoLicenca,
  StatusLicenca
} from '@/types/licenca';
import { StatusBadge } from '@/components/StatusBadge';
import { cn } from '@/lib/utils';

export default function Consulta() {
  const [servidores, setServidores] = useState<Servidor[]>([]);
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [faltas, setFaltas] = useState<Falta[]>([]);
  const [afastamentos, setAfastamentos] = useState<Afastamento[]>([]);
  const [calculos, setCalculos] = useState<CalculoLicenca[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusLicenca | 'TODOS'>('TODOS');
  
  // Detalhe selecionado
  const [selectedCalculo, setSelectedCalculo] = useState<CalculoLicenca | null>(null);
  const [selectedProcessos, setSelectedProcessos] = useState<Processo[]>([]);
  
  const { calcularTodos, filtrarPorStatus } = useLicencaCalculator();
  
  const carregarDados = async () => {
    setIsLoading(true);
    try {
      const [serv, proc, falt, afast] = await Promise.all([
        getAllServidores(),
        getAllProcessos(),
        getAllFaltas(),
        getAllAfastamentos(),
      ]);
      
      setServidores(serv);
      setProcessos(proc);
      setFaltas(falt);
      setAfastamentos(afast);
      
      const calculosResult = calcularTodos(serv, proc, falt, afast);
      setCalculos(calculosResult);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    carregarDados();
  }, []);
  
  // Filtra resultados
  const calculosFiltrados = useMemo(() => {
    let resultado = calculos;
    
    // Filtro por status
    if (statusFilter !== 'TODOS') {
      resultado = filtrarPorStatus(resultado, statusFilter);
    }
    
    // Filtro por busca
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      resultado = resultado.filter(c => 
        c.servidor.nome.toLowerCase().includes(query) ||
        c.servidor.matricula.includes(query) ||
        c.servidor.cargo?.toLowerCase().includes(query)
      );
    }
    
    return resultado;
  }, [calculos, statusFilter, searchQuery, filtrarPorStatus]);
  
  // Abre detalhe do servidor
  const handleSelectServidor = async (calculo: CalculoLicenca) => {
    setSelectedCalculo(calculo);
    // Busca histórico de processos
    const historico = await getProcessosByMatricula(calculo.servidor.matricula);
    setSelectedProcessos(historico.sort((a, b) => 
      new Date(b.dataAbertura).getTime() - new Date(a.dataAbertura).getTime()
    ));
  };
  
  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('TODOS');
  };
  
  const hasFilters = searchQuery || statusFilter !== 'TODOS';
  
  return (
    <div className="flex-1 p-8">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Consulta de Licenças</h1>
        <p className="page-description">
          Busque servidores e visualize cálculos detalhados
        </p>
      </div>
      
      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px] max-w-md relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou matrícula..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusLicenca | 'TODOS')}>
              <SelectTrigger className="w-[160px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value="VENCIDO">Vencidos</SelectItem>
                <SelectItem value="URGENTE">Urgentes</SelectItem>
                <SelectItem value="PROXIMO">Próximos</SelectItem>
                <SelectItem value="EM_BREVE">Em Breve</SelectItem>
                <SelectItem value="NORMAL">Normais</SelectItem>
              </SelectContent>
            </Select>
            
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" />
                Limpar filtros
              </Button>
            )}
            
            <div className="ml-auto text-sm text-muted-foreground">
              {calculosFiltrados.length} de {calculos.length} servidores
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Results Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-pulse text-muted-foreground">Carregando...</div>
            </div>
          ) : calculosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Search className="w-12 h-12 mb-4 opacity-50" />
              <p>Nenhum resultado encontrado</p>
              {hasFilters && (
                <Button variant="link" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Matrícula</TableHead>
                  <TableHead>Servidor</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Quinquênio</TableHead>
                  <TableHead>Data Prevista</TableHead>
                  <TableHead>Dias</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calculosFiltrados.map((calculo) => (
                  <TableRow 
                    key={calculo.servidor.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSelectServidor(calculo)}
                  >
                    <TableCell className="font-mono text-sm">
                      {calculo.servidor.matricula}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{calculo.servidor.nome}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {calculo.servidor.cargo || '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{calculo.proximoQuinquenio}º</Badge>
                    </TableCell>
                    <TableCell>{formatarData(calculo.dataPrevista)}</TableCell>
                    <TableCell className={cn(
                      'font-medium',
                      calculo.diasRestantes < 0 && 'text-status-vencido',
                      calculo.diasRestantes >= 0 && calculo.diasRestantes <= 30 && 'text-status-urgente'
                    )}>
                      {formatarDiasRestantes(calculo.diasRestantes)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={calculo.status} />
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {/* Detail Sheet */}
      <Sheet open={!!selectedCalculo} onOpenChange={() => setSelectedCalculo(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedCalculo && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  {selectedCalculo.servidor.nome}
                </SheetTitle>
                <SheetDescription>
                  Matrícula: {selectedCalculo.servidor.matricula}
                </SheetDescription>
              </SheetHeader>
              
              <div className="mt-6 space-y-6">
                {/* Status Banner */}
                <div className={cn(
                  'rounded-lg p-4',
                  selectedCalculo.status === 'VENCIDO' && 'bg-status-vencido-bg',
                  selectedCalculo.status === 'URGENTE' && 'bg-status-urgente-bg',
                  selectedCalculo.status === 'PROXIMO' && 'bg-status-proximo-bg',
                  selectedCalculo.status === 'EM_BREVE' && 'bg-status-em-breve-bg',
                  selectedCalculo.status === 'NORMAL' && 'bg-muted'
                )}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Próximo Quinquênio</p>
                      <p className="text-2xl font-bold">{selectedCalculo.proximoQuinquenio}º</p>
                    </div>
                    <StatusBadge status={selectedCalculo.status} size="lg" />
                  </div>
                </div>
                
                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Cargo</p>
                    <p className="text-sm font-medium">
                      {selectedCalculo.servidor.cargo || '-'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Lotação</p>
                    <p className="text-sm font-medium">
                      {selectedCalculo.servidor.lotacao || '-'}
                    </p>
                  </div>
                </div>
                
                <Separator />
                
                {/* Calculation Details */}
                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Detalhes do Cálculo
                  </h4>
                  
                  <div className="space-y-3 bg-muted rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Início do Quinquênio</span>
                      <span className="font-medium">{formatarData(selectedCalculo.dataInicioQuinquenio)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Fim do Quinquênio (base)</span>
                      <span className="font-medium">{formatarData(selectedCalculo.dataFimQuinquenio)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center text-status-vencido">
                      <span className="text-sm">Dias de Penalidade</span>
                      <span className="font-medium">+{selectedCalculo.diasPenalidade} dias</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold">Data Prevista Final</span>
                      <span className="font-bold text-lg">{formatarData(selectedCalculo.dataPrevista)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Dias Restantes</span>
                      <span className={cn(
                        'font-semibold',
                        selectedCalculo.diasRestantes < 0 && 'text-status-vencido'
                      )}>
                        {formatarDiasRestantes(selectedCalculo.diasRestantes)}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Penalties */}
                {selectedCalculo.detalhesPenalidade.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="font-semibold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-status-urgente" />
                        Penalidades Aplicadas
                      </h4>
                      <div className="space-y-2">
                        {selectedCalculo.detalhesPenalidade.map((p, i) => (
                          <div key={i} className="bg-muted rounded-lg p-3 text-sm">
                            <div className="flex justify-between">
                              <span className="font-medium">{p.descricao}</span>
                              <span className="text-status-vencido">+{p.diasDescontados} dias</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatarData(p.dataInicio)} a {formatarData(p.dataFim)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                
                {/* Process History */}
                {selectedProcessos.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="font-semibold flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Histórico de Processos
                      </h4>
                      <ScrollArea className="h-[200px]">
                        <div className="space-y-3 pr-4">
                          {selectedProcessos.map((p) => (
                            <div key={p.id} className="timeline-item">
                              <div className="bg-card border rounded-lg p-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className="font-medium text-sm">{p.quinquenio} Quinquênio</p>
                                    <p className="text-xs text-muted-foreground">
                                      Processo: {p.numeroProcesso}
                                    </p>
                                  </div>
                                  <Badge variant={p.statusGeral === 'FINALIZADO' ? 'default' : 'secondary'}>
                                    {p.situacao}
                                  </Badge>
                                </div>
                                <div className="mt-2 text-xs text-muted-foreground">
                                  <p>Abertura: {formatarData(p.dataAbertura)}</p>
                                  {p.dataPublicacao && (
                                    <p>Publicação: {formatarData(p.dataPublicacao)}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
