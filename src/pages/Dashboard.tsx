// Página: Dashboard - Visão Geral com KPIs

import { useEffect, useState } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  Timer, 
  CalendarCheck,
  Users,
  TrendingUp,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Link } from 'react-router-dom';
import { 
  getAllServidores, 
  getAllProcessos, 
  getAllFaltas, 
  getAllAfastamentos 
} from '@/lib/database';
import { 
  useLicencaCalculator, 
  formatarData, 
  formatarDiasRestantes 
} from '@/hooks/useLicencaCalculator';
import type { 
  Servidor, 
  Processo, 
  Falta, 
  Afastamento, 
  CalculoLicenca, 
  DashboardKPIs 
} from '@/types/licenca';
import { StatusBadge } from '@/components/StatusBadge';

const CHART_COLORS = {
  VENCIDO: 'hsl(0, 70%, 50%)',
  URGENTE: 'hsl(25, 95%, 50%)',
  PROXIMO: 'hsl(45, 95%, 50%)',
  EM_BREVE: 'hsl(142, 60%, 45%)',
};

export default function Dashboard() {
  const [servidores, setServidores] = useState<Servidor[]>([]);
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [faltas, setFaltas] = useState<Falta[]>([]);
  const [afastamentos, setAfastamentos] = useState<Afastamento[]>([]);
  const [calculos, setCalculos] = useState<CalculoLicenca[]>([]);
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const { calcularTodos, gerarKPIs } = useLicencaCalculator();
  
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
      
      // Calcula licenças
      const calculosResult = calcularTodos(serv, proc, falt, afast);
      setCalculos(calculosResult);
      
      // Gera KPIs
      const kpisResult = gerarKPIs(serv, proc, falt, afast);
      setKpis(kpisResult);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    carregarDados();
  }, []);
  
  // Dados para o gráfico
  const chartData = kpis ? [
    { name: 'Vencidos', value: kpis.totalProcessosVencidos, color: CHART_COLORS.VENCIDO },
    { name: 'Urgentes', value: kpis.totalProcessosUrgentes, color: CHART_COLORS.URGENTE },
    { name: 'Próximos', value: kpis.totalProcessosProximos, color: CHART_COLORS.PROXIMO },
    { name: 'Em Breve', value: kpis.totalProcessosEmBreve, color: CHART_COLORS.EM_BREVE },
  ].filter(d => d.value > 0) : [];
  
  // Filtra apenas os mais urgentes (até 180 dias)
  const calculosUrgentes = calculos.filter(c => c.diasRestantes <= 180).slice(0, 10);
  
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <RefreshCw className="w-8 h-8 animate-spin" />
          <span>Carregando dados...</span>
        </div>
      </div>
    );
  }
  
  const hasData = servidores.length > 0 || processos.length > 0;
  
  if (!hasData) {
    return (
      <div className="flex-1 p-8">
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-description">Visão geral do sistema de Licença-Prêmio</p>
        </div>
        
        <Card className="max-w-2xl mx-auto mt-12">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-6 flex items-center justify-center">
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Nenhum dado encontrado</h2>
            <p className="text-muted-foreground mb-6">
              Importe sua planilha Excel para começar a usar o sistema.
            </p>
            <Button asChild size="lg">
              <Link to="/importar">
                Importar Dados
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="flex-1 p-8">
      {/* Header */}
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-description">Visão geral do sistema de Licença-Prêmio</p>
        </div>
        <Button variant="outline" onClick={carregarDados} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>
      
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="kpi-card border-l-4 border-l-status-vencido">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vencidos
            </CardTitle>
            <AlertTriangle className="h-5 w-5 text-status-vencido" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-status-vencido">
              {kpis?.totalProcessosVencidos || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Licenças com período completo
            </p>
          </CardContent>
        </Card>
        
        <Card className="kpi-card border-l-4 border-l-status-urgente">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Urgentes
            </CardTitle>
            <Clock className="h-5 w-5 text-status-urgente" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-status-urgente">
              {kpis?.totalProcessosUrgentes || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Vencimento em até 30 dias
            </p>
          </CardContent>
        </Card>
        
        <Card className="kpi-card border-l-4 border-l-status-proximo">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Próximos
            </CardTitle>
            <Timer className="h-5 w-5 text-status-proximo" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-status-proximo">
              {kpis?.totalProcessosProximos || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Vencimento em 31-90 dias
            </p>
          </CardContent>
        </Card>
        
        <Card className="kpi-card border-l-4 border-l-status-em-breve">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Em Breve
            </CardTitle>
            <CalendarCheck className="h-5 w-5 text-status-em-breve" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-status-em-breve">
              {kpis?.totalProcessosEmBreve || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Vencimento em 91-180 dias
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Secondary Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Servidores
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.totalServidores || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tempo Médio de Publicação
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {kpis?.tempoMedioPublicacao || 0} dias
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Processos Ativos
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.processosAtivos || 0}</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Chart and Table */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Status</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                Nenhuma licença próxima
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Urgent List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Licenças Mais Urgentes</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/consulta">Ver todos</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {calculosUrgentes.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Servidor</TableHead>
                    <TableHead>Data Prevista</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calculosUrgentes.map((calculo) => (
                    <TableRow key={calculo.servidor.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium truncate max-w-[180px]">
                            {calculo.servidor.nome}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {calculo.servidor.matricula}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatarData(calculo.dataPrevista)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={calculo.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Nenhuma licença urgente
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
