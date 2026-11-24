import { CalendarClock, CircleAlert, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { estadoCUD } from '@/services/domain';
import type { EstadoPaciente, EstadoPresentacion, Modalidad, Paciente, TipoCobertura } from '@/types';

export function EstadoPacienteBadge({ estado }: { estado: EstadoPaciente }) {
  return <Badge tone={estado === 'Activo' ? 'success' : 'neutral'}>{estado}</Badge>;
}

export function PresentacionBadge({ estado }: { estado: EstadoPresentacion }) {
  const tone = estado === 'Liquidado' ? 'success' : estado === 'Presentado' ? 'info' : 'warning';
  return <Badge tone={tone}>{estado}</Badge>;
}

export function ModalidadBadge({ modalidad }: { modalidad: Modalidad }) {
  return <Badge tone={modalidad === 'Taller' ? 'brand' : 'neutral'}>{modalidad}</Badge>;
}

export function TipoCoberturaBadge({ tipo }: { tipo: TipoCobertura }) {
  return <Badge tone={tipo === 'Particular' ? 'warning' : tipo === 'Prepaga' ? 'info' : 'neutral'}>{tipo}</Badge>;
}

export function CudBadge({ paciente, showDate = true }: { paciente: Pick<Paciente, 'vencimientoCUD' | 'nroCUD'>; showDate?: boolean }) {
  const e = estadoCUD(paciente);
  const date = showDate && paciente.vencimientoCUD ? ` · ${formatDate(paciente.vencimientoCUD)}` : '';
  switch (e.nivel) {
    case 'vencido':
      return <Badge tone="danger"><CircleAlert className="size-3.5" />{e.texto}{date}</Badge>;
    case 'critico':
      return <Badge tone="danger"><CalendarClock className="size-3.5" />{e.texto}{date}</Badge>;
    case 'por-vencer':
      return <Badge tone="warning"><CalendarClock className="size-3.5" />{e.texto}{date}</Badge>;
    case 'vigente':
      return <Badge tone="success"><ShieldCheck className="size-3.5" />{e.texto}{date}</Badge>;
    default:
      return <Badge tone="neutral">{e.texto}</Badge>;
  }
}
