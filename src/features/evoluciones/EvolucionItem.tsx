import { Link } from 'react-router-dom';
import { Pencil, Trash2, User } from 'lucide-react';
import { Badge, IconButton } from '@/components/ui';
import { ModalidadBadge } from '@/components/badges';
import { formatDate } from '@/lib/format';
import { useData } from '@/store/DataContext';
import type { Evolucion } from '@/types';

interface Props {
  evolucion: Evolucion;
  showPaciente?: boolean;
  onEdit?: (e: Evolucion) => void;
  onDelete?: (e: Evolucion) => void;
}

export function EvolucionItem({ evolucion: e, showPaciente = true, onEdit, onDelete }: Props) {
  const { pacienteById, areaById, tallerById } = useData();
  const paciente = pacienteById(e.pacienteId);
  const area = areaById(e.areaId);
  const taller = e.tallerId ? tallerById(e.tallerId) : undefined;

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="text-sm font-semibold text-slate-900">{formatDate(e.fecha)} · {e.hora} hs</span>
          <Badge tone="brand">{area?.nombre ?? 'Área eliminada'}</Badge>
          <ModalidadBadge modalidad={e.modalidad} />
          {taller && <Badge tone="neutral">{taller.nombre}</Badge>}
        </div>
        {(onEdit || onDelete) && (
          <div className="no-print -mt-1 -mr-1 flex gap-0.5">
            {onEdit && <IconButton label="Editar evolución" onClick={() => onEdit(e)}><Pencil className="size-4" /></IconButton>}
            {onDelete && <IconButton label="Eliminar evolución" onClick={() => onDelete(e)} className="hover:text-red-600"><Trash2 className="size-4" /></IconButton>}
          </div>
        )}
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
    </article>
  );
}
