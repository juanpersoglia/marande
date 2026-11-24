import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Copy, Download, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react';
import { Button, Card, EmptyState, IconButton, PageHeader, SearchInput, Select, StatCard, TableWrap } from '@/components/ui';
import { PresentacionBadge } from '@/components/badges';
import { useFeedback } from '@/components/feedback';
import { FacturacionFormModal } from '@/features/facturacion/FacturacionForm';
import { downloadFile } from '@/lib/csv';
import { currentPeriod, formatCurrency, formatNumber, formatPeriod, normalizeText, pluralize } from '@/lib/format';
import { exportCollectionCSV } from '@/services/dataTransfer';
import { borradoresDesdeEvoluciones, sumTotals, totalFacturar } from '@/services/domain';
import { coberturasDisponibles, periodosDisponibles } from '@/services/queries';
import { useData } from '@/store/DataContext';
import { ESTADOS_PRESENTACION, type EstadoPresentacion, type Facturacion } from '@/types';

export default function FacturacionPage() {
  const { db, saveFacturaciones, setEstadoFacturacion, deleteFacturacion } = useData();
  const { toast, toastError, confirm } = useFeedback();
  const [params, setParams] = useSearchParams();
  const [nuevo, setNuevo] = useState(false);
  const [edit, setEdit] = useState<Facturacion | undefined>();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);

  const periodo = params.get('periodo') ?? currentPeriod();
  const cobertura = params.get('cobertura') ?? '';
  const estado = (params.get('estado') as EstadoPresentacion | '') || '';
  const q = params.get('q') ?? '';
  const anteriores = params.get('anteriores') === '1';

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (!value) next.delete(key);
    else next.set(key, value);
    if (key !== 'anteriores') next.delete('anteriores');
    setParams(next, { replace: true });
  };

  const periodos = useMemo(() => periodosDisponibles(db), [db]);
  const coberturas = useMemo(() => coberturasDisponibles(db), [db]);

  const list = useMemo(() => {
    const query = normalizeText(q.trim());
    const mesActual = currentPeriod();
    return [...db.facturacion]
      .filter((f) => {
        if (anteriores) {
          if (!(f.periodo < mesActual && f.estado === 'Pendiente')) return false;
        } else {
          if (periodo && f.periodo !== periodo) return false;
          if (estado && f.estado !== estado) return false;
        }
        if (cobertura && f.cobertura !== cobertura) return false;
        if (!query) return true;
        const paciente = db.pacientes.find((p) => p.id === f.pacienteId);
        return (
          normalizeText(f.id).includes(query) ||
          normalizeText(f.practica).includes(query) ||
          normalizeText(f.cobertura).includes(query) ||
          normalizeText(paciente?.nombre ?? '').includes(query) ||
          f.pacienteId.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => b.periodo.localeCompare(a.periodo) || a.cobertura.localeCompare(b.cobertura) || a.id.localeCompare(b.id));
  }, [db, periodo, cobertura, estado, q, anteriores]);

  const totales = useMemo(() => sumTotals(list), [list]);
  const allSelected = list.length > 0 && list.every((f) => selected.has(f.id));

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(list.map((f) => f.id)));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const changeEstado = async (nuevoEstado: EstadoPresentacion) => {
    const ids = [...selected];
    if (ids.length === 0) return toast('Seleccioná al menos un registro.', 'info');
    try {
      await setEstadoFacturacion(ids, nuevoEstado);
      toast(`${pluralize(ids.length, 'registro marcado', 'registros marcados')} como ${nuevoEstado}.`);
      setSelected(new Set());
    } catch (err) {
      toastError(err);
    }
  };

  const remove = async (f: Facturacion) => {
    const ok = await confirm({ title: 'Eliminar registro', message: `¿Eliminar ${f.id}?`, confirmLabel: 'Eliminar' });
    if (!ok) return;
    try {
      await deleteFacturacion(f.id);
      toast('Registro eliminado.');
      setSelected((s) => {
        const n = new Set(s);
        n.delete(f.id);
        return n;
      });
    } catch (err) {
      toastError(err);
    }
  };

  const generarDesdeEvoluciones = async () => {
    const borradores = borradoresDesdeEvoluciones(db, periodo);
    if (borradores.length === 0) {
      toast('No hay sesiones nuevas para liquidar en este período (o ya están cargadas).', 'info');
      return;
    }
    const ok = await confirm({
      title: 'Generar desde evoluciones',
      message: <>Se crearán <strong>{borradores.length}</strong> registros pendientes para {formatPeriod(periodo)}, calculados a partir de las evoluciones del mes.</>,
      confirmLabel: 'Generar',
      tone: 'primary',
    });
    if (!ok) return;
    setGenerating(true);
    try {
      const n = await saveFacturaciones(borradores, 'Pendiente');
      toast(`Se generaron ${n} registros de facturación.`);
    } catch (err) {
      toastError(err);
    } finally {
      setGenerating(false);
    }
  };

  const exportCsv = () => {
    downloadFile(`facturacion-${periodo || 'filtrada'}.csv`, exportCollectionCSV('facturacion', db, { facturacion: list }));
    toast(`Planilla descargada (${list.length} registros).`, 'info');
  };

  const copyResumen = async () => {
    const lines = [
      `Facturación · ${anteriores ? 'Pendientes de meses anteriores' : formatPeriod(periodo)}`,
      `Registros: ${list.length} · Sesiones: ${totales.sesiones} · Total: ${formatCurrency(totales.total)}`,
      `Pendiente: ${formatCurrency(totales.porEstado.Pendiente)} · Presentado: ${formatCurrency(totales.porEstado.Presentado)} · Liquidado: ${formatCurrency(totales.porEstado.Liquidado)}`,
      '',
      ...list.map((f) => {
        const p = db.pacientes.find((x) => x.id === f.pacienteId);
        return `${f.id}; ${f.periodo}; ${f.cobertura}; ${p?.nombre ?? f.pacienteId}; ${f.practica}; ${f.sesiones}; ${totalFacturar(f)}; ${f.estado}`;
      }),
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      toast('Resumen copiado al portapapeles.');
    } catch {
      toast('No se pudo copiar al portapapeles.', 'error');
    }
  };

  return (
    <>
      <PageHeader
        title="Facturación"
        description="Obras sociales y liquidación de prestaciones. Generá desde evoluciones, filtrá y exportá el resumen."
        actions={
          <>
            <Button variant="secondary" onClick={generarDesdeEvoluciones} disabled={generating}>
              <Sparkles className="size-4" />{generating ? 'Generando...' : 'Desde evoluciones'}
            </Button>
            <Button onClick={() => setNuevo(true)}><Plus className="size-4" />Nuevo registro</Button>
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Total filtrado" value={formatCurrency(totales.total)} icon={<span className="text-lg font-bold">$</span>} hint={`${formatNumber(list.length)} registros · ${totales.sesiones} sesiones`} />
        <StatCard label="Pendiente" value={formatCurrency(totales.porEstado.Pendiente)} tone="amber" icon={<span className="text-sm font-bold">P</span>} hint={`${totales.cantidadPorEstado.Pendiente} registros`} />
        <StatCard label="Presentado" value={formatCurrency(totales.porEstado.Presentado)} tone="sky" icon={<span className="text-sm font-bold">Pr</span>} hint={`${totales.cantidadPorEstado.Presentado} registros`} />
        <StatCard label="Liquidado" value={formatCurrency(totales.porEstado.Liquidado)} tone="emerald" icon={<span className="text-sm font-bold">L</span>} hint={`${totales.cantidadPorEstado.Liquidado} registros`} />
      </div>

      <Card className="mb-4 p-3 sm:p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <SearchInput className="md:col-span-2 xl:col-span-2" value={q} onChange={(v) => set('q', v)} placeholder="Buscar por paciente, práctica, cobertura o ID..." />
          <Select value={anteriores ? '' : periodo} onChange={(e) => set('periodo', e.target.value)} aria-label="Período" disabled={anteriores}>
            {periodos.map((p) => <option key={p} value={p}>{formatPeriod(p)}</option>)}
          </Select>
          <Select value={cobertura} onChange={(e) => set('cobertura', e.target.value)} aria-label="Cobertura">
            <option value="">Todas las coberturas</option>
            {coberturas.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select value={anteriores ? 'Pendiente' : estado} onChange={(e) => set('estado', e.target.value)} aria-label="Estado" disabled={anteriores}>
            <option value="">Todos los estados</option>
            {ESTADOS_PRESENTACION.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={exportCsv}><Download className="size-3.5" />Descargar planilla</Button>
            <Button size="sm" variant="secondary" onClick={copyResumen}><Copy className="size-3.5" />Copiar resumen</Button>
          </div>
          {anteriores && (
            <button type="button" onClick={() => set('anteriores', '')} className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
              Solo pendientes atrasados · quitar
            </button>
          )}
          {selected.size > 0 && (
            <div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row sm:flex-wrap">
              <span className="self-start text-sm text-slate-500 sm:self-center">{selected.size} seleccionados</span>
              <Button size="sm" variant="soft" onClick={() => changeEstado('Presentado')}>Marcar presentado</Button>
              <Button size="sm" variant="soft" onClick={() => changeEstado('Liquidado')}>Marcar liquidado</Button>
              <Button size="sm" variant="secondary" onClick={() => changeEstado('Pendiente')}>Volver a pendiente</Button>
            </div>
          )}
        </div>
      </Card>

      {list.length === 0 ? (
        <Card>
          <EmptyState
            title="Sin registros"
            description="No hay liquidaciones con estos filtros. Generá desde evoluciones o cargá un registro manual."
            action={<Button onClick={() => setNuevo(true)}><Plus className="size-4" />Nuevo registro</Button>}
          />
        </Card>
      ) : (
        <>
          {/* Cards en móvil */}
          <ul className="space-y-3 md:hidden">
            <li className="flex items-center gap-2 px-1 text-sm text-slate-600">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Seleccionar todos" className="size-4 rounded border-slate-300" />
              Seleccionar todos
            </li>
            {list.map((f) => {
              const p = db.pacientes.find((x) => x.id === f.pacienteId);
              return (
                <li key={f.id} className={`rounded-xl border bg-white p-3.5 shadow-xs ${selected.has(f.id) ? 'border-brand-300 bg-brand-50/40' : 'border-slate-200'}`}>
                  <div className="flex items-start gap-3">
                    <input type="checkbox" checked={selected.has(f.id)} onChange={() => toggleOne(f.id)} aria-label={`Seleccionar ${f.id}`} className="mt-1 size-4 rounded border-slate-300" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">{f.id}</p>
                          <p className="text-xs text-slate-500">{formatPeriod(f.periodo)} · {f.cobertura}</p>
                        </div>
                        <PresentacionBadge estado={f.estado} />
                      </div>
                      <p className="mt-2 text-sm">
                        {p ? (
                          <Link to={`/pacientes/${p.id}`} className="font-medium text-brand-700 hover:underline">{p.nombre}</Link>
                        ) : f.pacienteId}
                      </p>
                      <p className="mt-1 text-sm text-slate-700 break-words">{f.practica}</p>
                      <p className="mt-2 text-sm text-slate-600">{f.sesiones} × {formatCurrency(f.valorSesion)}</p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <p className="text-base font-bold text-slate-900">{formatCurrency(totalFacturar(f))}</p>
                        <div className="flex gap-0.5">
                          <IconButton label="Editar" onClick={() => setEdit(f)}><Pencil className="size-4" /></IconButton>
                          <IconButton label="Eliminar" onClick={() => remove(f)} className="hover:text-red-600"><Trash2 className="size-4" /></IconButton>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Tabla en desktop */}
          <Card className="hidden md:block">
            <TableWrap>
              <table className="min-w-full">
                <thead className="border-b border-slate-100 bg-slate-50/80">
                  <tr>
                    <th className="th w-10">
                      <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Seleccionar todos" className="size-4 rounded border-slate-300" />
                    </th>
                    <th className="th">Registro</th>
                    <th className="th">Paciente</th>
                    <th className="th">Práctica</th>
                    <th className="th">Sesiones</th>
                    <th className="th">Total</th>
                    <th className="th">Estado</th>
                    <th className="th"><span className="sr-only">Acciones</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {list.map((f) => {
                    const p = db.pacientes.find((x) => x.id === f.pacienteId);
                    return (
                      <tr key={f.id} className={selected.has(f.id) ? 'bg-brand-50/40' : 'hover:bg-slate-50/80'}>
                        <td className="td">
                          <input type="checkbox" checked={selected.has(f.id)} onChange={() => toggleOne(f.id)} aria-label={`Seleccionar ${f.id}`} className="size-4 rounded border-slate-300" />
                        </td>
                        <td className="td">
                          <p className="font-medium text-slate-900">{f.id}</p>
                          <p className="text-xs text-slate-500">{formatPeriod(f.periodo)} · {f.cobertura}</p>
                        </td>
                        <td className="td">
                          {p ? (
                            <Link to={`/pacientes/${p.id}`} className="font-medium text-brand-700 hover:underline">{p.nombre}</Link>
                          ) : (
                            <span className="text-slate-500">{f.pacienteId}</span>
                          )}
                        </td>
                        <td className="td max-w-[14rem] truncate text-slate-700" title={f.practica}>{f.practica}</td>
                        <td className="td">{f.sesiones} × {formatCurrency(f.valorSesion)}</td>
                        <td className="td font-semibold text-slate-900">{formatCurrency(totalFacturar(f))}</td>
                        <td className="td"><PresentacionBadge estado={f.estado} /></td>
                        <td className="td">
                          <div className="flex justify-end gap-0.5">
                            <IconButton label="Editar" onClick={() => setEdit(f)}><Pencil className="size-4" /></IconButton>
                            <IconButton label="Eliminar" onClick={() => remove(f)} className="hover:text-red-600"><Trash2 className="size-4" /></IconButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableWrap>
          </Card>
        </>
      )}

      <FacturacionFormModal open={nuevo} onClose={() => setNuevo(false)} defaultPeriodo={periodo} />
      <FacturacionFormModal open={!!edit} onClose={() => setEdit(undefined)} registro={edit} />
    </>
  );
}
