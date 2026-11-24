import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { normalizeDatabase, normalizeEvolucion, normalizeMedicacion, normalizePaciente, normalizeTaller } from '@/data/normalize';
import { buildSeed } from '@/data/seed';
import { createRepositories, type Repositories } from '@/data/repositories';
import {
  nextAddendaId,
  nextAreaId,
  nextEvolucionId,
  nextFacturacionId,
  nextFacturacionIds,
  nextMedicacionId,
  nextPacienteId,
  nextTallerId,
} from '@/services/ids';
import { nowTime, todayISO } from '@/lib/format';
import {
  COLLECTION_KEYS,
  type Area,
  type CollectionKey,
  type Database,
  type Evolucion,
  type EvolucionAddenda,
  type EstadoPresentacion,
  type Facturacion,
  type Medicacion,
  type MotivoMedicacion,
  type Paciente,
  type Taller,
} from '@/types';

type WithOptionalId<T extends { id: string }> = Omit<T, 'id'> & { id?: string };

export type ImportMode = 'replace' | 'merge';
export type ImportSummary = Partial<Record<CollectionKey, number>>;

interface DataContextValue {
  status: 'loading' | 'ready' | 'error';
  error?: string;
  storage: { label: string; kind: 'local' | 'api' };
  db: Database;
  pacienteById: (id: string) => Paciente | undefined;
  areaById: (id: string) => Area | undefined;
  tallerById: (id: string) => Taller | undefined;

  savePaciente: (p: WithOptionalId<Paciente>) => Promise<Paciente>;
  deletePaciente: (id: string) => Promise<void>;
  saveEvolucion: (e: WithOptionalId<Evolucion>) => Promise<Evolucion>;
  addEvolucionAddenda: (evolucionId: string, texto: string, profesional: string) => Promise<Evolucion>;
  deleteEvolucion: (id: string) => Promise<void>;
  saveTaller: (t: WithOptionalId<Taller>) => Promise<Taller>;
  deleteTaller: (id: string) => Promise<void>;
  saveMedicacion: (m: WithOptionalId<Medicacion>, historialMotivo?: MotivoMedicacion, historialDetalle?: string) => Promise<Medicacion>;
  deleteMedicacion: (id: string) => Promise<void>;
  saveFacturacion: (f: WithOptionalId<Facturacion>) => Promise<Facturacion>;
  saveFacturaciones: (items: Omit<Facturacion, 'id' | 'estado'>[], estado?: EstadoPresentacion) => Promise<number>;
  setEstadoFacturacion: (ids: string[], estado: EstadoPresentacion) => Promise<void>;
  deleteFacturacion: (id: string) => Promise<void>;
  saveArea: (nombre: string, id?: string) => Promise<Area>;
  deleteArea: (id: string) => Promise<void>;

  importDatabase: (data: Partial<Database>, mode: ImportMode) => Promise<ImportSummary>;
  restoreDemoData: () => Promise<void>;
  clearAllData: () => Promise<void>;
}

