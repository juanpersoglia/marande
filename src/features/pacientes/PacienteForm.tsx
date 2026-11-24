import { useMemo, useState, type FormEvent } from 'react';
import { Button, Field, Input, Modal, Select, Segmented } from '@/components/ui';
import { useFeedback } from '@/components/feedback';
import { COBERTURAS } from '@/data/catalogs';
import { formatAge, todayISO } from '@/lib/format';
import { useData } from '@/store/DataContext';
import { TIPOS_COBERTURA, type EstadoPaciente, type Paciente, type TipoCobertura } from '@/types';

type FormState = Omit<Paciente, 'id'>;

const EMPTY: FormState = {
  nombre: '', dni: '', fechaNacimiento: '', diagnostico: '', nroCUD: '', vencimientoCUD: '',
  tipoCobertura: 'Obra Social', cobertura: '', nroAfiliado: '', tutor: '', telefono: '', estado: 'Activo',
};

interface Props {
  open: boolean;
  onClose: () => void;
  paciente?: Paciente;
  onSaved?: (p: Paciente) => void;
}

export function PacienteFormModal(props: Props) {
  return props.open ? <PacienteFormInner {...props} /> : null;
}

function PacienteFormInner({ onClose, paciente, onSaved }: Props) {
  const { db, savePaciente } = useData();
  const { toast, toastError } = useFeedback();
  const [form, setForm] = useState<FormState>(() => {
    if (!paciente) return EMPTY;
    const { id: _id, ...rest } = paciente;
    return rest;
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const setTipo = (tipo: TipoCobertura) =>
    setForm((f) => ({
      ...f,
      tipoCobertura: tipo,
      cobertura: tipo === 'Particular' ? 'Particular' : f.cobertura === 'Particular' ? '' : f.cobertura,
      nroAfiliado: tipo === 'Particular' ? 'Particular' : f.nroAfiliado === 'Particular' ? '' : f.nroAfiliado,
    }));

  const sugerencias = useMemo(() => COBERTURAS.filter((c) => c.tipo === form.tipoCobertura), [form.tipoCobertura]);
  const particular = form.tipoCobertura === 'Particular';

  const validate = () => {
    const e: typeof errors = {};
    const dni = form.dni.replace(/\D/g, '');
    if (!form.nombre.trim()) e.nombre = 'Ingresá nombre y apellido.';
    if (dni.length < 6 || dni.length > 9) e.dni = 'El DNI debe tener entre 6 y 9 dígitos.';
    else if (db.pacientes.some((p) => p.dni === dni && p.id !== paciente?.id)) e.dni = 'Ya existe un paciente con este DNI.';
    if (!form.fechaNacimiento) e.fechaNacimiento = 'Ingresá la fecha de nacimiento.';
    else if (form.fechaNacimiento > todayISO()) e.fechaNacimiento = 'La fecha no puede ser futura.';
    if (!form.cobertura.trim()) e.cobertura = 'Indicá la cobertura.';
    if (!particular && !form.nroAfiliado.trim()) e.nroAfiliado = 'Ingresá el número de afiliado.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const saved = await savePaciente({
        ...form,
        id: paciente?.id,
        nombre: form.nombre.trim(),
        dni: form.dni.replace(/\D/g, ''),
        diagnostico: form.diagnostico.trim(),
        cobertura: form.cobertura.trim(),
        nroAfiliado: particular ? 'Particular' : form.nroAfiliado.trim(),
      });
      toast(paciente ? 'Paciente actualizado.' : `Paciente creado: ${saved.id}.`);
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
      title={paciente ? `Editar paciente · ${paciente.id}` : 'Nuevo paciente'}
      description={paciente ? undefined : 'El ID (PAC-###) se genera automáticamente al guardar.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="paciente-form" disabled={saving}>{saving ? 'Guardando...' : 'Guardar paciente'}</Button>
        </>
      }
    >
      <form id="paciente-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Field label="Nombre y apellido" required error={errors.nombre} className="sm:col-span-2">
          {(id) => <Input id={id} value={form.nombre} onChange={(e) => set('nombre', e.target.value)} invalid={!!errors.nombre} autoFocus />}
        </Field>
        <Field label="DNI" required error={errors.dni} hint="Solo números, sin puntos.">
          {(id) => <Input id={id} inputMode="numeric" value={form.dni} onChange={(e) => set('dni', e.target.value.replace(/\D/g, ''))} invalid={!!errors.dni} maxLength={9} />}
        </Field>
        <Field label="Fecha de nacimiento" required error={errors.fechaNacimiento} hint={form.fechaNacimiento ? `Edad: ${formatAge(form.fechaNacimiento)}` : undefined}>
          {(id) => <Input id={id} type="date" max={todayISO()} value={form.fechaNacimiento} onChange={(e) => set('fechaNacimiento', e.target.value)} invalid={!!errors.fechaNacimiento} />}
        </Field>
        <Field label="Diagnóstico principal (según CUD)" className="sm:col-span-2">
          {(id) => <Input id={id} value={form.diagnostico} onChange={(e) => set('diagnostico', e.target.value)} placeholder="Ej.: Trastorno del Espectro Autista (TEA) - nivel 2" />}
        </Field>
        <Field label="Nro. de CUD" hint="Dejá vacío si está en trámite.">
          {(id) => <Input id={id} value={form.nroCUD} onChange={(e) => set('nroCUD', e.target.value)} />}
        </Field>
        <Field label="Vencimiento del CUD">
          {(id) => <Input id={id} type="date" value={form.vencimientoCUD} onChange={(e) => set('vencimientoCUD', e.target.value)} />}
        </Field>

        <div className="sm:col-span-2">
          <p className="mb-1 text-sm font-medium text-slate-700">Tipo de cobertura</p>
          <Segmented<TipoCobertura>
            label="Tipo de cobertura"
            value={form.tipoCobertura}
            onChange={setTipo}
            options={TIPOS_COBERTURA.map((t) => ({ value: t, label: t === 'Obra Social' ? 'Obra Social' : t === 'Prepaga' ? 'Prepaga' : 'Particular' }))}
          />
        </div>
        <Field label="Cobertura / Obra Social" required error={errors.cobertura}>
          {(id) => (
            <>
              <Input id={id} list="coberturas-sugeridas" value={form.cobertura} disabled={particular} onChange={(e) => set('cobertura', e.target.value)} invalid={!!errors.cobertura} placeholder="Ej.: IOSCOR" />
              <datalist id="coberturas-sugeridas">{sugerencias.map((c) => <option key={c.nombre} value={c.nombre} />)}</datalist>
            </>
          )}
        </Field>
        <Field label="Nro. de afiliado" required={!particular} error={errors.nroAfiliado}>
          {(id) => <Input id={id} value={particular ? 'Particular' : form.nroAfiliado} disabled={particular} onChange={(e) => set('nroAfiliado', e.target.value)} invalid={!!errors.nroAfiliado} />}
        </Field>
        <Field label="Tutor / familiar responsable">
          {(id) => <Input id={id} value={form.tutor} onChange={(e) => set('tutor', e.target.value)} placeholder="Nombre y vínculo" />}
        </Field>
        <Field label="Teléfono de contacto">
          {(id) => <Input id={id} type="tel" value={form.telefono} onChange={(e) => set('telefono', e.target.value)} placeholder="Ej.: 379 4612345" />}
        </Field>
        <Field label="Estado">
          {(id) => (
            <Select id={id} value={form.estado} onChange={(e) => set('estado', e.target.value as EstadoPaciente)}>
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </Select>
          )}
        </Field>
      </form>
    </Modal>
  );
}
