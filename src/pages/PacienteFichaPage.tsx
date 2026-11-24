import { useMemo, useState, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardPlus, Pencil, Phone, Trash2, UsersRound } from 'lucide-react';
import { Button, Card, CardHeader, EmptyState, PageHeader, ProgressBar, Tabs, TableWrap } from '@/components/ui';
import { CudBadge, EstadoPacienteBadge, PresentacionBadge, TipoCoberturaBadge } from '@/components/badges';
import { useFeedback } from '@/components/feedback';
import { EvolucionFormModal } from '@/features/evoluciones/EvolucionForm';
import { EvolucionItem } from '@/features/evoluciones/EvolucionItem';
import { PacienteFormModal } from '@/features/pacientes/PacienteForm';
import { formatAge, formatCurrency, formatDate, formatDNI, formatPeriod, initials } from '@/lib/format';
import { ocupacion, sortEvolucionesDesc, sumTotals, totalFacturar } from '@/services/domain';
import { useData } from '@/store/DataContext';

type Tab = 'evoluciones' | 'talleres' | 'facturacion';

export default function PacienteFichaPage() {
  const { id } = useParams<{ id: string }>();
  const { db, pacienteById, deletePaciente, deleteEvolucion } = useData();
  const { toast, toastError, confirm } = useFeedback();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('evoluciones');
  const [edit, setEdit] = useState(false);
  const [nuevaEvo, setNuevaEvo] = useState(false);
  const [editEvo, setEditEvo] = useState<string | null>(null);

  const paciente = id ? pacienteById(id) : undefined;
  const pacienteId = paciente?.id ?? '';

  const evoluciones = useMemo(
    () => (pacienteId ? sortEvolucionesDesc(db.evoluciones.filter((e) => e.pacienteId === pacienteId)) : []),
    [db.evoluciones, pacienteId],
  );
  const talleres = useMemo(
    () => (pacienteId ? db.talleres.filter((t) => t.inscriptos.includes(pacienteId)) : []),
    [db.talleres, pacienteId],
  );
  const facturas = useMemo(
    () =>
      pacienteId
        ? [...db.facturacion.filter((f) => f.pacienteId === pacienteId)].sort(
            (a, b) => b.periodo.localeCompare(a.periodo) || a.id.localeCompare(b.id),
          )
        : [],
    [db.facturacion, pacienteId],
  );
  const totales = useMemo(() => sumTotals(facturas), [facturas]);
  const evoEdit = editEvo ? db.evoluciones.find((e) => e.id === editEvo) : undefined;

  if (!paciente) return <Navigate to="/pacientes" replace />;

  const removePaciente = async () => {
    const ok = await confirm({
      title: 'Eliminar paciente',
      message: <>Se eliminará el legajo de <strong>{paciente.nombre}</strong>, sus evoluciones y registros de facturación. Esta acción no se puede deshacer.</>,
      confirmLabel: 'Eliminar legajo',
    });
    if (!ok) return;
    try {
      await deletePaciente(paciente.id);
      toast('Paciente eliminado.');
      navigate('/pacientes');
    } catch (err) {
      toastError(err);
    }
  };

  const removeEvo = async (evoId: string) => {
    const ok = await confirm({ title: 'Eliminar evolución', message: '¿Eliminar esta nota de sesión?', confirmLabel: 'Eliminar' });
    if (!ok) return;
    try {
      await deleteEvolucion(evoId);
      toast('Evolución eliminada.');
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <>
      <div className="mb-4">
        <Link to="/pacientes" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline">
          <ArrowLeft className="size-4" /> Volver al listado
        </Link>
      </div>

      <PageHeader
        title={paciente.nombre}
        description={`${paciente.id} · DNI ${formatDNI(paciente.dni)} · ${formatAge(paciente.fechaNacimiento)}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => setEdit(true)}><Pencil className="size-4" />Editar</Button>
            <Button onClick={() => setNuevaEvo(true)}><ClipboardPlus className="size-4" />Nueva evolución</Button>
            <Button variant="ghost" className="text-red-600 hover:bg-red-50" onClick={removePaciente}><Trash2 className="size-4" /></Button>
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-100 text-lg font-bold text-brand-800">{initials(paciente.nombre)}</span>
        <EstadoPacienteBadge estado={paciente.estado} />
        <TipoCoberturaBadge tipo={paciente.tipoCobertura} />
        <CudBadge paciente={paciente} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="self-start lg:col-span-1">
          <CardHeader title="Datos del legajo" />
          <dl className="space-y-3 p-5 text-sm">
            <Row label="Fecha de nacimiento" value={`${formatDate(paciente.fechaNacimiento)} (${formatAge(paciente.fechaNacimiento)})`} />
            <Row label="Diagnóstico principal" value={paciente.diagnostico || '—'} />
            <Row label="Nro. CUD" value={paciente.nroCUD || 'En trámite / sin CUD'} />
            <Row label="Vencimiento CUD" value={formatDate(paciente.vencimientoCUD)} />
            <Row label="Cobertura" value={`${paciente.cobertura} · ${paciente.nroAfiliado}`} />
            <Row label="Tutor / familiar" value={paciente.tutor || '—'} />
            <Row
              label="Teléfono"
              value={
                paciente.telefono ? (
                  <a href={`tel:${paciente.telefono.replace(/\s/g, '')}`} className="inline-flex items-center gap-1.5 font-medium text-brand-700 hover:underline">
                    <Phone className="size-3.5" />{paciente.telefono}
                  </a>
                ) : '—'
              }
            />
          </dl>
        </Card>

        <Card className="lg:col-span-2">
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'evoluciones', label: 'Evoluciones', count: evoluciones.length },
              { value: 'talleres', label: 'Talleres', count: talleres.length },
              { value: 'facturacion', label: 'Facturación', count: facturas.length },
            ]}
          />

          {tab === 'evoluciones' && (
            <div className="space-y-3 p-4">
              {evoluciones.length === 0 ? (
                <EmptyState title="Sin evoluciones" description="Registrá la primera nota de sesión de este paciente." action={<Button onClick={() => setNuevaEvo(true)}>Nueva evolución</Button>} />
              ) : (
                evoluciones.map((e) => (
                  <EvolucionItem key={e.id} evolucion={e} showPaciente={false} onEdit={() => setEditEvo(e.id)} onDelete={() => removeEvo(e.id)} />
                ))
              )}
            </div>
          )}

          {tab === 'talleres' && (
            <div className="p-4">
              {talleres.length === 0 ? (
                <EmptyState icon={<UsersRound className="size-6" />} title="Sin talleres" description="Este paciente no está inscripto en ningún taller." action={<Link to="/talleres" className="text-sm font-medium text-brand-700 hover:underline">Ir a talleres</Link>} />
              ) : (
                <ul className="space-y-3">
                  {talleres.map((t) => {
                    const o = ocupacion(t);
                    return (
                      <li key={t.id} className="rounded-xl border border-slate-200 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-slate-900">{t.nombre}</p>
                            <p className="text-sm text-slate-500">{t.id} · {t.diasHorarios}</p>
                          </div>
                          <span className="text-sm text-slate-600">{o.inscriptos}/{o.cupo}</span>
                        </div>
                        <div className="mt-3"><ProgressBar value={o.porcentaje} tone={o.completo ? 'amber' : 'brand'} /></div>
                        <p className="mt-2 text-sm text-slate-600">{t.terapeutas.join(' · ')}</p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {tab === 'facturacion' && (
            <div>
              <div className="flex flex-wrap gap-4 border-b border-slate-100 px-5 py-3 text-sm text-slate-600">
                <span>Total: <strong className="text-slate-900">{formatCurrency(totales.total)}</strong></span>
                <span>{totales.sesiones} sesiones</span>
                <span>Pendiente {formatCurrency(totales.porEstado.Pendiente)}</span>
              </div>
              {facturas.length === 0 ? (
                <EmptyState title="Sin registros" description="Todavía no hay liquidaciones asociadas a este paciente." />
              ) : (
                <TableWrap>
                  <table className="min-w-full">
                    <thead className="border-b border-slate-100 bg-slate-50/80">
                      <tr>
                        <th className="th">Período</th>
                        <th className="th">Práctica</th>
                        <th className="th">Sesiones</th>
                        <th className="th">Total</th>
                        <th className="th">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {facturas.map((f) => (
                        <tr key={f.id}>
                          <td className="td">
                            <p className="font-medium text-slate-800">{formatPeriod(f.periodo)}</p>
                            <p className="text-xs text-slate-400">{f.id}</p>
                          </td>
                          <td className="td">
                            <p className="text-slate-700">{f.practica}</p>
                            <p className="text-xs text-slate-500">{f.cobertura}</p>
                          </td>
                          <td className="td">{f.sesiones}</td>
                          <td className="td font-medium">{formatCurrency(totalFacturar(f))}</td>
                          <td className="td"><PresentacionBadge estado={f.estado} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableWrap>
              )}
            </div>
          )}
        </Card>
      </div>

      <PacienteFormModal open={edit} onClose={() => setEdit(false)} paciente={paciente} />
      <EvolucionFormModal open={nuevaEvo} onClose={() => setNuevaEvo(false)} defaultPacienteId={paciente.id} />
      <EvolucionFormModal open={!!evoEdit} onClose={() => setEditEvo(null)} evolucion={evoEdit} />
    </>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</dt>
      <dd className="mt-0.5 text-slate-800">{value}</dd>
    </div>
  );
}
