import { useMemo, useState, type FormEvent } from 'react';
import { Button, Field, Input, Modal, Select } from '@/components/ui';
import { PatientPicker } from '@/components/PatientPicker';
import { useFeedback } from '@/components/feedback';
import { NOMENCLADOR } from '@/data/catalogs';
import { currentPeriod, formatCurrency } from '@/lib/format';
import { contarSesiones, practicaPorNombre, totalFacturar, valorSugerido } from '@/services/domain';
import { coberturasDisponibles } from '@/services/queries';
import { useData } from '@/store/DataContext';
import { ESTADOS_PRESENTACION, type EstadoPresentacion, type Facturacion } from '@/types';

type FormState = Omit<Facturacion, 'id'>;

interface Props {
  open: boolean;
  onClose: () => void;
  registro?: Facturacion;
  defaultPeriodo?: string;
  onSaved?: (f: Facturacion) => void;
}

export function FacturacionFormModal(props: Props) {
  return props.open ? <FacturacionFormInner {...props} /> : null;
}

function FacturacionFormInner({ onClose, registro, defaultPeriodo, onSaved }: Props) {
  const { db, saveFacturacion } = useData();
  const { toast, toastError } = useFeedback();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const [form, setForm] = useState<FormState>(() => {
    if (registro) {
      const { id: _id, ...rest } = registro;
      return rest;
    }
    return {
      periodo: defaultPeriodo || currentPeriod(),
      cobertura: '',
      pacienteId: '',
      sesiones: 1,
      practica: NOMENCLADOR[0]?.nombre ?? '',
      valorSesion: NOMENCLADOR[0]?.valor ?? 0,
      estado: 'Pendiente',
    };
  });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));
  const coberturas = useMemo(() => coberturasDisponibles(db), [db]);
  const pacientes = useMemo(
    () => db.pacientes.filter((p) => p.estado === 'Activo' || p.id === form.pacienteId).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    [db.pacientes, form.pacienteId],
  );
  const paciente = db.pacientes.find((p) => p.id === form.pacienteId);
  const total = totalFacturar(form);

  const applyPaciente = (id: string) => {
    const p = db.pacientes.find((x) => x.id === id);
    setForm((f) => {
      const practica = practicaPorNombre(f.practica);
      const cobertura = p?.cobertura ?? f.cobertura;
      return {
        ...f,
        pacienteId: id,
        cobertura: cobertura || f.cobertura,
        valorSesion: practica ? valorSugerido(practica, cobertura || f.cobertura) : f.valorSesion,
        sesiones: practica ? Math.max(1, contarSesiones(db.evoluciones, id, f.periodo, practica)) : f.sesiones,
      };
    });
  };

  const applyPractica = (nombre: string) => {
    const practica = practicaPorNombre(nombre);
    setForm((f) => ({
      ...f,
      practica: nombre,
      valorSesion: practica ? valorSugerido(practica, f.cobertura || paciente?.cobertura || '') : f.valorSesion,
      sesiones: practica && f.pacienteId
        ? Math.max(1, contarSesiones(db.evoluciones, f.pacienteId, f.periodo, practica))
        : f.sesiones,
    }));
  };

  const validate = () => {
    const e: typeof errors = {};
    if (!/^\d{4}-\d{2}$/.test(form.periodo)) e.periodo = 'Usá el formato AAAA-MM.';
    if (!form.pacienteId) e.pacienteId = 'Elegí un paciente.';
    if (!form.cobertura.trim()) e.cobertura = 'Indicá la cobertura.';
    if (!form.practica.trim()) e.practica = 'Indicá la práctica.';
    if (!form.sesiones || form.sesiones < 1) e.sesiones = 'Debe ser al menos 1.';
    if (form.valorSesion < 0) e.valorSesion = 'Valor inválido.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const saved = await saveFacturacion({
        ...form,
        id: registro?.id,
        cobertura: form.cobertura.trim(),
        practica: form.practica.trim(),
        sesiones: Number(form.sesiones),
        valorSesion: Number(form.valorSesion),
      });
      toast(registro ? 'Registro actualizado.' : `Registro creado: ${saved.id}.`);
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
      title={registro ? `Editar registro · ${registro.id}` : 'Nuevo registro de facturación'}
      description="El total se calcula automáticamente: sesiones × valor sesión."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="fact-form" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
        </>
      }
    >
      <form id="fact-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Field label="Mes / Año" required error={errors.periodo} hint="Formato AAAA-MM">
          {(id) => <Input id={id} type="month" value={form.periodo} onChange={(e) => set('periodo', e.target.value)} invalid={!!errors.periodo} />}
        </Field>
        <Field label="Estado de presentación">
          {(id) => (
            <Select id={id} value={form.estado} onChange={(e) => set('estado', e.target.value as EstadoPresentacion)}>
              {ESTADOS_PRESENTACION.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          )}
        </Field>
        <Field label="Paciente" required error={errors.pacienteId} className="sm:col-span-2" hint={paciente ? `Cobertura actual: ${paciente.cobertura}` : undefined}>
          {(id) => <PatientPicker id={id} value={form.pacienteId} patients={pacientes} invalid={!!errors.pacienteId} onChange={applyPaciente} />}
        </Field>
        <Field label="Obra Social / Cobertura" required error={errors.cobertura}>
          {(id) => (
            <>
              <Input id={id} list="cob-fact" value={form.cobertura} onChange={(e) => set('cobertura', e.target.value)} invalid={!!errors.cobertura} />
              <datalist id="cob-fact">{coberturas.map((c) => <option key={c} value={c} />)}</datalist>
            </>
          )}
        </Field>
        <Field label="Nomenclador / Práctica" required error={errors.practica}>
          {(id) => (
            <>
              <Input id={id} list="practicas" value={form.practica} onChange={(e) => applyPractica(e.target.value)} invalid={!!errors.practica} />
              <datalist id="practicas">{NOMENCLADOR.map((p) => <option key={p.nombre} value={p.nombre} />)}</datalist>
            </>
          )}
        </Field>
        <Field label="Cantidad de sesiones" required error={errors.sesiones}>
          {(id) => <Input id={id} type="number" min={1} value={form.sesiones} onChange={(e) => set('sesiones', Number(e.target.value) || 0)} invalid={!!errors.sesiones} />}
        </Field>
        <Field label="Valor sesión (ARS)" required error={errors.valorSesion}>
          {(id) => <Input id={id} type="number" min={0} step={100} value={form.valorSesion} onChange={(e) => set('valorSesion', Number(e.target.value) || 0)} invalid={!!errors.valorSesion} />}
        </Field>
        <div className="sm:col-span-2 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-900">
          <span className="font-medium">Total a facturar: </span>
          <span className="text-lg font-bold">{formatCurrency(total)}</span>
          <span className="ml-2 text-brand-700">({form.sesiones} × {formatCurrency(form.valorSesion)})</span>
        </div>
      </form>
    </Modal>
  );
}
