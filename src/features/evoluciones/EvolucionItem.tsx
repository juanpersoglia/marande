import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquarePlus, Trash2, User } from 'lucide-react';
import { Badge, Button, IconButton, Textarea } from '@/components/ui';
import { ModalidadBadge } from '@/components/badges';
import { useFeedback } from '@/components/feedback';
import { formatDate } from '@/lib/format';
import { useData } from '@/store/DataContext';
import type { Evolucion } from '@/types';

interface Props {
  evolucion: Evolucion;
  showPaciente?: boolean;
  onDelete?: (e: Evolucion) => void;
}

export function EvolucionItem({ evolucion: e, showPaciente = true, onDelete }: Props) {
  const { pacienteById, areaById, tallerById, addEvolucionAddenda } = useData();
  const { toast, toastError } = useFeedback();
  const [addendaOpen, setAddendaOpen] = useState(false);
  const [texto, setTexto] = useState('');
  const [profesional, setProfesional] = useState(e.profesional);
  const [saving, setSaving] = useState(false);

  const paciente = pacienteById(e.pacienteId);
  const area = areaById(e.areaId);
  const taller = e.tallerId ? tallerById(e.tallerId) : undefined;

  const saveAddenda = async () => {
    if (!texto.trim()) return toast('Escribí el texto de la adenda.', 'error');
    setSaving(true);
    try {
      await addEvolucionAddenda(e.id, texto, profesional || e.profesional);
      toast('Adenda agregada.');
      setTexto('');
      setAddendaOpen(false);
    } catch (err) {
      toastError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="text-sm font-semibold text-slate-900">{formatDate(e.fecha)} · {e.hora} hs</span>
          <Badge tone="brand">{area?.nombre ?? 'Área eliminada'}</Badge>
          <ModalidadBadge modalidad={e.modalidad} />
          {taller && <Badge tone="neutral">{taller.nombre}</Badge>}
        </div>
        <div className="no-print -mt-1 -mr-1 flex gap-0.5">
          <IconButton label="Agregar adenda" onClick={() => setAddendaOpen(true)}><MessageSquarePlus className="size-4" /></IconButton>
          {onDelete && <IconButton label="Eliminar evolución" onClick={() => onDelete(e)} className="hover:text-red-600"><Trash2 className="size-4" /></IconButton>}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
        {showPaciente && (
          <Link to={`/pacientes/${e.pacienteId}`} className="font-medium text-brand-700 hover:underline">
            {paciente?.nombre ?? e.pacienteId} <span className="font-normal text-slate-400">({e.pacienteId})</span>
          </Link>
        )}
        <span className="inline-flex items-center gap-1"><User className="size-3.5" />{e.profesional || 'Sin profesional'}</span>
      </div>

      <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-slate-700">{e.nota}</p>
      {e.objetivos && (
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
          <span className="font-semibold text-slate-700">Objetivos: </span>
          {e.objetivos}
        </p>
      )}

      {e.addendas.length > 0 && (
        <ul className="mt-3 space-y-2 border-t border-slate-100 pt-3">
          <li className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Adendas</li>
          {e.addendas.map((a) => (
            <li key={a.id} className="rounded-lg bg-amber-50/80 px-3 py-2 text-sm text-slate-700">
              <p className="text-xs text-slate-500">{formatDate(a.fecha)} · {a.hora} · {a.profesional}</p>
              <p className="mt-1 whitespace-pre-line">{a.texto}</p>
            </li>
          ))}
        </ul>
      )}

      {addendaOpen && (
        <div className="no-print mt-3 space-y-2 rounded-lg border border-brand-200 bg-brand-50/50 p-3">
          <p className="text-sm font-medium text-brand-900">Nueva adenda (la nota original no se modifica)</p>
          <input
            className="field-control"
            value={profesional}
            onChange={(ev) => setProfesional(ev.target.value)}
            placeholder="Profesional que firma"
            aria-label="Profesional"
          />
          <Textarea rows={3} value={texto} onChange={(ev) => setTexto(ev.target.value)} placeholder="Texto de la adenda..." />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setAddendaOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={saveAddenda} disabled={saving}>{saving ? 'Guardando...' : 'Guardar adenda'}</Button>
          </div>
        </div>
      )}
    </article>
  );
}
