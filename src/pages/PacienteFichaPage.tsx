import { useMemo, useState, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardPlus, Pencil, Phone, Pill, Plus, Trash2, UsersRound } from 'lucide-react';
import { Badge, Button, Card, CardHeader, EmptyState, IconButton, PageHeader, ProgressBar, Tabs, TableWrap } from '@/components/ui';
import { CudBadge, EstadoPacienteBadge, PresentacionBadge, TipoCoberturaBadge } from '@/components/badges';
import { useFeedback } from '@/components/feedback';
import { EvolucionFormModal } from '@/features/evoluciones/EvolucionForm';
import { EvolucionItem } from '@/features/evoluciones/EvolucionItem';
import { MedicacionFormModal } from '@/features/medicaciones/MedicacionForm';
import { PacienteFormModal } from '@/features/pacientes/PacienteForm';
import { formatAge, formatCurrency, formatDate, formatDNI, formatPeriod, initials } from '@/lib/format';
import { ocupacion, sortEvolucionesDesc, sumTotals, totalFacturar } from '@/services/domain';
import { useData } from '@/store/DataContext';
import type { Medicacion } from '@/types';

type Tab = 'datos' | 'evoluciones' | 'medicacion' | 'talleres' | 'facturacion';

export default function PacienteFichaPage() {
  const { id } = useParams<{ id: string }>();
  const { db, pacienteById, deletePaciente, deleteEvolucion, deleteMedicacion } = useData();
  const { toast, toastError, confirm } = useFeedback();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('datos');
  const [edit, setEdit] = useState(false);
  const [nuevaEvo, setNuevaEvo] = useState(false);
  const [medForm, setMedForm] = useState<Medicacion | 'new' | null>(null);

  const paciente = id ? pacienteById(id) : undefined;
  const pacienteId = paciente?.id ?? '';

  const evoluciones = useMemo(
    () => (pacienteId ? sortEvolucionesDesc(db.evoluciones.filter((e) => e.pacienteId === pacienteId)) : []),
    [db.evoluciones, pacienteId],
  );
  const medicaciones = useMemo(
    () => (pacienteId ? db.medicaciones.filter((m) => m.pacienteId === pacienteId) : []),
    [db.medicaciones, pacienteId],
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

  if (!paciente) return <Navigate to="/pacientes" replace />;

  const removePaciente = async () => {
    const ok = await confirm({
      title: 'Eliminar paciente',
      message: <>Se eliminará el legajo de <strong>{paciente.nombre}</strong>, evoluciones, medicación y facturación.</>,
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
    const ok = await confirm({ title: 'Eliminar evolución', message: '¿Eliminar esta nota? En historia clínica real no se borran: preferí una adenda.', confirmLabel: 'Eliminar' });
    if (!ok) return;
    try {
      await deleteEvolucion(evoId);
      toast('Evolución eliminada.');
    } catch (err) {
      toastError(err);
    }
  };

  const removeMed = async (m: Medicacion) => {
    const ok = await confirm({ title: 'Eliminar medicación', message: `¿Eliminar ${m.droga}? Mejor suspendela y dejá el historial.`, confirmLabel: 'Eliminar' });
    if (!ok) return;
    try {
      await deleteMedicacion(m.id);
      toast('Medicación eliminada.');
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
            <Button variant="ghost" className="text-red-600 hover:bg-red-50" onClick={removePaciente}>
              <Trash2 className="size-4" /><span className="sm:hidden">Eliminar</span>
            </Button>
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-100 text-lg font-bold text-brand-800">{initials(paciente.nombre)}</span>
        <EstadoPacienteBadge estado={paciente.estado} />
        <TipoCoberturaBadge tipo={paciente.tipoCobertura} />
        <CudBadge paciente={paciente} />
        <Badge tone="neutral">SUBE: {paciente.sube}</Badge>
        <Badge tone="neutral">Pensión: {paciente.pension}</Badge>
      </div>

      <Card>
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'datos', label: 'Legajo' },
            { value: 'evoluciones', label: 'Evoluciones', count: evoluciones.length },
            { value: 'medicacion', label: 'Medicación', count: medicaciones.length },
            { value: 'talleres', label: 'Talleres', count: talleres.length },
            { value: 'facturacion', label: 'Facturación', count: facturas.length },
          ]}
        />

        {tab === 'datos' && (
          <div className="grid gap-6 p-4 sm:p-5 lg:grid-cols-2">
            <Section title="Datos personales">
              <Row label="Fecha de nacimiento" value={`${formatDate(paciente.fechaNacimiento)} (${formatAge(paciente.fechaNacimiento)})`} />
              <Row label="Género / pronombres" value={paciente.genero || '—'} />
              <Row label="Domicilio" value={paciente.domicilio || '—'} />
              <Row label="Convive con" value={paciente.conviveCon || '—'} />
              <Row label="Teléfono" value={paciente.telefono ? <a href={`tel:${paciente.telefono.replace(/\s/g, '')}`} className="inline-flex items-center gap-1.5 font-medium text-brand-700 hover:underline"><Phone className="size-3.5" />{paciente.telefono}</a> : '—'} />
              <Row label="Nacionalidad" value={paciente.nacionalidad || '—'} />
              <Row label="Estado civil" value={paciente.estadoCivil || '—'} />
              <Row label="Escolaridad" value={paciente.escolaridad || '—'} />
              <Row label="Ocupación" value={paciente.ocupacion || '—'} />
              <Row label="CUD" value={`${paciente.estadoCUD}${paciente.nroCUD ? ` · ${paciente.nroCUD}` : ''}${paciente.vencimientoCUD ? ` · vence ${formatDate(paciente.vencimientoCUD)}` : ''}`} />
            </Section>
            <Section title="Contactos y red de apoyo">
              <Row label="Referente" value={`${paciente.referente.nombre || '—'}${paciente.referente.vinculo ? ` (${paciente.referente.vinculo})` : ''}`} />
              <Row label="Tel. referente" value={paciente.referente.telefono || '—'} />
              <Row label="Edad referente" value={paciente.referente.edad || '—'} />
              <Row label="Emergencia" value={paciente.contactoEmergencia || '—'} />
              <Row label="Curador/a" value={paciente.curador || '—'} />
              <Row label="Otras instituciones" value={paciente.otrasInstituciones || '—'} />
            </Section>
            <Section title="Cobertura y administrativo">
              <Row label="Cobertura" value={`${paciente.cobertura} · ${paciente.nroAfiliado}`} />
              <Row label="Prestaciones" value={paciente.prestacionesAutorizadas || '—'} />
              <Row label="Venc. autorización" value={formatDate(paciente.vencimientoAutorizacion)} />
              <Row label="Ingreso al centro" value={formatDate(paciente.fechaIngreso)} />
              <Row label="Días de asistencia" value={paciente.diasAsistencia.length ? paciente.diasAsistencia.join(', ') : '—'} />
              <Row label="Estado" value={paciente.estado} />
            </Section>
            <Section title="Admisión y datos clínicos">
              <Row label="Motivo de consulta" value={paciente.motivoConsulta || '—'} />
              <Row label="Derivación" value={paciente.derivacion || '—'} />
              <Row label="Diagnóstico(s)" value={paciente.diagnostico || '—'} />
              <Row label="Quién lo hizo" value={paciente.diagnosticoAutor || '—'} />
              <Row label="Antecedentes" value={paciente.antecedentes || '—'} />
              <Row label="Prof. externos" value={paciente.profesionalesExternos || '—'} />
              <Row label="Condiciones médicas" value={paciente.condicionesMedicas || '—'} />
              <Row label="Consentimiento" value={paciente.consentimientoFirmado ? 'Firmado' : 'Pendiente'} />
            </Section>
          </div>
        )}

        {tab === 'evoluciones' && (
          <div className="space-y-3 p-4">
            {evoluciones.length === 0 ? (
              <EmptyState title="Sin evoluciones" description="Registrá la primera nota. Después solo se agregan adendas." action={<Button onClick={() => setNuevaEvo(true)}>Nueva evolución</Button>} />
            ) : (
              evoluciones.map((e) => (
                <EvolucionItem key={e.id} evolucion={e} showPaciente={false} onDelete={() => removeEvo(e.id)} />
              ))
            )}
          </div>
        )}

        {tab === 'medicacion' && (
          <div className="p-4">
            <div className="mb-3 flex justify-end">
              <Button size="sm" onClick={() => setMedForm('new')}><Plus className="size-4" />Nueva medicación</Button>
            </div>
            {medicaciones.length === 0 ? (
              <EmptyState icon={<Pill className="size-6" />} title="Sin medicación cargada" description="Podés registrar más de un medicamento por paciente, con historial de cambios." action={<Button onClick={() => setMedForm('new')}>Nueva medicación</Button>} />
            ) : (
              <ul className="space-y-3">
                {medicaciones.map((m) => (
                  <li key={m.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">{m.droga} {!m.activo && <Badge tone="warning">Suspendida</Badge>}</p>
                        <p className="text-sm text-slate-500">{[m.presentacion, m.concentracion].filter(Boolean).join(' · ') || m.id}</p>
                      </div>
                      <div className="flex gap-0.5">
                        <IconButton label="Editar" onClick={() => setMedForm(m)}><Pencil className="size-4" /></IconButton>
                        <IconButton label="Eliminar" onClick={() => removeMed(m)} className="hover:text-red-600"><Trash2 className="size-4" /></IconButton>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-slate-700">Dosis: {m.dosis || '—'} · Horarios: {m.horarios || '—'} · Desde {formatDate(m.fechaInicio)}</p>
                    {m.observaciones && <p className="mt-1 text-sm text-slate-600">{m.observaciones}</p>}
                    {m.historial.length > 0 && (
                      <ul className="mt-3 space-y-1 border-t border-slate-100 pt-2 text-xs text-slate-500">
                        {m.historial.map((h) => (
                          <li key={h.id}>{formatDate(h.fecha)} · {h.motivo}: {h.detalle}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === 'talleres' && (
          <div className="p-4">
            {talleres.length === 0 ? (
              <EmptyState icon={<UsersRound className="size-6" />} title="Sin talleres" description="Este paciente no está inscripto en ningún taller." />
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
            </div>
            {facturas.length === 0 ? (
              <EmptyState title="Sin registros" description="Todavía no hay liquidaciones asociadas." />
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

      <PacienteFormModal open={edit} onClose={() => setEdit(false)} paciente={paciente} />
      <EvolucionFormModal open={nuevaEvo} onClose={() => setNuevaEvo(false)} defaultPacienteId={paciente.id} />
      <MedicacionFormModal
        open={medForm !== null}
        onClose={() => setMedForm(null)}
        pacienteId={paciente.id}
        medicacion={medForm && medForm !== 'new' ? medForm : undefined}
      />
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <CardHeader title={title} />
      <dl className="space-y-3 pt-3 text-sm">{children}</dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-line text-slate-800">{value}</dd>
    </div>
  );
}
