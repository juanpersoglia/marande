// Modelo de dominio. Todas las fechas se guardan como texto ISO local:
//   fecha  -> "YYYY-MM-DD"      hora -> "HH:mm"      periodo -> "YYYY-MM"

export type EstadoPaciente = 'Activo' | 'Inactivo';
export type TipoCobertura = 'Obra Social' | 'Prepaga' | 'Particular';
export type Modalidad = 'Individual' | 'Taller';
export type EstadoPresentacion = 'Pendiente' | 'Presentado' | 'Liquidado';

export interface Paciente {
  id: string; // PAC-001
  nombre: string; // Nombre y apellido
  dni: string; // solo dígitos
  fechaNacimiento: string;
  diagnostico: string; // Diagnóstico principal (según CUD)
  nroCUD: string;
  vencimientoCUD: string; // vacío si no tiene / está en trámite
  tipoCobertura: TipoCobertura;
  cobertura: string; // IOSCOR, OSECAC, PAMI, OSDE, Particular...
  nroAfiliado: string; // "Particular" si corresponde
  tutor: string;
  telefono: string;
  estado: EstadoPaciente;
}

export interface Area {
  id: string; // ARE-01
  nombre: string;
}

export interface Evolucion {
  id: string; // EVO-0001
  fecha: string;
  hora: string;
  pacienteId: string;
  areaId: string;
  profesional: string;
  modalidad: Modalidad;
  tallerId?: string; // solo cuando modalidad = Taller
  nota: string;
  objetivos: string;
}

export interface Taller {
  id: string; // TAL-01
  nombre: string;
  diasHorarios: string;
  terapeutas: string[];
  cupo: number;
  inscriptos: string[]; // IDs de pacientes
  objetivos: string;
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

/** Colecciones persistidas. Los nombres coinciden con los endpoints de la API. */
export interface Database {
  pacientes: Paciente[];
  evoluciones: Evolucion[];
  talleres: Taller[];
  facturacion: Facturacion[];
  areas: Area[];
}

export type CollectionKey = keyof Database;
export type Entity<K extends CollectionKey> = Database[K][number];

export const COLLECTION_KEYS: CollectionKey[] = ['pacientes', 'evoluciones', 'talleres', 'facturacion', 'areas'];

export const ESTADOS_PRESENTACION: EstadoPresentacion[] = ['Pendiente', 'Presentado', 'Liquidado'];
export const TIPOS_COBERTURA: TipoCobertura[] = ['Obra Social', 'Prepaga', 'Particular'];
export const MODALIDADES: Modalidad[] = ['Individual', 'Taller'];