const emptyDb: Database = { pacientes: [], evoluciones: [], talleres: [], facturacion: [], areas: [], medicaciones: [] };

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const repos = useMemo<Repositories>(() => createRepositories(), []);
  const [db, setDb] = useState<Database>(emptyDb);
  const [status, setStatus] = useState<DataContextValue['status']>('loading');
  const [error, setError] = useState<string>();
  const dbRef = useRef<Database>(emptyDb);
  const booted = useRef(false);

  const commit = useCallback((next: Database) => {
    dbRef.current = next;
    setDb(next);
  }, []);

  const loadAll = useCallback(async (): Promise<Database> => {
    const entries = await Promise.all(COLLECTION_KEYS.map(async (k) => [k, await repos[k].list()] as const));
    return normalizeDatabase(Object.fromEntries(entries) as unknown as Database);
  }, [repos]);

  const replaceCollections = useCallback(
    async (data: Partial<Database>) => {
      const normalized = normalizeDatabase({ ...dbRef.current, ...data });
      for (const key of COLLECTION_KEYS) {
        const items = data[key];
        if (items) await (repos[key] as { replaceAll(i: unknown[]): Promise<void> }).replaceAll(normalized[key]);
      }
      commit({ ...dbRef.current, ...Object.fromEntries(COLLECTION_KEYS.filter((k) => data[k]).map((k) => [k, normalized[k]])) });
    },
    [repos, commit],
  );

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    (async () => {
      try {
        if (!(await repos.isInitialized())) {
          const seed = buildSeed();
          for (const key of COLLECTION_KEYS) {
            await (repos[key] as { replaceAll(i: unknown[]): Promise<void> }).replaceAll(seed[key]);
          }
          await repos.markInitialized();
        }
        const loaded = await loadAll();
        // Persistir migración de esquema (campos nuevos / medicaciones).
        for (const key of COLLECTION_KEYS) {
          await (repos[key] as { replaceAll(i: unknown[]): Promise<void> }).replaceAll(loaded[key]);
        }
        // Si no hay áreas institucionales nuevas, sumarlas sin borrar las existentes.
        const seedAreas = buildSeed().areas;
        const missing = seedAreas.filter((a) => !loaded.areas.some((x) => x.id === a.id || x.nombre === a.nombre));
        if (missing.length) {
          const areas = [...loaded.areas, ...missing];
          await (repos.areas as { replaceAll(i: unknown[]): Promise<void> }).replaceAll(areas);
          loaded.areas = areas;
        }
        commit(loaded);
        setStatus('ready');
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setStatus('error');
      }
    })();
  }, [repos, commit, loadAll]);

  const upsert = useCallback(
    async <K extends CollectionKey>(key: K, item: Database[K][number]) => {
      await (repos[key] as { upsert(i: unknown): Promise<unknown> }).upsert(item);
      const list = dbRef.current[key] as { id: string }[];
      const exists = list.some((x) => x.id === item.id);
      commit({
        ...dbRef.current,
        [key]: exists ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item],
      });
      return item;
    },
    [repos, commit],
  );

  const remove = useCallback(
    async (key: CollectionKey, id: string) => {
      await repos[key].remove(id);
      commit({ ...dbRef.current, [key]: (dbRef.current[key] as { id: string }[]).filter((x) => x.id !== id) });
    },
    [repos, commit],
  );

  const savePaciente: DataContextValue['savePaciente'] = useCallback(
    (p) => {
      const id = p.id ?? nextPacienteId(dbRef.current.pacientes.map((x) => x.id));
      return upsert('pacientes', normalizePaciente({ ...p, id }));
    },
    [upsert],
  );

  const deletePaciente: DataContextValue['deletePaciente'] = useCallback(
    async (id) => {
      const cur = dbRef.current;
      await replaceCollections({
        pacientes: cur.pacientes.filter((p) => p.id !== id),
        evoluciones: cur.evoluciones.filter((e) => e.pacienteId !== id),
        facturacion: cur.facturacion.filter((f) => f.pacienteId !== id),
        medicaciones: cur.medicaciones.filter((m) => m.pacienteId !== id),
        talleres: cur.talleres.map((t) => (t.inscriptos.includes(id) ? { ...t, inscriptos: t.inscriptos.filter((x) => x !== id) } : t)),
      });
    },
    [replaceCollections],
  );

  const saveEvolucion: DataContextValue['saveEvolucion'] = useCallback(
    (e) => {
      const id = e.id ?? nextEvolucionId(dbRef.current.evoluciones.map((x) => x.id));
      const existing = e.id ? dbRef.current.evoluciones.find((x) => x.id === e.id) : undefined;
      // Si ya existía, preservar nota/objetivos/fecha originales y addendas (solo se editan campos menores vía addenda).
      const normalized = normalizeEvolucion({
        ...e,
        id,
        addendas: existing?.addendas ?? e.addendas ?? [],
        nota: existing?.nota ?? e.nota,
        objetivos: existing ? existing.objetivos : e.objetivos,
        fecha: existing?.fecha ?? e.fecha,
        hora: existing?.hora ?? e.hora,
      });
      return upsert('evoluciones', normalized);
    },
    [upsert],
  );

  const addEvolucionAddenda: DataContextValue['addEvolucionAddenda'] = useCallback(
    async (evolucionId, texto, profesional) => {
      const evo = dbRef.current.evoluciones.find((e) => e.id === evolucionId);
      if (!evo) throw new Error('No se encontró la evolución.');
      const ids = evo.addendas.map((a) => a.id);
      const addenda: EvolucionAddenda = {
        id: nextAddendaId(ids),
        fecha: todayISO(),
        hora: nowTime(),
        profesional: profesional.trim(),
        texto: texto.trim(),
      };
      return upsert('evoluciones', { ...evo, addendas: [...evo.addendas, addenda] });
    },
    [upsert],
  );

  const saveTaller: DataContextValue['saveTaller'] = useCallback(
    (t) => {
      const id = t.id ?? nextTallerId(dbRef.current.talleres.map((x) => x.id));
      return upsert('talleres', normalizeTaller({ ...t, id }));
    },
    [upsert],
  );

  const deleteTaller: DataContextValue['deleteTaller'] = useCallback(
    async (id) => {
      const cur = dbRef.current;
      await replaceCollections({
        talleres: cur.talleres.filter((t) => t.id !== id),
        evoluciones: cur.evoluciones.map((e) => (e.tallerId === id ? { ...e, tallerId: undefined } : e)),
      });
    },
    [replaceCollections],
  );

  const saveMedicacion: DataContextValue['saveMedicacion'] = useCallback(
    async (m, historialMotivo = 'Alta', historialDetalle = '') => {
      const id = m.id ?? nextMedicacionId(dbRef.current.medicaciones.map((x) => x.id));
      const existing = m.id ? dbRef.current.medicaciones.find((x) => x.id === m.id) : undefined;
      const base = normalizeMedicacion({ ...m, id, historial: existing?.historial ?? m.historial ?? [] });
      if (!existing) {
        base.historial = [
          {
            id: nextAddendaId([]),
            fecha: todayISO(),
            motivo: 'Alta',
            detalle: historialDetalle || 'Inicio de la medicación',
          },
        ];
      } else if (historialMotivo !== 'Alta' || historialDetalle) {
        base.historial = [
          ...base.historial,
          {
            id: nextAddendaId(base.historial.map((h) => h.id)),
            fecha: todayISO(),
            motivo: historialMotivo,
            detalle: historialDetalle || historialMotivo,
          },
        ];
      }
      return upsert('medicaciones', base);
    },
    [upsert],
  );

  const saveFacturacion: DataContextValue['saveFacturacion'] = useCallback(
    (f) => {
      const id = f.id ?? nextFacturacionId(dbRef.current.facturacion.map((x) => x.id), f.periodo);
      return upsert('facturacion', { ...f, id });
    },
    [upsert],
  );

  const saveFacturaciones: DataContextValue['saveFacturaciones'] = useCallback(
    async (items, estado = 'Pendiente') => {
      const all = [...dbRef.current.facturacion];
      const created: Facturacion[] = [];
      for (const item of items) {
        const [id] = nextFacturacionIds(all.map((x) => x.id), item.periodo, 1);
        const rec = { ...item, id, estado };
        all.push(rec);
        created.push(rec);
      }
      await replaceCollections({ facturacion: all });
      return created.length;
    },
    [replaceCollections],
  );

  const setEstadoFacturacion: DataContextValue['setEstadoFacturacion'] = useCallback(
    async (ids, estado) => {
      const set = new Set(ids);
      const changed = dbRef.current.facturacion.filter((f) => set.has(f.id) && f.estado !== estado);
      for (const f of changed) await upsert('facturacion', { ...f, estado });
    },
    [upsert],
  );

  const saveArea: DataContextValue['saveArea'] = useCallback(
    (nombre, id) => {
      const finalId = id ?? nextAreaId(dbRef.current.areas.map((a) => a.id));
      return upsert('areas', { id: finalId, nombre: nombre.trim() });
    },
    [upsert],
  );

  const deleteArea: DataContextValue['deleteArea'] = useCallback(
    async (id) => {
      const uses = dbRef.current.evoluciones.filter((e) => e.areaId === id).length;
      if (uses > 0) {
        throw new Error(`No se puede eliminar: hay ${uses} evoluciones registradas en esta área. Podés renombrarla en su lugar.`);
      }
      await remove('areas', id);
    },
    [remove],
  );

  const importDatabase: DataContextValue['importDatabase'] = useCallback(
    async (data, mode) => {
      const summary: ImportSummary = {};
      const next: Partial<Database> = {};
      for (const key of COLLECTION_KEYS) {
        const incoming = data[key] as { id: string }[] | undefined;
        if (!incoming) continue;
        summary[key] = incoming.length;
        if (mode === 'replace') {
          (next as Record<string, unknown>)[key] = incoming;
        } else {
          const merged = new Map((dbRef.current[key] as { id: string }[]).map((x) => [x.id, x]));
          for (const item of incoming) merged.set(item.id, item);
          (next as Record<string, unknown>)[key] = [...merged.values()];
        }
      }
      await replaceCollections(next);
      return summary;
    },
    [replaceCollections],
  );

  const restoreDemoData = useCallback(async () => {
    await replaceCollections(buildSeed());
  }, [replaceCollections]);

  const clearAllData = useCallback(async () => {
    await replaceCollections({ ...emptyDb, areas: dbRef.current.areas });
  }, [replaceCollections]);

  const indexes = useMemo(() => {
    const pacientes = new Map(db.pacientes.map((p) => [p.id, p]));
    const areas = new Map(db.areas.map((a) => [a.id, a]));
    const talleres = new Map(db.talleres.map((t) => [t.id, t]));
    return { pacientes, areas, talleres };
  }, [db]);

  const value = useMemo<DataContextValue>(
    () => ({
      status,
      error,
      storage: { label: repos.label, kind: repos.kind },
      db,
      pacienteById: (id) => indexes.pacientes.get(id),
      areaById: (id) => indexes.areas.get(id),
      tallerById: (id) => indexes.talleres.get(id),
      savePaciente,
      deletePaciente,
      saveEvolucion,
      addEvolucionAddenda,
      deleteEvolucion: (id) => remove('evoluciones', id),
      saveTaller,
      deleteTaller,
      saveMedicacion,
      deleteMedicacion: (id) => remove('medicaciones', id),
      saveFacturacion,
      saveFacturaciones,
      setEstadoFacturacion,
      deleteFacturacion: (id) => remove('facturacion', id),
      saveArea,
      deleteArea,
      importDatabase,
      restoreDemoData,
      clearAllData,
    }),
    [
      status, error, repos, db, indexes, savePaciente, deletePaciente, saveEvolucion, addEvolucionAddenda, remove,
      saveTaller, deleteTaller, saveMedicacion, saveFacturacion, saveFacturaciones, setEstadoFacturacion,
      saveArea, deleteArea, importDatabase, restoreDemoData, clearAllData,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData debe usarse dentro de <DataProvider>');
  return ctx;
}
