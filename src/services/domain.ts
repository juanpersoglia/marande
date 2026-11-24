import { COBERTURAS, NOMENCLADOR, type PracticaNomenclador } from '@/data/catalogs';
import { daysUntil, normalizeText } from '@/lib/format';
import type { Database, Evolucion, Facturacion, Paciente, Taller } from '@/types';

// ---------- Facturación ----------
export const totalFacturar = (f: Pick<Facturacion, 'sesiones' | 'valorSesion'>) =>
  (Number(f.sesiones) || 0) * (Number(f.valorSesion) || 0);

export function sumTotals(items: Facturacion[]) {
  return items.reduce(
    (acc, f) => {
      const total = totalFacturar(f);
      acc.total += total;
      acc.sesiones += f.sesiones;
      acc.porEstado[f.estado] += total;
      acc.cantidadPorEstado[f.estado] += 1;
      return acc;
    },
    {
      total: 0,
      sesiones: 0,
      porEstado: { Pendiente: 0, Presentado: 0, Liquidado: 0 },
      cantidadPorEstado: { Pendiente: 0, Presentado: 0, Liquidado: 0 },
    },
  );
}

export function practicaPorNombre(nombre: string): PracticaNomenclador | undefined {
  const n = normalizeText(nombre.trim());
  return NOMENCLADOR.find((p) => normalizeText(p.nombre) === n);
}

/** Práctica del nomenclador que corresponde a una evolución. */
export function practicaDeEvolucion(e: Pick<Evolucion, 'areaId' | 'modalidad'>): PracticaNomenclador | undefined {
  if (e.modalidad === 'Taller') return NOMENCLADOR.find((p) => p.modalidad === 'Taller');
  return NOMENCLADOR.find((p) => p.modalidad === 'Individual' && p.areaId === e.areaId);
}

/** Valor sugerido por sesión según cobertura (aplica un factor sobre el valor de referencia). */
export function valorSugerido(practica: PracticaNomenclador, cobertura: string): number {
  const factor = COBERTURAS.find((c) => normalizeText(c.nombre) === normalizeText(cobertura))?.factor ?? 1;
  return Math.round((practica.valor * factor) / 100) * 100;
}

/** Cuenta las sesiones registradas en evoluciones para un paciente/período/práctica. */
export function contarSesiones(
  evoluciones: Evolucion[],
  pacienteId: string,
  periodo: string,
  practica: PracticaNomenclador | undefined,
): number {
  if (!practica) return 0;
  return evoluciones.filter(
    (e) =>
      e.pacienteId === pacienteId &&
      e.fecha.startsWith(periodo) &&
      e.modalidad === practica.modalidad &&
      (practica.modalidad === 'Taller' || e.areaId === practica.areaId),
  ).length;
}

/** Borradores de liquidación para un período, a partir de las evoluciones (omite los ya cargados). */
export function borradoresDesdeEvoluciones(db: Database, periodo: string) {
  const grupos = new Map<string, { paciente: Paciente; practica: PracticaNomenclador; sesiones: number }>();
  for (const e of db.evoluciones) {
    if (!e.fecha.startsWith(periodo)) continue;
    const paciente = db.pacientes.find((p) => p.id === e.pacienteId);
    const practica = practicaDeEvolucion(e);
    if (!paciente || !practica) continue;
    const key = `${paciente.id}|${practica.nombre}`;
    const g = grupos.get(key) ?? { paciente, practica, sesiones: 0 };
    g.sesiones += 1;
    grupos.set(key, g);
  }
  return [...grupos.values()]
    .filter(
      (g) =>
        !db.facturacion.some(
          (f) => f.periodo === periodo && f.pacienteId === g.paciente.id && f.practica === g.practica.nombre,
        ),
    )
    .map((g) => ({
      periodo,
      pacienteId: g.paciente.id,
      cobertura: g.paciente.cobertura,
      practica: g.practica.nombre,
      sesiones: g.sesiones,
      valorSesion: valorSugerido(g.practica, g.paciente.cobertura),
    }))
    .sort((a, b) => a.pacienteId.localeCompare(b.pacienteId) || a.practica.localeCompare(b.practica));
}

// ---------- CUD ----------
export type CudNivel = 'sin-datos' | 'vencido' | 'critico' | 'por-vencer' | 'vigente';
export interface CudEstado {
  nivel: CudNivel;
  dias?: number;
  texto: string;
}

export const CUD_AVISO_DIAS = 90;
export const CUD_CRITICO_DIAS = 30;

export function estadoCUD(p: Pick<Paciente, 'vencimientoCUD' | 'nroCUD'>): CudEstado {
  if (!p.vencimientoCUD) return { nivel: 'sin-datos', texto: p.nroCUD ? 'Sin fecha' : 'En trámite / sin CUD' };
  const dias = daysUntil(p.vencimientoCUD);
  if (dias < 0) return { nivel: 'vencido', dias, texto: `Vencido hace ${-dias} ${dias === -1 ? 'día' : 'días'}` };
  if (dias === 0) return { nivel: 'critico', dias, texto: 'Vence hoy' };
  if (dias <= CUD_CRITICO_DIAS) return { nivel: 'critico', dias, texto: `Vence en ${dias} ${dias === 1 ? 'día' : 'días'}` };
  if (dias <= CUD_AVISO_DIAS) return { nivel: 'por-vencer', dias, texto: `Vence en ${dias} días` };
  return { nivel: 'vigente', dias, texto: 'Vigente' };
}

export const cudRequiereAtencion = (p: Paciente) => {
  const n = estadoCUD(p).nivel;
  return p.estado === 'Activo' && (n === 'vencido' || n === 'critico' || n === 'por-vencer');
};

// ---------- Talleres ----------
export const ocupacion = (t: Taller) => ({
  inscriptos: t.inscriptos.length,
  cupo: t.cupo,
  porcentaje: t.cupo > 0 ? Math.min(100, Math.round((t.inscriptos.length / t.cupo) * 100)) : 0,
  completo: t.inscriptos.length >= t.cupo,
});

// ---------- Varios ----------
export const sortEvolucionesDesc = (items: Evolucion[]) =>
  [...items].sort((a, b) => `${b.fecha} ${b.hora}`.localeCompare(`${a.fecha} ${a.hora}`));
