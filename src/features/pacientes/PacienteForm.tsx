import { useMemo, useState, type FormEvent } from 'react';
import { Button, Field, Input, Modal, Select, Segmented, Tabs, Textarea } from '@/components/ui';
import { useFeedback } from '@/components/feedback';
import { COBERTURAS } from '@/data/catalogs';
import { formatAge, todayISO } from '@/lib/format';
import { useData } from '@/store/DataContext';
import {
  DIAS_SEMANA,
  ESTADOS_PACIENTE,
  TIPOS_COBERTURA,
  TRAMITE_ESTADOS,
  type DiaSemana,
  type EstadoPaciente,
  type Paciente,
  type TipoCobertura,
  type TramiteEstado,
} from '@/types';

type FormState = Omit<Paciente, 'id'>;
type Tab = 'personales' | 'contactos' | 'cobertura' | 'clinico';

const EMPTY: FormState = {
  nombre: '', dni: '', fechaNacimiento: '', genero: '', domicilio: '', conviveCon: '', telefono: '',
  nacionalidad: 'Argentina', estadoCivil: '', escolaridad: '', ocupacion: '',
  estadoCUD: 'En trámite', nroCUD: '', vencimientoCUD: '', sube: 'No', pension: 'No', fotoNota: '',
  referente: { nombre: '', vinculo: '', telefono: '', edad: '' },
  contactoEmergencia: '', curador: '', otrasInstituciones: '',
  tipoCobertura: 'Obra Social', cobertura: '', nroAfiliado: '',
  prestacionesAutorizadas: '', vencimientoAutorizacion: '', fechaIngreso: '', diasAsistencia: [],
  estado: 'Activo',
  motivoConsulta: '', derivacion: '', diagnostico: '', diagnosticoAutor: '',
  antecedentes: '', profesionalesExternos: '', condicionesMedicas: '', consentimientoFirmado: false,
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
  const [tab, setTab] = useState<Tab>('personales');
  const [form, setForm] = useState<FormState>(() => {
    if (!paciente) return EMPTY;
    const { id: _id, tutor: _t, ...rest } = paciente;
    return rest;
  });
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));
  const setRef = (key: keyof FormState['referente'], value: string) =>
    setForm((f) => ({ ...f, referente: { ...f.referente, [key]: value } }));

  const setTipo = (tipo: TipoCobertura) =>
    setForm((f) => ({
      ...f,
      tipoCobertura: tipo,
      cobertura: tipo === 'Particular' ? 'Particular' : f.cobertura === 'Particular' ? '' : f.cobertura,
      nroAfiliado: tipo === 'Particular' ? 'Particular' : f.nroAfiliado === 'Particular' ? '' : f.nroAfiliado,
    }));

  const toggleDia = (dia: DiaSemana) =>
    setForm((f) => ({
      ...f,
      diasAsistencia: f.diasAsistencia.includes(dia)
        ? f.diasAsistencia.filter((d) => d !== dia)
        : [...f.diasAsistencia, dia],
    }));

  const sugerencias = useMemo(() => COBERTURAS.filter((c) => c.tipo === form.tipoCobertura), [form.tipoCobertura]);
  const particular = form.tipoCobertura === 'Particular';
  const cudSi = form.estadoCUD === 'Sí';

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
    if (e.nombre || e.dni || e.fechaNacimiento) setTab('personales');
    else if (e.cobertura || e.nroAfiliado) setTab('cobertura');
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
        nroCUD: cudSi ? form.nroCUD.trim() : form.estadoCUD === 'No' ? '' : form.nroCUD.trim(),
        vencimientoCUD: cudSi ? form.vencimientoCUD : '',
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
      size="xl"
      title={paciente ? `Editar paciente · ${paciente.id}` : 'Nuevo paciente'}
      description={paciente ? undefined : 'Completá al menos los datos personales. El resto se puede cargar después.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="paciente-form" disabled={saving}>{saving ? 'Guardando...' : 'Guardar paciente'}</Button>
        </>
      }
    >
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'personales', label: 'Personales' },
          { value: 'contactos', label: 'Contactos' },
          { value: 'cobertura', label: 'Cobertura' },
          { value: 'clinico', label: 'Clínico' },
        ]}
      />

      <form id="paciente-form" onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2" noValidate>
        {tab === 'personales' && (
          <>
            <Field label="Nombre completo" required error={errors.nombre} className="sm:col-span-2">
              {(id) => <Input id={id} value={form.nombre} onChange={(e) => set('nombre', e.target.value)} invalid={!!errors.nombre} autoFocus />}
            </Field>
            <Field label="DNI" required error={errors.dni} hint="Solo números, sin puntos.">
              {(id) => <Input id={id} inputMode="numeric" value={form.dni} onChange={(e) => set('dni', e.target.value.replace(/\D/g, ''))} invalid={!!errors.dni} maxLength={9} />}
            </Field>
            <Field label="Fecha de nacimiento" required error={errors.fechaNacimiento} hint={form.fechaNacimiento ? `Edad: ${formatAge(form.fechaNacimiento)}` : undefined}>
              {(id) => <Input id={id} type="date" max={todayISO()} value={form.fechaNacimiento} onChange={(e) => set('fechaNacimiento', e.target.value)} invalid={!!errors.fechaNacimiento} />}
            </Field>
            <Field label="Género / pronombres">
              {(id) => <Input id={id} value={form.genero} onChange={(e) => set('genero', e.target.value)} placeholder="Ej.: Femenino / ella" />}
            </Field>
            <Field label="Teléfono">
              {(id) => <Input id={id} type="tel" value={form.telefono} onChange={(e) => set('telefono', e.target.value)} placeholder="Ej.: 379 4612345" />}
            </Field>
            <Field label="Domicilio" className="sm:col-span-2">
              {(id) => <Input id={id} value={form.domicilio} onChange={(e) => set('domicilio', e.target.value)} />}
            </Field>
            <Field label="¿Con quién convive?" className="sm:col-span-2">
              {(id) => <Input id={id} value={form.conviveCon} onChange={(e) => set('conviveCon', e.target.value)} />}
            </Field>
            <Field label="Nacionalidad">
              {(id) => <Input id={id} value={form.nacionalidad} onChange={(e) => set('nacionalidad', e.target.value)} />}
            </Field>
            <Field label="Estado civil">
              {(id) => <Input id={id} value={form.estadoCivil} onChange={(e) => set('estadoCivil', e.target.value)} />}
            </Field>
            <Field label="Escolaridad / nivel educativo">
              {(id) => <Input id={id} value={form.escolaridad} onChange={(e) => set('escolaridad', e.target.value)} />}
            </Field>
            <Field label="Ocupación">
              {(id) => <Input id={id} value={form.ocupacion} onChange={(e) => set('ocupacion', e.target.value)} />}
            </Field>

            <div className="sm:col-span-2">
              <p className="mb-1 text-sm font-medium text-slate-700">CUD</p>
              <Segmented<TramiteEstado> label="CUD" value={form.estadoCUD} onChange={(v) => set('estadoCUD', v)}
                options={TRAMITE_ESTADOS.map((t) => ({ value: t, label: t }))} />
            </div>
            {form.estadoCUD !== 'No' && (
              <>
                <Field label="Nro. de CUD" hint={form.estadoCUD === 'En trámite' ? 'Opcional si aún no lo tiene.' : undefined}>
                  {(id) => <Input id={id} value={form.nroCUD} onChange={(e) => set('nroCUD', e.target.value)} />}
                </Field>
                {cudSi && (
                  <Field label="Vencimiento del CUD">
                    {(id) => <Input id={id} type="date" value={form.vencimientoCUD} onChange={(e) => set('vencimientoCUD', e.target.value)} />}
                  </Field>
                )}
              </>
            )}

            <div>
              <p className="mb-1 text-sm font-medium text-slate-700">SUBE</p>
              <Segmented<TramiteEstado> label="SUBE" value={form.sube} onChange={(v) => set('sube', v)}
                options={TRAMITE_ESTADOS.map((t) => ({ value: t, label: t }))} />
            </div>
            <div>
              <p className="mb-1 text-sm font-medium text-slate-700">Pensión</p>
              <Segmented<TramiteEstado> label="Pensión" value={form.pension} onChange={(v) => set('pension', v)}
                options={TRAMITE_ESTADOS.map((t) => ({ value: t, label: t }))} />
            </div>
            <Field label="Foto (nota u observación)" hint="La carga de archivos se suma en una etapa posterior." className="sm:col-span-2">
              {(id) => <Input id={id} value={form.fotoNota} onChange={(e) => set('fotoNota', e.target.value)} placeholder="Ej.: Foto en legajo físico / carpeta Drive" />}
            </Field>
          </>
        )}

        {tab === 'contactos' && (
          <>
            <p className="sm:col-span-2 text-sm font-semibold text-slate-800">Familiar o referente a cargo</p>
            <Field label="Nombre">
              {(id) => <Input id={id} value={form.referente.nombre} onChange={(e) => setRef('nombre', e.target.value)} />}
            </Field>
            <Field label="Vínculo">
              {(id) => <Input id={id} value={form.referente.vinculo} onChange={(e) => setRef('vinculo', e.target.value)} placeholder="Madre, padre, hermana..." />}
            </Field>
            <Field label="Teléfono">
              {(id) => <Input id={id} type="tel" value={form.referente.telefono} onChange={(e) => setRef('telefono', e.target.value)} />}
            </Field>
            <Field label="Edad">
              {(id) => <Input id={id} value={form.referente.edad} onChange={(e) => setRef('edad', e.target.value)} />}
            </Field>
            <Field label="Contacto de emergencia" className="sm:col-span-2">
              {(id) => <Input id={id} value={form.contactoEmergencia} onChange={(e) => set('contactoEmergencia', e.target.value)} placeholder="Nombre, vínculo y teléfono" />}
            </Field>
            <Field label="Apoyo o curador/a judicial (si hay)" className="sm:col-span-2">
              {(id) => <Input id={id} value={form.curador} onChange={(e) => set('curador', e.target.value)} />}
            </Field>
            <Field label="Otras instituciones que intervienen" hint="Escuela, juzgado, defensoría, SENAF, etc." className="sm:col-span-2">
              {(id) => <Textarea id={id} rows={3} value={form.otrasInstituciones} onChange={(e) => set('otrasInstituciones', e.target.value)} />}
            </Field>
          </>
        )}

        {tab === 'cobertura' && (
          <>
            <div className="sm:col-span-2">
              <p className="mb-1 text-sm font-medium text-slate-700">Tipo de cobertura</p>
              <Segmented<TipoCobertura>
                label="Tipo de cobertura"
                value={form.tipoCobertura}
                onChange={setTipo}
                options={TIPOS_COBERTURA.map((t) => ({ value: t, label: t }))}
              />
            </div>
            <Field label="Obra social / Prepaga / Cobertura" required error={errors.cobertura}>
              {(id) => (
                <>
                  <Input id={id} list="coberturas-sugeridas" value={form.cobertura} disabled={particular} onChange={(e) => set('cobertura', e.target.value)} invalid={!!errors.cobertura} placeholder="Ej.: IOSCOR, PAMI, Incluir Salud" />
                  <datalist id="coberturas-sugeridas">{sugerencias.map((c) => <option key={c.nombre} value={c.nombre} />)}</datalist>
                </>
              )}
            </Field>
            <Field label="Nro. de afiliado" required={!particular} error={errors.nroAfiliado}>
              {(id) => <Input id={id} value={particular ? 'Particular' : form.nroAfiliado} disabled={particular} onChange={(e) => set('nroAfiliado', e.target.value)} invalid={!!errors.nroAfiliado} />}
            </Field>
            <Field label="Prestaciones autorizadas" className="sm:col-span-2">
              {(id) => <Input id={id} value={form.prestacionesAutorizadas} onChange={(e) => set('prestacionesAutorizadas', e.target.value)} placeholder="Ej.: Centro de día jornada simple, prestaciones de apoyo" />}
            </Field>
            <Field label="Vencimiento de autorizaciones">
              {(id) => <Input id={id} type="date" value={form.vencimientoAutorizacion} onChange={(e) => set('vencimientoAutorizacion', e.target.value)} />}
            </Field>
            <Field label="Fecha de ingreso al centro">
              {(id) => <Input id={id} type="date" value={form.fechaIngreso} onChange={(e) => set('fechaIngreso', e.target.value)} />}
            </Field>
            <div className="sm:col-span-2">
              <p className="mb-2 text-sm font-medium text-slate-700">Días de asistencia</p>
              <div className="flex flex-wrap gap-2">
                {DIAS_SEMANA.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDia(d)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium ring-1 ${form.diasAsistencia.includes(d) ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <Field label="Estado">
              {(id) => (
                <Select id={id} value={form.estado} onChange={(e) => set('estado', e.target.value as EstadoPaciente)}>
                  {ESTADOS_PACIENTE.map((s) => <option key={s} value={s}>{s}</option>)}
                </Select>
              )}
            </Field>
          </>
        )}

        {tab === 'clinico' && (
          <>
            <Field label="Motivo de consulta" className="sm:col-span-2">
              {(id) => <Textarea id={id} rows={2} value={form.motivoConsulta} onChange={(e) => set('motivoConsulta', e.target.value)} />}
            </Field>
            <Field label="Derivación" className="sm:col-span-2">
              {(id) => <Input id={id} value={form.derivacion} onChange={(e) => set('derivacion', e.target.value)} />}
            </Field>
            <Field label="Diagnóstico(s)" className="sm:col-span-2">
              {(id) => <Textarea id={id} rows={2} value={form.diagnostico} onChange={(e) => set('diagnostico', e.target.value)} />}
            </Field>
            <Field label="¿Quién realizó el diagnóstico?" className="sm:col-span-2">
              {(id) => <Input id={id} value={form.diagnosticoAutor} onChange={(e) => set('diagnosticoAutor', e.target.value)} />}
            </Field>
            <Field label="Antecedentes (tratamientos, internaciones)" className="sm:col-span-2">
              {(id) => <Textarea id={id} rows={2} value={form.antecedentes} onChange={(e) => set('antecedentes', e.target.value)} />}
            </Field>
            <Field label="Profesionales tratantes externos" hint="Nombre y especialidad" className="sm:col-span-2">
              {(id) => <Textarea id={id} rows={2} value={form.profesionalesExternos} onChange={(e) => set('profesionalesExternos', e.target.value)} />}
            </Field>
            <Field label="Condiciones médicas relevantes" className="sm:col-span-2">
              {(id) => <Textarea id={id} rows={2} value={form.condicionesMedicas} onChange={(e) => set('condicionesMedicas', e.target.value)} />}
            </Field>
            <label className="sm:col-span-2 flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="size-4 rounded border-slate-300"
                checked={form.consentimientoFirmado}
                onChange={(e) => set('consentimientoFirmado', e.target.checked)}
              />
              Consentimiento informado firmado
            </label>
          </>
        )}
      </form>
    </Modal>
  );
}
