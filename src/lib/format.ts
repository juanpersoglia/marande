const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const pad = (n: number, len = 2) => String(n).padStart(len, '0');

/** Fecha local de hoy como "YYYY-MM-DD" (sin desfasajes por UTC). */
export function todayISO(date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function nowTime(date = new Date()): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function currentPeriod(date = new Date()): string {
  return todayISO(date).slice(0, 7);
}

/** Interpreta "YYYY-MM-DD" como fecha local (mediodía para evitar saltos por horario de verano). */
export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12);
}

export function addDays(iso: string, days: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + days);
  return todayISO(d);
}

export function daysUntil(iso: string, from = todayISO()): number {
  return Math.round((parseISO(iso).getTime() - parseISO(from).getTime()) / 86_400_000);
}

export function formatDate(iso?: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function formatDateLong(iso: string): string {
  const d = parseISO(iso);
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()].toLowerCase()} de ${d.getFullYear()}`;
}

export function formatPeriod(periodo: string): string {
  const [y, m] = periodo.split('-').map(Number);
  return `${MESES[(m || 1) - 1]} ${y}`;
}

export function shiftPeriod(periodo: string, delta: number): string {
  const [y, m] = periodo.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

const currencyFmt = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});
export const formatCurrency = (n: number) => currencyFmt.format(Math.round(n));

const numberFmt = new Intl.NumberFormat('es-AR');
export const formatNumber = (n: number) => numberFmt.format(n);

export function formatDNI(dni: string): string {
  const digits = dni.replace(/\D/g, '');
  return digits ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '—';
}

/** Edad calculada: "11 años", o "1 año y 8 meses" para menores de 3 años. */
export function formatAge(fechaNacimiento: string, today = todayISO()): string {
  if (!fechaNacimiento) return '—';
  const b = parseISO(fechaNacimiento);
  const t = parseISO(today);
  let years = t.getFullYear() - b.getFullYear();
  let months = t.getMonth() - b.getMonth();
  if (t.getDate() < b.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0) return '—';
  if (years < 3) {
    const total = years * 12 + months;
    return total < 12 ? `${total} ${total === 1 ? 'mes' : 'meses'}` : `${years} ${years === 1 ? 'año' : 'años'}${months ? ` y ${months} ${months === 1 ? 'mes' : 'meses'}` : ''}`;
  }
  return `${years} años`;
}

export function initials(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export function normalizeText(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

export function pluralize(n: number, singular: string, plural: string): string {
  return `${formatNumber(n)} ${n === 1 ? singular : plural}`;
}
