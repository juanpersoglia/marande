import type {
  Database,
  DiaSemana,
  Evolucion,
  Medicacion,
  Paciente,
  Taller,
  TramiteEstado,
} from '@/types';
import { DIAS_SEMANA } from '@/types';

const TRAMITES: TramiteEstado[] = ['Sí', 'No', 'En trámite'];

function asTramite(v: unknown, fallback: TramiteEstado = 'No'): TramiteEstado {
  return TRAMITES.includes(v as TramiteEstado) ? (v as TramiteEstado) : fallback;
}

function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function asBool(v: unknown, fallback = false): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

function parseReferente(raw: Record<string, unknown>): Paciente['referente'] {
  const ref = (raw.referente && typeof raw.referente === 'object' ? raw.referente : {}) as Record<string, unknown>;
  const tutor = asString(raw.tutor);
  return {
    nombre: asString(ref.nombre) || tutor.replace(/\s*\([^)]*\)\s*$/, '').trim() || tutor,
    vinculo: asString(ref.vinculo) || (/\(([^)]+)\)/.exec(tutor)?.[1] ?? ''),
    telefono: asString(ref.telefono) || asString(raw.telefono),
    edad: asString(ref.edad),
  };
}

function parseDias(v: unknown): DiaSemana[] {
  if (!Array.isArray(v)) return [];
  return v.filter((d): d is DiaSemana => DIAS_SEMANA.includes(d as DiaSemana));
}

/** Completa campos nuevos en pacientes guardados con el esquema anterior. */
export function normalizePaciente(raw: Partial<Paciente> & { id: string }): Paciente {
  const r = raw as Record<string, unknown>;
  const nroCUD = asString(raw.nroCUD);
  const vencimientoCUD = asString(raw.vencimientoCUD);
  let estadoCUD = asTramite(raw.estadoCUD, nroCUD || vencimientoCUD ? 'Sí' : 'En trámite');
  if (!raw.estadoCUD && !nroCUD && !vencimientoCUD) estadoCUD = 'En trámite';

  const estadoRaw = asString(raw.estado, 'Activo');
  const estado = estadoRaw === 'Inactivo' || estadoRaw === 'Otros' ? estadoRaw : 'Activo';

  return {
    id: raw.id,
    nombre: asString(raw.nombre),
    dni: asString(raw.dni).replace(/\D/g, ''),
    fechaNacimiento: asString(raw.fechaNacimiento),
    genero: asString(raw.genero),
    domicilio: asString(raw.domicilio),
    conviveCon: asString(raw.conviveCon),
    telefono: asString(raw.telefono),
    nacionalidad: asString(raw.nacionalidad, 'Argentina'),
    estadoCivil: asString(raw.estadoCivil),
    escolaridad: asString(raw.escolaridad),
    ocupacion: asString(raw.ocupacion),
    estadoCUD,
    nroCUD,
    vencimientoCUD,
    sube: asTramite(raw.sube, 'No'),
    pension: asTramite(raw.pension, 'No'),
    fotoNota: asString(raw.fotoNota),
    referente: parseReferente(r),
    contactoEmergencia: asString(raw.contactoEmergencia) || asString(raw.telefono),
    curador: asString(raw.curador),
    otrasInstituciones: asString(raw.otrasInstituciones),
    tipoCobertura: raw.tipoCobertura === 'Prepaga' || raw.tipoCobertura === 'Particular' ? raw.tipoCobertura : 'Obra Social',
    cobertura: asString(raw.cobertura),
    nroAfiliado: asString(raw.nroAfiliado),
    prestacionesAutorizadas: asString(raw.prestacionesAutorizadas),
    vencimientoAutorizacion: asString(raw.vencimientoAutorizacion),
    fechaIngreso: asString(raw.fechaIngreso),
    diasAsistencia: parseDias(raw.diasAsistencia),
    estado,
    motivoConsulta: asString(raw.motivoConsulta),
    derivacion: asString(raw.derivacion),
    diagnostico: asString(raw.diagnostico),
    diagnosticoAutor: asString(raw.diagnosticoAutor),
    antecedentes: asString(raw.antecedentes),
    profesionalesExternos: asString(raw.profesionalesExternos),
    condicionesMedicas: asString(raw.condicionesMedicas),
    consentimientoFirmado: asBool(raw.consentimientoFirmado),
  };
}

export function normalizeEvolucion(raw: Partial<Evolucion> & { id: string }): Evolucion {
  return {
    id: raw.id,
    fecha: asString(raw.fecha),
    hora: asString(raw.hora, '00:00'),
    pacienteId: asString(raw.pacienteId),
    areaId: asString(raw.areaId),
    profesional: asString(raw.profesional),
    modalidad: raw.modalidad === 'Taller' ? 'Taller' : 'Individual',
    tallerId: raw.tallerId || undefined,
    nota: asString(raw.nota),
    objetivos: asString(raw.objetivos),
    addendas: Array.isArray(raw.addendas) ? raw.addendas : [],
  };
}

export function normalizeTaller(raw: Partial<Taller> & { id: string }): Taller {
  return {
    id: raw.id,
    nombre: asString(raw.nombre),
    descripcion: asString(raw.descripcion),
    diasHorarios: asString(raw.diasHorarios),
    terapeutas: Array.isArray(raw.terapeutas) ? raw.terapeutas.filter((t): t is string => typeof t === 'string') : [],
    cupo: typeof raw.cupo === 'number' && raw.cupo > 0 ? raw.cupo : 8,
    inscriptos: Array.isArray(raw.inscriptos) ? raw.inscriptos.filter((t): t is string => typeof t === 'string') : [],
    objetivos: asString(raw.objetivos),
    planTrabajo: asString(raw.planTrabajo),
    materiales: asString(raw.materiales),
    notasEvolucion: asString(raw.notasEvolucion),
    activo: raw.activo !== false,
  };
}

export function normalizeMedicacion(raw: Partial<Medicacion> & { id: string }): Medicacion {
  return {
    id: raw.id,
    pacienteId: asString(raw.pacienteId),
    droga: asString(raw.droga),
    presentacion: asString(raw.presentacion),
    concentracion: asString(raw.concentracion),
    dosis: asString(raw.dosis),
    horarios: asString(raw.horarios),
    fechaInicio: asString(raw.fechaInicio),
    observaciones: asString(raw.observaciones),
    activo: raw.activo !== false,
    historial: Array.isArray(raw.historial) ? raw.historial : [],
  };
}

export function normalizeDatabase(db: Partial<Database>): Database {
  return {
    pacientes: (db.pacientes ?? []).map((p) => normalizePaciente(p)),
    evoluciones: (db.evoluciones ?? []).map((e) => normalizeEvolucion(e)),
    talleres: (db.talleres ?? []).map((t) => normalizeTaller(t)),
    facturacion: db.facturacion ?? [],
    areas: db.areas ?? [],
    medicaciones: (db.medicaciones ?? []).map((m) => normalizeMedicacion(m)),
  };
}
