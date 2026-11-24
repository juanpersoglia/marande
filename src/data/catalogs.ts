import type { Modalidad, TipoCobertura } from '@/types';

/** Sugerencias de coberturas (el campo admite también texto libre). */
export const COBERTURAS: { nombre: string; tipo: TipoCobertura; factor: number }[] = [
  { nombre: 'IOSCOR', tipo: 'Obra Social', factor: 1 },
  { nombre: 'OSECAC', tipo: 'Obra Social', factor: 0.95 },
  { nombre: 'PAMI', tipo: 'Obra Social', factor: 0.9 },
  { nombre: 'PROFE - Incluir Salud', tipo: 'Obra Social', factor: 0.92 },
  { nombre: 'IOMA', tipo: 'Obra Social', factor: 0.95 },
  { nombre: 'OSDEPYM', tipo: 'Obra Social', factor: 1 },
  { nombre: 'OSDE', tipo: 'Prepaga', factor: 1.15 },
  { nombre: 'Swiss Medical', tipo: 'Prepaga', factor: 1.15 },
  { nombre: 'Galeno', tipo: 'Prepaga', factor: 1.1 },
  { nombre: 'Medifé', tipo: 'Prepaga', factor: 1.1 },
  { nombre: 'Particular', tipo: 'Particular', factor: 1.2 },
];

export interface PracticaNomenclador {
  nombre: string;
  /** Área cuyas evoluciones individuales cuentan para esta práctica. */
  areaId?: string;
  modalidad: Modalidad;
  valor: number; // valor de referencia por sesión (ARS)
}

/**
 * Nomenclador de prestaciones (valores de ejemplo, editables al cargar cada registro).
 * Los areaId corresponden a las áreas precargadas (ARE-01 ... ARE-07).
 */
export const NOMENCLADOR: PracticaNomenclador[] = [
  { nombre: 'Kinesiología y fisioterapia - sesión', areaId: 'ARE-01', modalidad: 'Individual', valor: 24500 },
  { nombre: 'Fonoaudiología - sesión', areaId: 'ARE-02', modalidad: 'Individual', valor: 26800 },
  { nombre: 'Terapia ocupacional - sesión', areaId: 'ARE-03', modalidad: 'Individual', valor: 26800 },
  { nombre: 'Psicopedagogía - sesión', areaId: 'ARE-04', modalidad: 'Individual', valor: 25200 },
  { nombre: 'Psicología - sesión', areaId: 'ARE-05', modalidad: 'Individual', valor: 27500 },
  { nombre: 'Musicoterapia - sesión', areaId: 'ARE-06', modalidad: 'Individual', valor: 23900 },
  { nombre: 'Psicomotricidad - sesión', areaId: 'ARE-07', modalidad: 'Individual', valor: 24300 },
  { nombre: 'Taller grupal terapéutico - jornada', modalidad: 'Taller', valor: 18900 },
];

export function tipoDeCobertura(nombre: string): TipoCobertura | undefined {
  return COBERTURAS.find((c) => c.nombre.toLowerCase() === nombre.trim().toLowerCase())?.tipo;
}
