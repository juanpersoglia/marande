import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardList, ClipboardPlus, Settings2 } from 'lucide-react';
import { Button, Card, EmptyState, PageHeader, SearchInput, Select } from '@/components/ui';
import { useFeedback } from '@/components/feedback';
import { AreasModal } from '@/features/evoluciones/AreasModal';
import { EvolucionFormModal } from '@/features/evoluciones/EvolucionForm';
import { EvolucionItem } from '@/features/evoluciones/EvolucionItem';
import { downloadFile } from '@/lib/csv';
import { currentPeriod, formatPeriod, normalizeText } from '@/lib/format';
import { CSV_LABELS, exportCollectionCSV } from '@/services/dataTransfer';
import { sortEvolucionesDesc } from '@/services/domain';
import { listarProfesionales } from '@/services/queries';
import { useData } from '@/store/DataContext';
import { MODALIDADES, type Modalidad } from '@/types';

export default function EvolucionesPage() {
  const { db, deleteEvolucion } = useData();
  const { toast, toastError, confirm } = useFeedback();
  const [params, setParams] = useSearchParams();
  const [nueva, setNueva] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [areasOpen, setAreasOpen] = useState(false);

  const q = params.get('q') ?? '';
  const pacienteId = params.get('paciente') ?? '';
  const areaId = params.get('area') ?? '';
  const profesional = params.get('profesional') ?? '';
  const modalidad = (params.get('modalidad') as Modalidad | '') || '';
  const periodo = params.get('periodo') ?? '';

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (!value) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const profesionales = useMemo(() => listarProfesionales(db), [db]);
  const periodos = useMemo(() => {
    const setP = new Set(db.evoluciones.map((e) => e.fecha.slice(0, 7)));
    setP.add(currentPeriod());
    return [...setP].sort().reverse();
  }, [db.evoluciones]);

  const list = useMemo(() => {
    const query = normalizeText(q.trim());
    return sortEvolucionesDesc(db.evoluciones).filter((e) => {
      if (pacienteId && e.pacienteId !== pacienteId) return false;
      if (areaId && e.areaId !== areaId) return false;
      if (profesional && e.profesional !== profesional) return false;
      if (modalidad && e.modalidad !== modalidad) return false;
      if (periodo && !e.fecha.startsWith(periodo)) return false;
      if (!query) return true;
      const paciente = db.pacientes.find((p) => p.id === e.pacienteId);
      const area = db.areas.find((a) => a.id === e.areaId);
      return (
        normalizeText(e.nota).includes(query) ||
        normalizeText(e.objetivos).includes(query) ||
        normalizeText(e.profesional).includes(query) ||
        normalizeText(paciente?.nombre ?? '').includes(query) ||
        normalizeText(area?.nombre ?? '').includes(query) ||
        e.pacienteId.toLowerCase().includes(query)
      );
    });
  }, [db, q, pacienteId, areaId, profesional, modalidad, periodo]);

  const editEvo = editId ? db.evoluciones.find((e) => e.id === editId) : undefined;

  const remove = async (id: string) => {
    const ok = await confirm({ title: 'Eliminar evolución', message: '¿Eliminar esta nota de sesión?', confirmLabel: 'Eliminar' });
    if (!ok) return;
    try {
      await deleteEvolucion(id);
      toast('Evolución eliminada.');
    } catch (err) {
      toastError(err);
    }
  };

  const exportCsv = () => {
    downloadFile(`evoluciones-${periodo || 'todas'}.csv`, exportCollectionCSV('evoluciones', db, { evoluciones: list }));
    toast(`Exportadas ${list.length} evoluciones (CSV).`, 'info');
  };

  return (
    <>
      <PageHeader
        title="Evoluciones"
        description="Registro clínico multidisciplinario. Filtrá por paciente, área, profesional o modalidad."
        actions={
          <>
            <Button variant="secondary" onClick={() => setAreasOpen(true)}><Settings2 className="size-4" />Áreas</Button>
            <Button variant="secondary" onClick={exportCsv}>Exportar CSV</Button>
            <Button onClick={() => setNueva(true)}><ClipboardPlus className="size-4" />Nueva evolución</Button>
          </>
        }
      />

      <Card className="mb-4 p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <SearchInput className="md:col-span-2 xl:col-span-3" value={q} onChange={(v) => set('q', v)} placeholder="Buscar en notas, objetivos, paciente o profesional..." />
          <Select value={pacienteId} onChange={(e) => set('paciente', e.target.value)} aria-label="Paciente">
            <option value="">Todos los pacientes</option>
            {[...db.pacientes].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')).map((p) => (
              <option key={p.id} value={p.id}>{p.nombre} ({p.id})</option>
            ))}
          </Select>
          <Select value={areaId} onChange={(e) => set('area', e.target.value)} aria-label="Área">
            <option value="">Todas las áreas</option>
            {db.areas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </Select>
          <Select value={profesional} onChange={(e) => set('profesional', e.target.value)} aria-label="Profesional">
            <option value="">Todos los profesionales</option>
            {profesionales.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
          <Select value={modalidad} onChange={(e) => set('modalidad', e.target.value)} aria-label="Modalidad">
            <option value="">Todas las modalidades</option>
            {MODALIDADES.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
          <Select value={periodo} onChange={(e) => set('periodo', e.target.value)} aria-label="Período">
            <option value="">Todos los meses</option>
            {periodos.map((p) => <option key={p} value={p}>{formatPeriod(p)}</option>)}
          </Select>
        </div>
        <p className="mt-3 text-sm text-slate-500">{list.length} {list.length === 1 ? 'evolución' : 'evoluciones'} · {CSV_LABELS.evoluciones}</p>
      </Card>

      <div className="space-y-3">
        {list.length === 0 ? (
          <Card>
            <EmptyState
              icon={<ClipboardList className="size-6" />}
              title="Sin evoluciones"
              description="No hay registros con estos filtros. Probá ampliar la búsqueda o cargá una nueva."
              action={<Button onClick={() => setNueva(true)}><ClipboardPlus className="size-4" />Nueva evolución</Button>}
            />
          </Card>
        ) : (
          list.map((e) => (
            <EvolucionItem key={e.id} evolucion={e} onEdit={() => setEditId(e.id)} onDelete={() => remove(e.id)} />
          ))
        )}
      </div>

      <EvolucionFormModal open={nueva} onClose={() => setNueva(false)} defaultPacienteId={pacienteId || undefined} />
      <EvolucionFormModal open={!!editEvo} onClose={() => setEditId(null)} evolucion={editEvo} />
      <AreasModal open={areasOpen} onClose={() => setAreasOpen(false)} />
    </>
  );
}
