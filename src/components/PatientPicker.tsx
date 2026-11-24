import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { cn, formatDNI, normalizeText } from '@/lib/format';
import type { Paciente } from '@/types';

interface Props {
  id?: string;
  value: string;
  onChange: (id: string) => void;
  patients: Paciente[];
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
  allowClear?: boolean;
}

/** Buscador de pacientes por nombre, DNI o ID (pensado para cargar rápido en consulta). */
export function PatientPicker({ id, value, onChange, patients, placeholder = 'Buscar por nombre, DNI o ID...', invalid, disabled, allowClear }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const selected = patients.find((p) => p.id === value);

  const results = useMemo(() => {
    const q = normalizeText(query.trim());
    const list = q
      ? patients.filter((p) => normalizeText(p.nombre).includes(q) || p.dni.includes(q.replace(/\./g, '')) || p.id.toLowerCase().includes(q))
      : patients;
    return list.slice(0, 50);
  }, [patients, query]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const choose = (p: Paciente) => {
    onChange(p.id);
    setQuery('');
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-invalid={invalid || undefined}
        autoComplete="off"
        disabled={disabled}
        className={cn('field-control pr-16', selected && !open && 'font-medium')}
        placeholder={selected ? '' : placeholder}
        value={open ? query : selected ? `${selected.id} · ${selected.nombre}` : ''}
        onFocus={() => {
          setOpen(true);
          setActive(0);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, results.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === 'Enter' && open && results[active]) {
            e.preventDefault();
            choose(results[active]);
          } else if (e.key === 'Escape') setOpen(false);
        }}
      />
      <div className="absolute inset-y-0 right-2 flex items-center gap-1">
        {allowClear && selected && !disabled && (
          <button type="button" aria-label="Quitar paciente" className="rounded p-1 text-slate-400 hover:text-slate-700" onClick={() => onChange('')}>
            <X className="size-4" />
          </button>
        )}
        <ChevronDown className="pointer-events-none size-4 text-slate-400" />
      </div>
      {open && (
        <ul role="listbox" className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {results.length === 0 && <li className="px-3 py-3 text-sm text-slate-500">No se encontraron pacientes.</li>}
          {results.map((p, i) => (
            <li key={p.id} role="option" aria-selected={p.id === value}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(p)}
                className={cn('flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm', i === active ? 'bg-brand-50' : 'hover:bg-slate-50')}
              >
                <span>
                  <span className="font-medium text-slate-900">{p.nombre}</span>
                  <span className="ml-2 text-xs text-slate-500">DNI {formatDNI(p.dni)}</span>
                </span>
                <span className="text-xs text-slate-400">{p.id}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
