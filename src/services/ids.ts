// Generadores de IDs legibles y correlativos (PAC-001, TAL-01, FAC-2026-001, ...).

function nextNumber(ids: string[], regex: RegExp): number {
  let max = 0;
  for (const id of ids) {
    const m = regex.exec(id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

const pad = (n: number, len: number) => String(n).padStart(len, '0');

export const nextPacienteId = (ids: string[]) => `PAC-${pad(nextNumber(ids, /^PAC-(\d+)$/), 3)}`;
export const nextTallerId = (ids: string[]) => `TAL-${pad(nextNumber(ids, /^TAL-(\d+)$/), 2)}`;
export const nextEvolucionId = (ids: string[]) => `EVO-${pad(nextNumber(ids, /^EVO-(\d+)$/), 4)}`;
export const nextAreaId = (ids: string[]) => `ARE-${pad(nextNumber(ids, /^ARE-(\d+)$/), 2)}`;
export const nextMedicacionId = (ids: string[]) => `MED-${pad(nextNumber(ids, /^MED-(\d+)$/), 4)}`;
export const nextAddendaId = (ids: string[]) => `ADD-${pad(nextNumber(ids, /^ADD-(\d+)$/), 4)}`;

/** FAC-AAAA-NNN: la secuencia reinicia cada año según el período facturado. */
export function nextFacturacionId(ids: string[], periodo: string): string {
  const year = periodo.slice(0, 4);
  return `FAC-${year}-${pad(nextNumber(ids, new RegExp(`^FAC-${year}-(\\d+)$`)), 3)}`;
}

/** Genera varios IDs consecutivos sin chocar entre sí (para altas masivas). */
export function nextFacturacionIds(existing: string[], periodo: string, count: number): string[] {
  const ids = [...existing];
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const id = nextFacturacionId(ids, periodo);
    ids.push(id);
    out.push(id);
  }
  return out;
}
