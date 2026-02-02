// Camada de Persistência - IndexedDB com idb
// Arquitetura Offline-First para Electron

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { Servidor, Processo, Falta, Afastamento, SystemConfig } from '@/types/licenca';
import { DEFAULT_CONFIG } from '@/types/licenca';

interface LicencaPremioDB extends DBSchema {
  servidores: {
    key: string;
    value: Servidor;
    indexes: { 'by-matricula': string; 'by-nome': string };
  };
  processos: {
    key: string;
    value: Processo;
    indexes: { 'by-matricula': string; 'by-numero': string; 'by-status': string };
  };
  faltas: {
    key: string;
    value: Falta;
    indexes: { 'by-matricula': string };
  };
  afastamentos: {
    key: string;
    value: Afastamento;
    indexes: { 'by-matricula': string };
  };
  config: {
    key: string;
    value: SystemConfig;
  };
}

const DB_NAME = 'licenca-premio-db';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<LicencaPremioDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<LicencaPremioDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<LicencaPremioDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Store de Servidores
      if (!db.objectStoreNames.contains('servidores')) {
        const servidoresStore = db.createObjectStore('servidores', { keyPath: 'id' });
        servidoresStore.createIndex('by-matricula', 'matricula', { unique: true });
        servidoresStore.createIndex('by-nome', 'nome');
      }

      // Store de Processos
      if (!db.objectStoreNames.contains('processos')) {
        const processosStore = db.createObjectStore('processos', { keyPath: 'id' });
        processosStore.createIndex('by-matricula', 'matriculaServidor');
        processosStore.createIndex('by-numero', 'numeroProcesso', { unique: true });
        processosStore.createIndex('by-status', 'statusGeral');
      }

      // Store de Faltas
      if (!db.objectStoreNames.contains('faltas')) {
        const faltasStore = db.createObjectStore('faltas', { keyPath: 'id' });
        faltasStore.createIndex('by-matricula', 'matriculaServidor');
      }

      // Store de Afastamentos
      if (!db.objectStoreNames.contains('afastamentos')) {
        const afastamentosStore = db.createObjectStore('afastamentos', { keyPath: 'id' });
        afastamentosStore.createIndex('by-matricula', 'matriculaServidor');
      }

      // Store de Configurações
      if (!db.objectStoreNames.contains('config')) {
        db.createObjectStore('config', { keyPath: 'id' });
      }
    },
  });

  return dbInstance;
}

// === SERVIDORES ===
export async function getAllServidores(): Promise<Servidor[]> {
  const db = await getDB();
  return db.getAll('servidores');
}

export async function getServidorByMatricula(matricula: string): Promise<Servidor | undefined> {
  const db = await getDB();
  return db.getFromIndex('servidores', 'by-matricula', matricula);
}

export async function getServidorById(id: string): Promise<Servidor | undefined> {
  const db = await getDB();
  return db.get('servidores', id);
}

export async function saveServidor(servidor: Servidor): Promise<void> {
  const db = await getDB();
  await db.put('servidores', servidor);
}

