import { currentPeriod, todayISO } from '@/lib/format';
import { cudRequiereAtencion, estadoCUD, ocupacion, sumTotals, totalFacturar } from '@/services/domain';
import type { Database } from '@/types';

/** Profesionales conocidos (de evoluciones y talleres) para autocompletar. */
export function listarProfesionales(db: Database): string[] {
  const set = new Set<string>();
  db.evoluciones.forEach((e) => e.profesional && set.add(e.profesional));
  db.talleres.forEach((t) => t.terapeutas.forEach((x) => set.add(x)));
  return [...set].sort((a, b) => a.localeCompare(b, 'es'));
}

export function periodosDisponibles(db: Database): string[] {
  const set = new Set(db.facturacion.map((f) => f.periodo));
  set.add(currentPeriod());
  return [...set].sort().reverse();
}

export function coberturasDisponibles(db: Database): string[] {
  const set = new Set<string>();
  db.pacientes.forEach((p) => set.add(p.cobertura));
  db.facturacion.forEach((f) => set.add(f.cobertura));
  return [...set].filter(Boolean).sort((a, b) => a.localeCompare(b, 'es'));
}

export function dashboardStats(db: Database) {
  const hoy = todayISO();
  const periodo = currentPeriod();

  const activos = db.pacientes.filter((p) => p.estado === 'Activo');
  const evolucionesHoy = db.evoluciones.filter((e) => e.fecha === hoy).length;
  const evolucionesMes = db.evoluciones.filter((e) => e.fecha.startsWith(periodo));

  const talleresActivos = db.talleres.filter((t) => t.activo);
  const inscriptosTotal = talleresActivos.reduce((s, t) => s + t.inscriptos.length, 0);
  const cupoTotal = talleresActivos.reduce((s, t) => s + t.cupo, 0);

  const factMes = db.facturacion.filter((f) => f.periodo === periodo);
  const totalesMes = sumTotals(factMes);

  const porCobertura = new Map<string, number>();
  factMes.forEach((f) => porCobertura.set(f.cobertura, (porCobertura.get(f.cobertura) ?? 0) + totalFacturar(f)));

  const porArea = new Map<string, number>();
  evolucionesMes.forEach((e) => porArea.set(e.areaId, (porArea.get(e.areaId) ?? 0) + 1));

  // Alertas
  const cudAlertas = db.pacientes
    .filter(cudRequiereAtencion)
    .sort((a, b) => (estadoCUD(a).dias ?? 0) - (estadoCUD(b).dias ?? 0));

  const atrasadas = db.facturacion.filter((f) => f.periodo < periodo && f.estado === 'Pendiente');
  const presentadasSinLiquidar = db.facturacion.filter((f) => f.periodo < periodo && f.estado === 'Presentado');
  const talleresCompletos = talleresActivos.filter((t) => ocupacion(t).completo);

  return {
    hoy,
    periodo,
    activos: activos.length,
    inactivos: db.pacientes.length - activos.length,
    evolucionesHoy,
    evolucionesMes: evolucionesMes.length,
    talleresActivos: talleresActivos.length,
    inscriptosTotal,
    cupoTotal,
    totalesMes,
    porCobertura: [...porCobertura.entries()].sort((a, b) => b[1] - a[1]),
    porArea: [...porArea.entries()].sort((a, b) => b[1] - a[1]),
    cudAlertas,
    atrasadas: { cantidad: atrasadas.length, monto: atrasadas.reduce((s, f) => s + totalFacturar(f), 0) },
    presentadasSinLiquidar: {
      cantidad: presentadasSinLiquidar.length,
      monto: presentadasSinLiquidar.reduce((s, f) => s + totalFacturar(f), 0),
    },
    pendientesMes: totalesMes.cantidadPorEstado.Pendiente,
    talleresCompletos,
  };
}
