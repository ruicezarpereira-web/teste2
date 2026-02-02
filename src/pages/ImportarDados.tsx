// Página: Importação de Dados Excel

import { useState, useCallback } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  XCircle,
  FileWarning,
  Loader2,
  Trash2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { importarExcel, previewExcel } from '@/lib/excelImporter';
import { clearAllData, getStats } from '@/lib/database';
import type { ImportResult } from '@/types/licenca';
import { cn } from '@/lib/utils';

export default function ImportarDados() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [limparDados, setLimparDados] = useState(true);
  const [preview, setPreview] = useState<{ abas: string[]; preview: Record<string, any[]> } | null>(null);
  const [stats, setStats] = useState<{ servidores: number; processos: number; faltas: number; afastamentos: number } | null>(null);
  
  // Carrega estatísticas atuais
  const carregarStats = async () => {
    const s = await getStats();
    setStats(s);
  };
  
  // Drag and Drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);
  
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xlsm'))) {
      setFile(droppedFile);
      setResult(null);
      
      // Preview
      try {
        const previewData = await previewExcel(droppedFile);
        setPreview(previewData);
      } catch (err) {
        console.error('Erro ao gerar preview:', err);
      }
    }
  }, []);
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      
      // Preview
      try {
        const previewData = await previewExcel(selectedFile);
        setPreview(previewData);
      } catch (err) {
        console.error('Erro ao gerar preview:', err);
      }
    }
  };
  
  const handleProcessar = async () => {
    if (!file) return;
    
    setIsProcessing(true);
    setProgress(10);
    
    try {
      // Simula progresso
      setProgress(30);
      await new Promise(r => setTimeout(r, 300));
      
      setProgress(60);
      const importResult = await importarExcel(file, limparDados);
      
      setProgress(90);
      await new Promise(r => setTimeout(r, 200));
      
      setProgress(100);
      setResult(importResult);
      
      // Atualiza stats
      await carregarStats();
    } catch (error) {
      setResult({
        success: false,
        servidoresImportados: 0,
        processosImportados: 0,
        faltasImportadas: 0,
        afastamentosImportados: 0,
        errors: [{
          linha: 0,
          aba: 'geral',
          campo: 'arquivo',
          mensagem: `Erro ao processar: ${error}`,
        }],
        warnings: [],
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleLimparBase = async () => {
    if (confirm('Tem certeza que deseja limpar todos os dados? Esta ação não pode ser desfeita.')) {
      await clearAllData();
      await carregarStats();
      setFile(null);
      setResult(null);
      setPreview(null);
    }
  };
  
  // Carrega stats ao montar
  useState(() => {
    carregarStats();
  });
  
  return (
    <div className="flex-1 p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Importar Dados</h1>
        <p className="page-description">
          Carregue sua planilha Excel (.xlsx ou .xlsm) para importar os dados
        </p>
      </div>
      
      {/* Current Stats */}
      {stats && (stats.servidores > 0 || stats.processos > 0) && (
        <Alert className="mb-6">
          <FileSpreadsheet className="h-4 w-4" />
          <AlertTitle>Dados atuais no sistema</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              {stats.servidores} servidores • {stats.processos} processos • {stats.faltas} faltas
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLimparBase}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Limpar base
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Upload Area */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div
            className={cn(
              'dropzone cursor-pointer',
              isDragging && 'dropzone-active',
              file && 'border-primary bg-primary/5'
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <input
              id="file-input"
              type="file"
              accept=".xlsx,.xlsm"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {file ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileSpreadsheet className="w-7 h-7 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  setPreview(null);
                  setResult(null);
                }}>
                  Trocar arquivo
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center">
                  <Upload className="w-7 h-7 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="font-medium">Arraste seu arquivo aqui</p>
                  <p className="text-sm text-muted-foreground">
                    ou clique para selecionar (.xlsx ou .xlsm)
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Preview */}
      {preview && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Abas encontradas</CardTitle>
            <CardDescription>
              {preview.abas.length} aba(s) detectada(s) no arquivo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {preview.abas.map((aba) => (
                <AccordionItem key={aba} value={aba}>
                  <AccordionTrigger className="text-sm">
                    <span className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4" />
                      {aba}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="bg-muted rounded-lg p-3 overflow-x-auto">
                      <table className="text-xs w-full">
                        <tbody>
                          {preview.preview[aba]?.slice(0, 3).map((row, i) => (
                            <tr key={i}>
                              {(row as any[]).slice(0, 6).map((cell, j) => (
                                <td key={j} className="px-2 py-1 border-r border-border last:border-r-0">
                                  {String(cell || '-').substring(0, 20)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}
      
      {/* Options */}
      {file && !result && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="limpar" 
                  checked={limparDados}
                  onCheckedChange={(checked) => setLimparDados(checked as boolean)}
                />
                <Label htmlFor="limpar" className="text-sm cursor-pointer">
                  Limpar dados existentes antes de importar
                </Label>
              </div>
              
              <Button 
                onClick={handleProcessar} 
                disabled={isProcessing}
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Processar Dados
                  </>
                )}
              </Button>
            </div>
            
            {isProcessing && (
              <div className="mt-4">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Processando arquivo...
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Result */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.success ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-status-em-breve" />
                  Importação Concluída
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-status-vencido" />
                  Erro na Importação
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-muted rounded-lg p-4 text-center">
                <p className="text-2xl font-bold">{result.servidoresImportados}</p>
                <p className="text-xs text-muted-foreground">Servidores</p>
              </div>
              <div className="bg-muted rounded-lg p-4 text-center">
                <p className="text-2xl font-bold">{result.processosImportados}</p>
                <p className="text-xs text-muted-foreground">Processos</p>
              </div>
              <div className="bg-muted rounded-lg p-4 text-center">
                <p className="text-2xl font-bold">{result.faltasImportadas}</p>
                <p className="text-xs text-muted-foreground">Faltas</p>
              </div>
              <div className="bg-muted rounded-lg p-4 text-center">
                <p className="text-2xl font-bold">{result.afastamentosImportados}</p>
                <p className="text-xs text-muted-foreground">Afastamentos</p>
              </div>
            </div>
            
            {/* Warnings */}
            {result.warnings.length > 0 && (
              <Alert>
                <FileWarning className="h-4 w-4" />
                <AlertTitle>Avisos</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside text-sm">
                    {result.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            
            {/* Errors */}
            {result.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erros ({result.errors.length})</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside text-sm max-h-40 overflow-y-auto">
                    {result.errors.slice(0, 10).map((e, i) => (
                      <li key={i}>
                        Linha {e.linha} ({e.aba}): {e.mensagem}
                      </li>
                    ))}
                    {result.errors.length > 10 && (
                      <li>... e mais {result.errors.length - 10} erros</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            
            {/* Action */}
            {result.success && (
              <div className="flex justify-end">
                <Button asChild>
                  <a href="/">Ir para Dashboard</a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
