import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, ArrowRight, BadgeDollarSign, CalendarClock, CircleCheck, CircleAlert, ClipboardPlus, Receipt, UserPlus, Users, UsersRound } from 'lucide-react';
import { Button, Card, CardHeader, EmptyState, PageHeader, ProgressBar, StatCard } from '@/components/ui';
import { CudBadge } from '@/components/badges';
import { EvolucionItem } from '@/features/evoluciones/EvolucionItem';
import { EvolucionFormModal } from '@/features/evoluciones/EvolucionForm';
import { PacienteFormModal } from '@/features/pacientes/PacienteForm';
import { cn, formatCurrency, formatNumber, formatPeriod, pluralize } from '@/lib/format';
import { sortEvolucionesDesc } from '@/services/domain';
import { dashboardStats } from '@/services/queries';
import { useData } from '@/store/DataContext';

interface AlertItem {
  tone: 'red' | 'amber' | 'sky';
  title: ReactNode;
  detail?: ReactNode;
  to: string;
}

export default function DashboardPage() {
  const { db, areaById } = useData();
  const navigate = useNavigate();
  const [newPatient, setNewPatient] = useState(false);
  const [newEvolution, setNewEvolution] = useState(false);

  const s = useMemo(() => dashboardStats(db), [db]);
  const recientes = useMemo(() => sortEvolucionesDesc(db.evoluciones).slice(0, 5), [db.evoluciones]);

  const alerts: AlertItem[] = [];
  s.cudAlertas.slice(0, 5).forEach((p) =>
    alerts.push({
      tone: 'red',
      to: `/pacientes/${p.id}`,
      title: <>CUD de <strong>{p.nombre}</strong></>,
      detail: <CudBadge paciente={p} />,
    }),
  );
  if (s.cudAlertas.length > 5) {
    alerts.push({ tone: 'amber', to: '/pacientes?cud=alerta', title: `Y ${s.cudAlertas.length - 5} pacientes más con CUD por vencer o vencido`, detail: 'Ver listado completo' });
  }
  if (s.atrasadas.cantidad > 0) {
    alerts.push({
      tone: 'red',
      to: '/facturacion?estado=Pendiente&anteriores=1',
      title: `${pluralize(s.atrasadas.cantidad, 'presentación pendiente', 'presentaciones pendientes')} de meses anteriores`,
      detail: `${formatCurrency(s.atrasadas.monto)} sin presentar`,
    });
  }
  if (s.pendientesMes > 0) {
    alerts.push({
      tone: 'amber',
      to: `/facturacion?estado=Pendiente&periodo=${s.periodo}`,
      title: `${pluralize(s.pendientesMes, 'registro', 'registros')} de ${formatPeriod(s.periodo)} por presentar`,
      detail: `${formatCurrency(s.totalesMes.porEstado.Pendiente)} en curso`,
    });
  }
  if (s.presentadasSinLiquidar.cantidad > 0) {
    alerts.push({
      tone: 'sky',
      to: '/facturacion?estado=Presentado',
      title: `${pluralize(s.presentadasSinLiquidar.cantidad, 'presentación', 'presentaciones')} esperando liquidación`,
      detail: formatCurrency(s.presentadasSinLiquidar.monto),
    });
  }
  s.talleresCompletos.forEach((t) =>
    alerts.push({ tone: 'sky', to: '/talleres', title: <>Taller <strong>{t.nombre}</strong> con cupo completo</>, detail: `${t.inscriptos.length}/${t.cupo} inscriptos` }),
  );

  const alertStyle = { red: 'bg-red-50 text-red-600', amber: 'bg-amber-50 text-amber-600', sky: 'bg-sky-50 text-sky-600' };
  const t = s.totalesMes;
  const maxCob = Math.max(1, ...s.porCobertura.map(([, v]) => v));
  const maxArea = Math.max(1, ...s.porArea.map(([, v]) => v));

  return (
    <>
      <PageHeader
        title="Resumen general"
        description="Estado actual del instituto: pacientes, actividad clínica, talleres y facturación del mes."
        actions={
          <>
            <Button variant="secondary" onClick={() => setNewPatient(true)}><UserPlus className="size-4" />Nuevo paciente</Button>
            <Button onClick={() => setNewEvolution(true)}><ClipboardPlus className="size-4" />Registrar evolución</Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pacientes activos" value={formatNumber(s.activos)} icon={<Users className="size-6" />}
          hint={<>{s.inactivos} {s.inactivos === 1 ? 'inactivo' : 'inactivos'} · <Link to="/pacientes" className="font-medium text-brand-700 hover:underline">ver pacientes</Link></>} />
        <StatCard label="Evoluciones cargadas" value={<>{s.evolucionesHoy}<span className="text-lg font-medium text-slate-400"> hoy</span></>} tone="sky" icon={<Activity className="size-6" />}
          hint={<><strong className="text-slate-700">{formatNumber(s.evolucionesMes)}</strong> en {formatPeriod(s.periodo).toLowerCase()}</>} />
        <StatCard label="Talleres activos" value={s.talleresActivos} tone="emerald" icon={<UsersRound className="size-6" />}
          hint={`${s.inscriptosTotal} de ${s.cupoTotal} cupos ocupados`} />
        <StatCard label={`Facturación ${formatPeriod(s.periodo)}`} value={formatCurrency(t.total)} tone="amber" icon={<BadgeDollarSign className="size-6" />}
          hint={`${t.sesiones} sesiones · ${t.cantidadPorEstado.Liquidado} liquidados, ${t.cantidadPorEstado.Presentado} presentados, ${t.cantidadPorEstado.Pendiente} pendientes`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Alertas" description="Lo que requiere atención ahora" />
          {alerts.length === 0 ? (
            <EmptyState icon={<CircleCheck className="size-6 text-emerald-500" />} title="Todo en orden" description="No hay CUD por vencer ni presentaciones pendientes." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {alerts.map((a, i) => (
                <li key={i}>
                  <Link to={a.to} className="group flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
                    <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', alertStyle[a.tone])}>
                      {a.to.startsWith('/facturacion') ? <Receipt className="size-5" /> : a.to.startsWith('/talleres') ? <UsersRound className="size-5" /> : a.tone === 'red' ? <CircleAlert className="size-5" /> : <CalendarClock className="size-5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-slate-800">{a.title}</span>
                      {a.detail && <span className="mt-0.5 block text-xs text-slate-500">{a.detail}</span>}
                    </span>
                    <ArrowRight className="size-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Facturación por cobertura" description={formatPeriod(s.periodo)} actions={<Link to="/facturacion" className="text-sm font-medium text-brand-700 hover:underline">Ver detalle</Link>} />
          <div className="space-y-4 p-5">
            <div>
              <div className="mb-2 flex h-3 overflow-hidden rounded-full bg-slate-100" aria-label="Distribución por estado de presentación">
                {t.total > 0 && (
                  <>
                    <div className="bg-emerald-500" style={{ width: `${(t.porEstado.Liquidado / t.total) * 100}%` }} />
                    <div className="bg-sky-500" style={{ width: `${(t.porEstado.Presentado / t.total) * 100}%` }} />
                    <div className="bg-amber-400" style={{ width: `${(t.porEstado.Pendiente / t.total) * 100}%` }} />
                  </>
                )}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-emerald-500" />Liquidado {formatCurrency(t.porEstado.Liquidado)}</span>
                <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-sky-500" />Presentado {formatCurrency(t.porEstado.Presentado)}</span>
                <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-amber-400" />Pendiente {formatCurrency(t.porEstado.Pendiente)}</span>
              </div>
            </div>
            {s.porCobertura.length === 0 ? (
              <p className="text-sm text-slate-500">Todavía no hay registros de facturación este mes.</p>
            ) : (
              <ul className="space-y-3">
                {s.porCobertura.map(([cob, monto]) => (
                  <li key={cob}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-medium text-slate-700">{cob}</span>
                      <span className="text-slate-600">{formatCurrency(monto)}</span>
                    </div>
                    <ProgressBar value={(monto / maxCob) * 100} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Últimas evoluciones" actions={<Link to="/evoluciones" className="text-sm font-medium text-brand-700 hover:underline">Ver todas</Link>} />
          <div className="space-y-3 p-4">
            {recientes.length === 0 ? <EmptyState title="Sin evoluciones" description="Registrá la primera evolución desde el botón superior." /> : recientes.map((e) => <EvolucionItem key={e.id} evolucion={e} />)}
          </div>
        </Card>

        <Card className="lg:col-span-2 self-start">
          <CardHeader title="Sesiones por área" description={`${formatPeriod(s.periodo)} · ${s.evolucionesMes} evoluciones`} />
          <ul className="space-y-3 p-5">
            {s.porArea.length === 0 && <li className="text-sm text-slate-500">Sin actividad registrada este mes.</li>}
            {s.porArea.map(([areaId, n]) => (
              <li key={areaId}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium text-slate-700">{areaById(areaId)?.nombre ?? areaId}</span>
                  <span className="text-slate-600">{n}</span>
                </div>
                <ProgressBar value={(n / maxArea) * 100} />
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <PacienteFormModal open={newPatient} onClose={() => setNewPatient(false)} onSaved={(p) => navigate(`/pacientes/${p.id}`)} />
      <EvolucionFormModal open={newEvolution} onClose={() => setNewEvolution(false)} />
    </>
  );
}