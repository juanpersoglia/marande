import { useMemo, useState, type FormEvent } from 'react';
import { Settings2 } from 'lucide-react';
import { Button, Field, Input, Modal, Segmented, Select, Textarea } from '@/components/ui';
import { PatientPicker } from '@/components/PatientPicker';
import { useFeedback } from '@/components/feedback';
import { nowTime, todayISO } from '@/lib/format';
import { listarProfesionales } from '@/services/queries';
import { useData } from '@/store/DataContext';
import { MODALIDADES, type Evolucion, type Modalidad } from '@/types';
import { AreasModal } from './AreasModal';

type FormState = Omit<Evolucion, 'id'>;

interface Props {
  open: boolean;
  onClose: () => void;
  evolucion?: Evolucion;
  defaultPacienteId?: string;
  onSaved?: (e: Evolucion) => void;
}

export function EvolucionFormModal(props: Props) {
  return props.open ? <EvolucionFormInner {...props} /> : null;
}

function EvolucionFormInner({ onClose, evolucion, defaultPacienteId, onSaved }: Props) {
  const { db, saveEvolucion } = useData();
  const { toast, toastError } = useFeedback();
  const [areasOpen, setAreasOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const [form, setForm] = useState<FormState>(() => {
    if (evolucion) {
      const { id: _id, ...rest } = evolucion;
      return { ...rest, addendas: rest.addendas ?? [] };
    }
    return {
      fecha: todayISO(), hora: nowTime(), pacienteId: defaultPacienteId ?? '', areaId: db.areas[0]?.id ?? '',
      profesional: '', modalidad: 'Individual', tallerId: undefined, nota: '', objetivos: '', addendas: [],
    };
  });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const profesionales = useMemo(() => listarProfesionales(db), [db]);
  // Pacientes activos (más el actual si se edita una evolución de un paciente inactivo).
  const pacientes = useMemo(
    () => db.pacientes.filter((p) => p.estado === 'Activo' || p.id === form.pacienteId).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    [db.pacientes, form.pacienteId],
  );
  const paciente = db.pacientes.find((p) => p.id === form.pacienteId);
  const talleresDelPaciente = db.talleres.filter((t) => t.inscriptos.includes(form.pacienteId) || t.id === form.tallerId);

  const validate = () => {
    const e: typeof errors = {};
    if (!form.fecha) e.fecha = 'Requerido.';
    if (!form.hora) e.hora = 'Requerido.';
    if (!form.pacienteId) e.pacienteId = 'Elegí un paciente.';
    if (!form.areaId) e.areaId = 'Elegí un área.';
    if (!form.profesional.trim()) e.profesional = 'Indicá el profesional.';
    if (!form.nota.trim()) e.nota = 'Escribí la evolución de la sesión.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async (another: boolean) => {
    if (!validate()) return;
    setSaving(true);
    try {
      const saved = await saveEvolucion({
        ...form,
        id: evolucion?.id,
        profesional: form.profesional.trim(),
        tallerId: form.modalidad === 'Taller' ? form.tallerId || undefined : undefined,
        nota: form.nota.trim(),
        objetivos: form.objetivos.trim(),
      });
      toast(evolucion ? 'Evolución actualizada.' : 'Evolución registrada.');
      onSaved?.(saved);
      if (another && !evolucion) {
        // Mantiene fecha, área, profesional y modalidad para cargar rápido la siguiente.
        setForm((f) => ({ ...f, hora: nowTime(), pacienteId: '', nota: '', objetivos: '' }));
        setErrors({});
      } else onClose();
    } catch (err) {
      toastError(err);
    } finally {
      setSaving(false);
    }
  };

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    void save(false);
  };

  return (
    <>
      <Modal
        open
        onClose={() => !areasOpen && onClose()}
        size="lg"
        title={evolucion ? `Evolución · ${evolucion.id}` : 'Nueva evolución'}
        description={evolucion ? 'Las evoluciones guardadas no se modifican: usá una adenda desde el historial.' : 'Registro clínico fechado y firmado por el profesional.'}
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            {!evolucion && <Button variant="soft" onClick={() => save(true)} disabled={saving}>Guardar y cargar otra</Button>}
            {!evolucion && <Button type="submit" form="evolucion-form" disabled={saving}>{saving ? 'Guardando...' : 'Guardar evolución'}</Button>}
            {evolucion && <Button onClick={onClose}>Cerrar</Button>}
          </>
        }
      >
        <form id="evolucion-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-6" noValidate style={evolucion ? { pointerEvents: 'none', opacity: 0.85 } : undefined}>
          <Field label="Fecha" required error={errors.fecha} className="sm:col-span-3">
            {(id) => <Input id={id} type="date" value={form.fecha} onChange={(e) => set('fecha', e.target.value)} invalid={!!errors.fecha} />}
          </Field>
          <Field label="Hora" required error={errors.hora} className="sm:col-span-3">
            {(id) => <Input id={id} type="time" value={form.hora} onChange={(e) => set('hora', e.target.value)} invalid={!!errors.hora} />}
          </Field>

          <Field label="Paciente" required error={errors.pacienteId} className="sm:col-span-6"
            hint={paciente ? `${paciente.id} · ${paciente.diagnostico || 'Sin diagnóstico cargado'}` : undefined}>
            {(id) => (
              <PatientPicker id={id} value={form.pacienteId} patients={pacientes} invalid={!!errors.pacienteId}
                onChange={(pid) => setForm((f) => ({ ...f, pacienteId: pid, tallerId: undefined }))} />
            )}
          </Field>

          <Field label="Área / Especialidad" required error={errors.areaId} className="sm:col-span-3">
            {(id) => (
              <div className="flex gap-2">
                <Select id={id} value={form.areaId} onChange={(e) => set('areaId', e.target.value)} invalid={!!errors.areaId}>
                  <option value="" disabled>Seleccionar...</option>
                  {db.areas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                </Select>
                <Button variant="secondary" onClick={() => setAreasOpen(true)} aria-label="Gestionar áreas" title="Agregar o editar áreas">
                  <Settings2 className="size-4" />
                </Button>
              </div>
            )}
          </Field>
          <Field label="Profesional" required error={errors.profesional} className="sm:col-span-3">
            {(id) => (
              <>
                <Input id={id} list="profesionales-lista" value={form.profesional} onChange={(e) => set('profesional', e.target.value)} invalid={!!errors.profesional} placeholder="Nombre del profesional" />
                <datalist id="profesionales-lista">{profesionales.map((p) => <option key={p} value={p} />)}</datalist>
              </>
            )}
          </Field>

          <div className="sm:col-span-6">
            <p className="mb-1 text-sm font-medium text-slate-700">Modalidad</p>
            <Segmented<Modalidad> label="Modalidad" value={form.modalidad} onChange={(m) => set('modalidad', m)}
              options={MODALIDADES.map((m) => ({ value: m, label: m }))} />
          </div>

          {form.modalidad === 'Taller' && (
            <Field label="Taller" className="sm:col-span-6" hint={form.pacienteId && talleresDelPaciente.length === 0 ? 'El paciente no está inscripto en ningún taller.' : 'Opcional: vincula la sesión con el taller.'}>
              {(id) => (
                <Select id={id} value={form.tallerId ?? ''} onChange={(e) => set('tallerId', e.target.value || undefined)}>
                  <option value="">Sin especificar</option>
                  {(talleresDelPaciente.length ? talleresDelPaciente : db.talleres).map((t) => <option key={t.id} value={t.id}>{t.id} · {t.nombre}</option>)}
                </Select>
              )}
            </Field>
          )}

          <Field label="Evolución / Nota de sesión" required error={errors.nota} className="sm:col-span-6">
            {(id) => <Textarea id={id} rows={5} value={form.nota} onChange={(e) => set('nota', e.target.value)} invalid={!!errors.nota} placeholder="Describí lo trabajado, respuesta del paciente, observaciones y sugerencias." />}
          </Field>
          <Field label="Objetivos trabajados" className="sm:col-span-6">
            {(id) => <Textarea id={id} rows={2} value={form.objetivos} onChange={(e) => set('objetivos', e.target.value)} placeholder="Ej.: Mejorar la inteligibilidad del habla" />}
          </Field>
        </form>
      </Modal>
      <AreasModal open={areasOpen} onClose={() => setAreasOpen(false)} />
    </>
  );
}
