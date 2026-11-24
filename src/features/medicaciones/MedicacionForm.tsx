import { useState, type FormEvent } from 'react';
import { Button, Field, Input, Modal, Select, Textarea } from '@/components/ui';
import { useFeedback } from '@/components/feedback';
import { todayISO } from '@/lib/format';
import { useData } from '@/store/DataContext';
import { MOTIVOS_MEDICACION, type Medicacion, type MotivoMedicacion } from '@/types';

type FormState = Omit<Medicacion, 'id' | 'historial'>;

interface Props {
  open: boolean;
  onClose: () => void;
  pacienteId: string;
  medicacion?: Medicacion;
}

export function MedicacionFormModal(props: Props) {
  return props.open ? <MedicacionFormInner {...props} /> : null;
}

function MedicacionFormInner({ onClose, pacienteId, medicacion }: Props) {
  const { saveMedicacion } = useData();
  const { toast, toastError } = useFeedback();
  const [saving, setSaving] = useState(false);
  const [motivo, setMotivo] = useState<MotivoMedicacion>(medicacion ? 'Cambio de dosis' : 'Alta');
  const [detalleHistorial, setDetalleHistorial] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [form, setForm] = useState<FormState>(() => {
    if (medicacion) {
      const { id: _i, historial: _h, ...rest } = medicacion;
      return rest;
    }
    return {
      pacienteId,
      droga: '',
      presentacion: '',
      concentracion: '',
      dosis: '',
      horarios: '',
      fechaInicio: todayISO(),
      observaciones: '',
      activo: true,
    };
  });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const validate = () => {
    const e: typeof errors = {};
    if (!form.droga.trim()) e.droga = 'Indicá el nombre de la droga.';
    if (!form.fechaInicio) e.fechaInicio = 'Indicá la fecha de inicio.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await saveMedicacion(
        {
          ...form,
          id: medicacion?.id,
          historial: medicacion?.historial ?? [],
          droga: form.droga.trim(),
          presentacion: form.presentacion.trim(),
          concentracion: form.concentracion.trim(),
          dosis: form.dosis.trim(),
          horarios: form.horarios.trim(),
          observaciones: form.observaciones.trim(),
        },
        medicacion ? motivo : 'Alta',
        detalleHistorial.trim(),
      );
      toast(medicacion ? 'Medicación actualizada.' : 'Medicación registrada.');
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
      title={medicacion ? `Editar medicación · ${medicacion.id}` : 'Nueva medicación'}
      description="Cada cambio queda en el historial (alta, suspensión o cambio de dosis)."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="med-form" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
        </>
      }
    >
      <form id="med-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Field label="Nombre genérico (droga)" required error={errors.droga} className="sm:col-span-2">
          {(id) => <Input id={id} value={form.droga} onChange={(e) => set('droga', e.target.value)} invalid={!!errors.droga} autoFocus />}
        </Field>
        <Field label="Presentación">
          {(id) => <Input id={id} value={form.presentacion} onChange={(e) => set('presentacion', e.target.value)} placeholder="Comprimido, gotas, inyectable..." />}
        </Field>
        <Field label="Concentración">
          {(id) => <Input id={id} value={form.concentracion} onChange={(e) => set('concentracion', e.target.value)} placeholder="Ej.: 1 mg" />}
        </Field>
        <Field label="Dosis">
          {(id) => <Input id={id} value={form.dosis} onChange={(e) => set('dosis', e.target.value)} placeholder="Ej.: 1 comprimido" />}
        </Field>
        <Field label="Horarios">
          {(id) => <Input id={id} value={form.horarios} onChange={(e) => set('horarios', e.target.value)} placeholder="Mañana / mediodía / tarde / noche" />}
        </Field>
        <Field label="Fecha de inicio" required error={errors.fechaInicio}>
          {(id) => <Input id={id} type="date" value={form.fechaInicio} onChange={(e) => set('fechaInicio', e.target.value)} invalid={!!errors.fechaInicio} />}
        </Field>
        <Field label="Estado">
          {(id) => (
            <Select id={id} value={form.activo ? 'activo' : 'suspendido'} onChange={(e) => set('activo', e.target.value === 'activo')}>
              <option value="activo">Activa</option>
              <option value="suspendido">Suspendida</option>
            </Select>
          )}
        </Field>
        <Field label="Observaciones" className="sm:col-span-2">
          {(id) => <Textarea id={id} rows={2} value={form.observaciones} onChange={(e) => set('observaciones', e.target.value)} />}
        </Field>
        {medicacion && (
          <>
            <Field label="Motivo del cambio">
              {(id) => (
                <Select id={id} value={motivo} onChange={(e) => setMotivo(e.target.value as MotivoMedicacion)}>
                  {MOTIVOS_MEDICACION.filter((m) => m !== 'Alta').map((m) => <option key={m} value={m}>{m}</option>)}
                </Select>
              )}
            </Field>
            <Field label="Detalle del cambio">
              {(id) => <Input id={id} value={detalleHistorial} onChange={(e) => setDetalleHistorial(e.target.value)} placeholder="Qué cambió y por qué" />}
            </Field>
          </>
        )}
      </form>
    </Modal>
  );
}
