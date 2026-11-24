import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRight, UserPlus, Users } from 'lucide-react';
import { Button, Card, EmptyState, PageHeader, SearchInput, Select, TableWrap } from '@/components/ui';
import { CudBadge, EstadoPacienteBadge, TipoCoberturaBadge } from '@/components/badges';
import { PacienteFormModal } from '@/features/pacientes/PacienteForm';
import { formatAge, formatDNI, initials, normalizeText } from '@/lib/format';
import { cudRequiereAtencion } from '@/services/domain';
import { coberturasDisponibles } from '@/services/queries';
import { useData } from '@/store/DataContext';
import { ESTADOS_PACIENTE, TIPOS_COBERTURA, type EstadoPaciente, type TipoCobertura } from '@/types';

type EstadoFilter = 'Todos' | EstadoPaciente;
type TipoFilter = 'Todos' | TipoCobertura;

export default function PacientesPage() {
  const { db } = useData();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [nuevo, setNuevo] = useState(false);

  const q = params.get('q') ?? '';
  const estado = (params.get('estado') as EstadoFilter) || 'Todos';
  const tipo = (params.get('tipo') as TipoFilter) || 'Todos';
  const cobertura = params.get('cobertura') ?? '';
  const cudAlerta = params.get('cud') === 'alerta';

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (!value || value === 'Todos') next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const coberturas = useMemo(() => coberturasDisponibles(db), [db]);

  const list = useMemo(() => {
    const query = normalizeText(q.trim());
    return [...db.pacientes]
      .filter((p) => {
        if (estado !== 'Todos' && p.estado !== estado) return false;
        if (tipo !== 'Todos' && p.tipoCobertura !== tipo) return false;
        if (cobertura && p.cobertura !== cobertura) return false;
        if (cudAlerta && !cudRequiereAtencion(p)) return false;
        if (!query) return true;
        return (
          normalizeText(p.nombre).includes(query) ||
          p.dni.includes(query.replace(/\./g, '')) ||
          normalizeText(p.diagnostico).includes(query) ||
          normalizeText(p.id).includes(query) ||
          normalizeText(p.cobertura).includes(query)
        );
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [db.pacientes, q, estado, tipo, cobertura, cudAlerta]);

  return (
    <>
      <PageHeader
        title="Pacientes"
        description="Legajos clínicos. Buscá por nombre, DNI o diagnóstico y filtrá por cobertura o estado."
        actions={<Button onClick={() => setNuevo(true)}><UserPlus className="size-4" />Nuevo paciente</Button>}
      />

      <Card className="mb-4 p-3 sm:p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <SearchInput className="md:col-span-2 xl:col-span-2" value={q} onChange={(v) => set('q', v)} placeholder="Buscar por nombre, DNI, diagnóstico o ID..." />
          <Select value={estado} onChange={(e) => set('estado', e.target.value)} aria-label="Estado">
            <option value="Todos">Todos los estados</option>
            {ESTADOS_PACIENTE.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Select value={tipo} onChange={(e) => set('tipo', e.target.value)} aria-label="Tipo de cobertura">
            <option value="Todos">Todas las modalidades</option>
            {TIPOS_COBERTURA.map((t) => <option key={t} value={t}>{t === 'Obra Social' ? 'Obras Sociales' : t === 'Prepaga' ? 'Prepagas' : 'Particular'}</option>)}
          </Select>
          <Select value={cobertura} onChange={(e) => set('cobertura', e.target.value)} aria-label="Cobertura">
            <option value="">Todas las coberturas</option>
            {coberturas.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <span>{list.length} {list.length === 1 ? 'paciente' : 'pacientes'}</span>
          {cudAlerta && (
            <button type="button" onClick={() => set('cud', '')} className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200 hover:bg-amber-100">
              CUD en alerta · quitar filtro
            </button>
          )}
        </div>
      </Card>

      {list.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users className="size-6" />}
            title="Sin resultados"
            description={db.pacientes.length === 0 ? 'Todavía no hay pacientes cargados.' : 'Probá otro criterio de búsqueda o filtro.'}
            action={<Button onClick={() => setNuevo(true)}><UserPlus className="size-4" />Nuevo paciente</Button>}
          />
        </Card>
      ) : (
        <>
          {/* Cards en móvil / tablet chica */}
          <ul className="space-y-3 md:hidden">
            {list.map((p) => (
              <li key={p.id}>
                <Link
                  to={`/pacientes/${p.id}`}
                  className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs active:bg-brand-50/50"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-800">
                    {initials(p.nombre)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-slate-900">{p.nombre}</span>
                      <EstadoPacienteBadge estado={p.estado} />
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">{p.id} · DNI {formatDNI(p.dni)} · {formatAge(p.fechaNacimiento)}</span>
                    <span className="mt-2 block truncate text-sm text-slate-700">{p.diagnostico || 'Sin diagnóstico'}</span>
                    <span className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-medium text-slate-800">{p.cobertura}</span>
                      <TipoCoberturaBadge tipo={p.tipoCobertura} />
                      <CudBadge paciente={p} />
                    </span>
                  </span>
                  <ChevronRight className="mt-1 size-5 shrink-0 text-slate-300" />
                </Link>
              </li>
            ))}
          </ul>

          {/* Tabla en desktop */}
          <Card className="hidden md:block">
            <TableWrap>
              <table className="min-w-full">
                <thead className="border-b border-slate-100 bg-slate-50/80">
                  <tr>
                    <th className="th">Paciente</th>
                    <th className="th">DNI</th>
                    <th className="th">Diagnóstico / CUD</th>
                    <th className="th">Cobertura</th>
                    <th className="th">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {list.map((p) => (
                    <tr key={p.id} className="cursor-pointer hover:bg-brand-50/40" onClick={() => navigate(`/pacientes/${p.id}`)}>
                      <td className="td">
                        <Link to={`/pacientes/${p.id}`} className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-800">
                            {initials(p.nombre)}
                          </span>
                          <span>
                            <span className="block font-medium text-slate-900">{p.nombre}</span>
                            <span className="block text-xs text-slate-500">{p.id} · {formatAge(p.fechaNacimiento)}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="td text-slate-700">{formatDNI(p.dni)}</td>
                      <td className="td">
                        <p className="max-w-xs truncate text-slate-700" title={p.diagnostico}>{p.diagnostico || '—'}</p>
                        <div className="mt-1"><CudBadge paciente={p} /></div>
                      </td>
                      <td className="td">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-slate-800">{p.cobertura}</span>
                          <TipoCoberturaBadge tipo={p.tipoCobertura} />
                        </div>
                      </td>
                      <td className="td"><EstadoPacienteBadge estado={p.estado} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          </Card>
        </>
      )}

      <PacienteFormModal open={nuevo} onClose={() => setNuevo(false)} onSaved={(p) => navigate(`/pacientes/${p.id}`)} />
    </>
  );
}
