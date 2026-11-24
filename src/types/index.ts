// Modelo de dominio (Fundación Marandé). Fechas como texto ISO local:
//   fecha  -> "YYYY-MM-DD"      hora -> "HH:mm"      periodo -> "YYYY-MM"

export type EstadoPaciente = 'Activo' | 'Inactivo' | 'Otros';
export type TipoCobertura = 'Obra Social' | 'Prepaga' | 'Particular';
export type Modalidad = 'Individual' | 'Taller';
export type EstadoPresentacion = 'Pendiente' | 'Presentado' | 'Liquidado';
export type TramiteEstado = 'Sí' | 'No' | 'En trámite';
export type DiaSemana = 'Lun' | 'Mar' | 'Mié' | 'Jue' | 'Vie' | 'Sáb' | 'Dom';
export type MotivoMedicacion = 'Alta' | 'Suspensión' | 'Cambio de dosis' | 'Otro';

export const DIAS_SEMANA: DiaSemana[] = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
export const TRAMITE_ESTADOS: TramiteEstado[] = ['Sí', 'No', 'En trámite'];
export const ESTADOS_PACIENTE: EstadoPaciente[] = ['Activo', 'Inactivo', 'Otros'];

export interface ContactoReferente {
  nombre: string;
  vinculo: string;
  telefono: string;
  edad: string;
}

export interface Paciente {
  id: string; // PAC-001

  // 1. Datos personales / filiatorios
  nombre: string;
  dni: string;
  fechaNacimiento: string;
  genero: string;
  domicilio: string;
  conviveCon: string;
  telefono: string;
  nacionalidad: string;
  estadoCivil: string;
  escolaridad: string;
  ocupacion: string;
  /** Estado del CUD: Sí / No / En trámite */
  estadoCUD: TramiteEstado;
  nroCUD: string;
  vencimientoCUD: string;
  sube: TramiteEstado;
  pension: TramiteEstado;
  /** Nota u URL de foto (carga de archivo en una etapa posterior) */
  fotoNota: string;

  // 2. Contactos y red de apoyo
  referente: ContactoReferente;
  contactoEmergencia: string;
  curador: string;
  otrasInstituciones: string;

  // 3. Cobertura y administrativo
  tipoCobertura: TipoCobertura;
  cobertura: string;
  nroAfiliado: string;
  prestacionesAutorizadas: string;
  vencimientoAutorizacion: string;
  fechaIngreso: string;
  diasAsistencia: DiaSemana[];
  estado: EstadoPaciente;

  // 4. Admisión y datos clínicos
  motivoConsulta: string;
  derivacion: string;
  diagnostico: string;
  diagnosticoAutor: string;
  antecedentes: string;
  profesionalesExternos: string;
  condicionesMedicas: string;
  consentimientoFirmado: boolean;

  /** @deprecated Usar referente.nombre — se mantiene por compatibilidad de lectura. */
  tutor?: string;
}

export interface Area {
  id: string; // ARE-01
  nombre: string;
}

export interface EvolucionAddenda {
  id: string;
  fecha: string;
  hora: string;
  profesional: string;
  texto: string;
}

export interface Evolucion {
  id: string; // EVO-0001
  fecha: string;
  hora: string;
  pacienteId: string;
  areaId: string;
  profesional: string;
  modalidad: Modalidad;
  tallerId?: string;
  nota: string;
  objetivos: string;
  /** Una vez guardada, la nota original no se edita: solo se agregan adendas. */
  addendas: EvolucionAddenda[];
}

export interface MedicacionHistorial {
  id: string;
  fecha: string;
  motivo: MotivoMedicacion;
  detalle: string;
}

export interface Medicacion {
  id: string; // MED-0001
  pacienteId: string;
  droga: string;
  presentacion: string;
  concentracion: string;
  dosis: string;
  horarios: string;
  fechaInicio: string;
  observaciones: string;
  activo: boolean;
  historial: MedicacionHistorial[];
}

export interface Taller {
  id: string; // TAL-01
  nombre: string;
  descripcion: string;
  diasHorarios: string;
  terapeutas: string[]; // coordinación
  cupo: number;
  inscriptos: string[];
  objetivos: string;
  planTrabajo: string;
  materiales: string;
  notasEvolucion: string;
  activo: boolean;
}

export interface Facturacion {
  id: string; // FAC-2026-001
  periodo: string;
  cobertura: string;
  pacienteId: string;
  sesiones: number;
  practica: string;
  valorSesion: number;
  estado: EstadoPresentacion;
}

export interface Database {
  pacientes: Paciente[];
  evoluciones: Evolucion[];
  talleres: Taller[];
  facturacion: Facturacion[];
  areas: Area[];
  medicaciones: Medicacion[];
}

export type CollectionKey = keyof Database;
export type Entity<K extends CollectionKey> = Database[K][number];

export const COLLECTION_KEYS: CollectionKey[] = [
  'pacientes',
  'evoluciones',
  'talleres',
  'facturacion',
  'areas',
  'medicaciones',
];

export const ESTADOS_PRESENTACION: EstadoPresentacion[] = ['Pendiente', 'Presentado', 'Liquidado'];
export const TIPOS_COBERTURA: TipoCobertura[] = ['Obra Social', 'Prepaga', 'Particular'];
export const MODALIDADES: Modalidad[] = ['Individual', 'Taller'];
export const MOTIVOS_MEDICACION: MotivoMedicacion[] = ['Alta', 'Suspensión', 'Cambio de dosis', 'Otro'];
