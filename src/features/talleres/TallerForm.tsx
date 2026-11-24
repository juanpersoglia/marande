import { useMemo, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { Button, Field, Input, Modal, Select, Textarea } from '@/components/ui';
import { PatientPicker } from '@/components/PatientPicker';
import { useFeedback } from '@/components/feedback';
import { listarProfesionales } from '@/services/queries';
import { useData } from '@/store/DataContext';
import type { Taller } from '@/types';

type FormState = Omit<Taller, 'id'>;

interface Props {
  open: boolean;
  onClose: () => void;
  taller?: Taller;
  onSaved?: (t: Taller) => void;
}

export function TallerFormModal(props: Props) {
  return props.open ? <TallerFormInner {...props} /> : null;
}

function TallerFormInner({ onClose, taller, onSaved }: Props) {
  const { db, saveTaller } = useData();
  const { toast, toastError } = useFeedback();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [terapeutaDraft, setTerapeutaDraft] = useState('');
  const [pacienteDraft, setPacienteDraft] = useState('');

  const [form, setForm] = useState<FormState>(() => {
    if (!taller) {
      return { nombre: '', diasHorarios: '', terapeutas: [], cupo: 8, inscriptos: [], objetivos: '', activo: true };
    }
    const { id: _id, ...rest } = taller;
    return rest;
  });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));
  const profesionales = useMemo(() => listarProfesionales(db), [db]);
  const pacientesActivos = useMemo(
    () => db.pacientes.filter((p) => p.estado === 'Activo' || form.inscriptos.includes(p.id)).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    [db.pacientes, form.inscriptos],
  );

  const addTerapeuta = () => {
    const nombre = terapeutaDraft.trim();
    if (!nombre) return;
    if (form.terapeutas.includes(nombre)) return;
    set('terapeutas', [...form.terapeutas, nombre]);
    setTerapeutaDraft('');
  };

  const addPaciente = (id: string) => {
    if (!id || form.inscriptos.includes(id)) return;
    if (form.inscriptos.length >= form.cupo) {
      toast('El cupo máximo ya está completo.', 'error');
      return;
    }
    set('inscriptos', [...form.inscriptos, id]);
    setPacienteDraft('');
  };

  const validate = () => {
    const e: typeof errors = {};
    if (!form.nombre.trim()) e.nombre = 'Ingresá el nombre del taller.';
    if (!form.diasHorarios.trim()) e.diasHorarios = 'Indicá días y horarios.';
    if (!form.cupo || form.cupo < 1) e.cupo = 'El cupo debe ser al menos 1.';
    if (form.inscriptos.length > form.cupo) e.cupo = `Hay ${form.inscriptos.length} inscriptos; aumentá el cupo o quitá pacientes.`;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const saved = await saveTaller({
        ...form,
        id: taller?.id,
        nombre: form.nombre.trim(),
        diasHorarios: form.diasHorarios.trim(),
        objetivos: form.objetivos.trim(),
      });
      toast(taller ? 'Taller actualizado.' : `Taller creado: ${saved.id}.`);
      onSaved?.(saved);
      onClose();
    } catch (err) {
      toastError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={taller ? `Editar taller · ${taller.id}` : 'Nuevo taller'}
      description={taller ? undefined : 'El ID (TAL-##) se genera automáticamente al guardar.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="taller-form" disabled={saving}>{saving ? 'Guardando...' : 'Guardar taller'}</Button>
        </>
      }
    >
      <form id="taller-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Field label="Nombre del taller" required error={errors.nombre} className="sm:col-span-2">
          {(id) => <Input id={id} value={form.nombre} onChange={(e) => set('nombre', e.target.value)} invalid={!!errors.nombre} autoFocus placeholder="Ej.: Taller de comunicación" />}
        </Field>
        <Field label="Días y horarios" required error={errors.diasHorarios} className="sm:col-span-2">
          {(id) => <Input id={id} value={form.diasHorarios} onChange={(e) => set('diasHorarios', e.target.value)} invalid={!!errors.diasHorarios} placeholder="Ej.: Martes y jueves 10:00–11:30" />}
        </Field>
        <Field label="Cupo máximo" required error={errors.cupo}>
          {(id) => <Input id={id} type="number" min={1} value={form.cupo} onChange={(e) => set('cupo', Number(e.target.value) || 0)} invalid={!!errors.cupo} />}
        </Field>
        <Field label="Estado">
          {(id) => (
            <Select id={id} value={form.activo ? 'activo' : 'inactivo'} onChange={(e) => set('activo', e.target.value === 'activo')}>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </Select>
          )}
        </Field>

        <div className="sm:col-span-2">
          <p className="mb-1 text-sm font-medium text-slate-700">Terapeutas a cargo</p>
          <div className="flex gap-2">
            <Input
              list="terapeutas-sugeridos"
              value={terapeutaDraft}
              onChange={(e) => setTerapeutaDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTerapeuta())}
              placeholder="Nombre del profesional"
            />
            <datalist id="terapeutas-sugeridos">{profesionales.map((p) => <option key={p} value={p} />)}</datalist>
            <Button type="button" variant="secondary" onClick={addTerapeuta}>Agregar</Button>
          </div>
          {form.terapeutas.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {form.terapeutas.map((t) => (
                <li key={t} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-800 ring-1 ring-brand-200">
                  {t}
                  <button type="button" aria-label={`Quitar ${t}`} onClick={() => set('terapeutas', form.terapeutas.filter((x) => x !== t))} className="rounded-full p-0.5 hover:bg-brand-100">
                    <X className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="sm:col-span-2">
          <p className="mb-1 text-sm font-medium text-slate-700">Pacientes inscriptos ({form.inscriptos.length}/{form.cupo})</p>
          <PatientPicker value={pacienteDraft} onChange={addPaciente} patients={pacientesActivos.filter((p) => !form.inscriptos.includes(p.id))} placeholder="Agregar paciente..." />
          {form.inscriptos.length > 0 && (
            <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
              {form.inscriptos.map((pid) => {
                const p = db.pacientes.find((x) => x.id === pid);
                return (
                  <li key={pid} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                    <span>
                      <span className="font-medium text-slate-800">{p?.nombre ?? pid}</span>
                      <span className="ml-2 text-xs text-slate-400">{pid}</span>
                    </span>
                    <button type="button" aria-label="Quitar inscripción" onClick={() => set('inscriptos', form.inscriptos.filter((x) => x !== pid))} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600">
                      <X className="size-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <Field label="Objetivos del taller" className="sm:col-span-2">
          {(id) => <Textarea id={id} rows={3} value={form.objetivos} onChange={(e) => set('objetivos', e.target.value)} placeholder="Objetivos terapéuticos y comunitarios del dispositivo." />}
        </Field>
      </form>
    </Modal>
  );
}