export async function saveServidores(servidores: Servidor[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('servidores', 'readwrite');
  await Promise.all([
    ...servidores.map(s => tx.store.put(s)),
    tx.done,
  ]);
}

export async function deleteServidor(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('servidores', id);
}

export async function searchServidores(query: string): Promise<Servidor[]> {
  const db = await getDB();
  const all = await db.getAll('servidores');
  const lowerQuery = query.toLowerCase();
  return all.filter(s => 
    s.nome.toLowerCase().includes(lowerQuery) ||
    s.matricula.includes(query) ||
    s.cargo?.toLowerCase().includes(lowerQuery)
  );
}

// === PROCESSOS ===
export async function getAllProcessos(): Promise<Processo[]> {
  const db = await getDB();
  return db.getAll('processos');
}

export async function getProcessosByMatricula(matricula: string): Promise<Processo[]> {
  const db = await getDB();
  return db.getAllFromIndex('processos', 'by-matricula', matricula);
}

export async function getProcessoByNumero(numero: string): Promise<Processo | undefined> {
  const db = await getDB();
  return db.getFromIndex('processos', 'by-numero', numero);
}

export async function saveProcesso(processo: Processo): Promise<void> {
  const db = await getDB();
  await db.put('processos', processo);
}

export async function saveProcessos(processos: Processo[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('processos', 'readwrite');
  await Promise.all([
    ...processos.map(p => tx.store.put(p)),
    tx.done,
  ]);
}

export async function deleteProcesso(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('processos', id);
}

export async function getProcessosFinalizados(): Promise<Processo[]> {
  const db = await getDB();
  return db.getAllFromIndex('processos', 'by-status', 'FINALIZADO');
}

// === FALTAS ===
export async function getAllFaltas(): Promise<Falta[]> {
  const db = await getDB();
  return db.getAll('faltas');
}

export async function getFaltasByMatricula(matricula: string): Promise<Falta[]> {
  const db = await getDB();
  return db.getAllFromIndex('faltas', 'by-matricula', matricula);
}

export async function saveFalta(falta: Falta): Promise<void> {
  const db = await getDB();
  await db.put('faltas', falta);
}

export async function saveFaltas(faltas: Falta[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('faltas', 'readwrite');
  await Promise.all([
    ...faltas.map(f => tx.store.put(f)),
    tx.done,
  ]);
}

export async function deleteFalta(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('faltas', id);
}

// === AFASTAMENTOS ===
export async function getAllAfastamentos(): Promise<Afastamento[]> {
  const db = await getDB();
  return db.getAll('afastamentos');
}

export async function getAfastamentosByMatricula(matricula: string): Promise<Afastamento[]> {
  const db = await getDB();
  return db.getAllFromIndex('afastamentos', 'by-matricula', matricula);
}

export async function saveAfastamento(afastamento: Afastamento): Promise<void> {
  const db = await getDB();
  await db.put('afastamentos', afastamento);
}

export async function saveAfastamentos(afastamentos: Afastamento[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('afastamentos', 'readwrite');
  await Promise.all([
    ...afastamentos.map(a => tx.store.put(a)),
    tx.done,
  ]);
}

export async function deleteAfastamento(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('afastamentos', id);
}

// === CONFIG ===
export async function getConfig(): Promise<SystemConfig> {
  const db = await getDB();
  const config = await db.get('config', 'system');
  return config || { ...DEFAULT_CONFIG, id: 'system' } as SystemConfig;
}

export async function saveConfig(config: SystemConfig): Promise<void> {
  const db = await getDB();
  await db.put('config', { ...config, id: 'system' } as any);
}

// === LIMPAR DADOS ===
export async function clearAllData(): Promise<void> {
  const db = await getDB();
  await Promise.all([
    db.clear('servidores'),
    db.clear('processos'),
    db.clear('faltas'),
    db.clear('afastamentos'),
  ]);
}

// === ESTATÍSTICAS ===
export async function getStats() {
  const db = await getDB();
  return {
    servidores: await db.count('servidores'),
    processos: await db.count('processos'),
    faltas: await db.count('faltas'),
    afastamentos: await db.count('afastamentos'),
  };
}

// === EXPORTAR DADOS (para backup/migração) ===
export async function exportAllData() {
  const db = await getDB();
  return {
    servidores: await db.getAll('servidores'),
    processos: await db.getAll('processos'),
    faltas: await db.getAll('faltas'),
    afastamentos: await db.getAll('afastamentos'),
    config: await getConfig(),
    exportedAt: new Date().toISOString(),
  };
}

// === IMPORTAR DADOS (de backup) ===
export async function importAllData(data: {
  servidores: Servidor[];
  processos: Processo[];
  faltas: Falta[];
  afastamentos: Afastamento[];
  config?: SystemConfig;
}): Promise<void> {
  await clearAllData();
  await Promise.all([
    saveServidores(data.servidores),
    saveProcessos(data.processos),
    saveFaltas(data.faltas),
    saveAfastamentos(data.afastamentos),
    data.config && saveConfig(data.config),
  ]);
}
