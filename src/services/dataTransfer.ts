import { parseCSV, toCSV } from '@/lib/csv';
import { formatAge, formatDate, normalizeText } from '@/lib/format';
import { nextAreaId } from '@/services/ids';
import { totalFacturar } from '@/services/domain';
import { normalizeMedicacion, normalizePaciente, normalizeTaller } from '@/data/normalize';
import {
  COLLECTION_KEYS,
  ESTADOS_PRESENTACION,
  type Area,
  type CollectionKey,
  type Database,
  type EstadoPresentacion,
  type Evolucion,
  type Facturacion,
  type Medicacion,
  type Modalidad,
  type Paciente,
  type TipoCobertura,
} from '@/types';
import { tipoDeCobertura } from '@/data/catalogs';

export const APP_ID = 'historia-clinica-digital';

// ======================================================================
// JSON (respaldo completo)
// ======================================================================
export function exportDatabaseJSON(db: Database): string {
  return JSON.stringify({ app: APP_ID, version: 1, exportedAt: new Date().toISOString(), data: db }, null, 2);
}

export function parseDatabaseJSON(text: string): Partial<Database> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('El archivo de respaldo no se pudo leer. ¿Es el correcto?');
  }
  const root = (parsed && typeof parsed === 'object' && 'data' in parsed ? (parsed as { data: unknown }).data : parsed) as
    | Record<string, unknown>
    | undefined;
  if (!root || typeof root !== 'object') throw new Error('Este archivo no parece un respaldo de la historia clínica.');

  const out: Partial<Database> = {};
  for (const key of COLLECTION_KEYS) {
    const items = root[key];
    if (items === undefined) continue;
    if (!Array.isArray(items)) throw new Error(`"${key}" debe ser una lista.`);
    items.forEach((item, i) => {
      if (!item || typeof item !== 'object' || typeof (item as { id?: unknown }).id !== 'string') {
        throw new Error(`"${key}" #${i + 1}: falta el campo "id".`);
      }
    });
    (out as Record<string, unknown>)[key] = items;
  }
  if (Object.keys(out).length === 0) {
    throw new Error('No se encontraron datos de pacientes, evoluciones, talleres o facturación en el archivo.');
  }
  return out;
}

// ======================================================================
// CSV
// ======================================================================
export const CSV_LABELS: Record<CollectionKey, string> = {
  pacientes: 'Pacientes',
  evoluciones: 'Evoluciones',
  talleres: 'Talleres',
  facturacion: 'Facturación',
  areas: 'Áreas',
  medicaciones: 'Medicaciones',
};

const LIST_SEP = ' | ';

export function exportCollectionCSV(key: CollectionKey, db: Database, subset?: { facturacion?: Facturacion[]; evoluciones?: Evolucion[] }): string {
  const pacienteNombre = (id: string) => db.pacientes.find((p) => p.id === id)?.nombre ?? '';
  const areaNombre = (id: string) => db.areas.find((a) => a.id === id)?.nombre ?? id;

  switch (key) {
    case 'pacientes':
      return toCSV(
        [
          'ID Paciente', 'Nombre y Apellido', 'DNI', 'Fecha de Nacimiento', 'Edad', 'Género', 'Domicilio', 'Convive con', 'Teléfono',
          'Nacionalidad', 'Estado civil', 'Escolaridad', 'Ocupación',
          'Estado CUD', 'Nro CUD', 'Vencimiento CUD', 'SUBE', 'Pensión',
          'Referente', 'Vínculo referente', 'Tel. referente', 'Edad referente', 'Contacto emergencia', 'Curador', 'Otras instituciones',
          'Tipo de Cobertura', 'Cobertura / Obra Social', 'Nro Afiliado', 'Prestaciones autorizadas', 'Venc. autorización', 'Fecha ingreso', 'Días asistencia', 'Estado',
          'Motivo consulta', 'Derivación', 'Diagnóstico', 'Autor diagnóstico', 'Antecedentes', 'Prof. externos', 'Condiciones médicas', 'Consentimiento firmado',
        ],
        db.pacientes.map((p) => [
          p.id, p.nombre, p.dni, formatDateCsv(p.fechaNacimiento), formatAge(p.fechaNacimiento), p.genero, p.domicilio, p.conviveCon, p.telefono,
          p.nacionalidad, p.estadoCivil, p.escolaridad, p.ocupacion,
          p.estadoCUD, p.nroCUD, formatDateCsv(p.vencimientoCUD), p.sube, p.pension,
          p.referente.nombre, p.referente.vinculo, p.referente.telefono, p.referente.edad, p.contactoEmergencia, p.curador, p.otrasInstituciones,
          p.tipoCobertura, p.cobertura, p.nroAfiliado, p.prestacionesAutorizadas, formatDateCsv(p.vencimientoAutorizacion), formatDateCsv(p.fechaIngreso), p.diasAsistencia.join(LIST_SEP), p.estado,
          p.motivoConsulta, p.derivacion, p.diagnostico, p.diagnosticoAutor, p.antecedentes, p.profesionalesExternos, p.condicionesMedicas, p.consentimientoFirmado ? 'Sí' : 'No',
        ]),
      );
    case 'evoluciones':
      return toCSV(
        ['ID Evolución', 'Fecha', 'Hora', 'ID Paciente', 'Paciente', 'Área / Especialidad', 'Profesional', 'Modalidad', 'ID Taller', 'Evolución / Nota de Sesión', 'Objetivos Trabajados'],
        (subset?.evoluciones ?? db.evoluciones).map((e) => [e.id, formatDateCsv(e.fecha), e.hora, e.pacienteId, pacienteNombre(e.pacienteId), areaNombre(e.areaId), e.profesional, e.modalidad, e.tallerId ?? '', e.nota, e.objetivos]),
      );
    case 'talleres':
      return toCSV(
        ['ID Taller', 'Nombre del Taller', 'Descripción', 'Días y Horarios', 'Coordinación', 'Cupo Máximo', 'Pacientes Inscriptos (IDs)', 'Objetivos', 'Plan de trabajo', 'Materiales', 'Evolución taller', 'Activo'],
        db.talleres.map((t) => [t.id, t.nombre, t.descripcion, t.diasHorarios, t.terapeutas.join(LIST_SEP), t.cupo, t.inscriptos.join(LIST_SEP), t.objetivos, t.planTrabajo, t.materiales, t.notasEvolucion, t.activo ? 'Sí' : 'No']),
      );
    case 'facturacion':
      return toCSV(
        ['ID Registro', 'Mes / Año', 'Obra Social / Cobertura', 'ID Paciente', 'Paciente', 'Cantidad de Sesiones', 'Nomenclador / Práctica', 'Valor Sesión', 'Total a Facturar', 'Estado Presentación'],
        (subset?.facturacion ?? db.facturacion).map((f) => [f.id, f.periodo, f.cobertura, f.pacienteId, pacienteNombre(f.pacienteId), f.sesiones, f.practica, f.valorSesion, totalFacturar(f), f.estado]),
      );
    case 'areas':
      return toCSV(['ID Área', 'Nombre'], db.areas.map((a) => [a.id, a.nombre]));
    case 'medicaciones':
      return toCSV(
        ['ID', 'ID Paciente', 'Paciente', 'Droga', 'Presentación', 'Concentración', 'Dosis', 'Horarios', 'Fecha inicio', 'Observaciones', 'Activa'],
        db.medicaciones.map((m) => [m.id, m.pacienteId, pacienteNombre(m.pacienteId), m.droga, m.presentacion, m.concentracion, m.dosis, m.horarios, formatDateCsv(m.fechaInicio), m.observaciones, m.activo ? 'Sí' : 'No']),
      );
  }
}

export interface CsvImportResult {
  items: unknown[];
  /** Áreas nuevas detectadas al importar evoluciones (por nombre). */
  newAreas: Area[];
  errors: string[];
}

export function importCollectionCSV(key: CollectionKey, text: string, db: Database): CsvImportResult {
  const rows = parseCSV(text);
  if (rows.length < 2) throw new Error('La planilla está vacía o le faltan los títulos de columna.');
  const headers = rows[0].map(normHeader);
  const result: CsvImportResult = { items: [], newAreas: [], errors: [] };

  const usedIds = new Set<string>();
  const knownAreas = [...db.areas];

  rows.slice(1).forEach((cells, index) => {
    const line = index + 2;
    const rec = (...aliases: string[]) => {
      for (const alias of aliases) {
        const i = headers.indexOf(normHeader(alias));
        if (i >= 0) return (cells[i] ?? '').trim();
      }
      return '';
    };
    const fail = (msg: string) => result.errors.push(`Línea ${line}: ${msg}`);

    try {
      switch (key) {
        case 'pacientes': {
          const nombre = rec('Nombre y Apellido', 'Nombre');
          if (!nombre) return fail('falta el nombre.');
          const cobertura = rec('Cobertura / Obra Social', 'Cobertura') || 'Particular';
          const tipoRaw = rec('Tipo de Cobertura', 'Tipo');
          const tipo = (['Obra Social', 'Prepaga', 'Particular'] as TipoCobertura[]).find((t) => normalizeText(t) === normalizeText(tipoRaw))
            ?? tipoDeCobertura(cobertura)
            ?? (normalizeText(cobertura) === 'particular' ? 'Particular' : 'Obra Social');
          const nacimiento = parseDateLoose(rec('Fecha de Nacimiento', 'Nacimiento'));
          const vencimiento = parseDateLoose(rec('Vencimiento CUD', 'Vencimiento'));
          if (nacimiento === null || vencimiento === null) return fail('fecha inválida (usá dd/mm/aaaa o aaaa-mm-dd).');
          const estadoRaw = normalizeText(rec('Estado'));
          const estadoCudRaw = normalizeText(rec('Estado CUD'));
          const tramite = (raw: string) => (raw.includes('tramite') ? 'En trámite' as const : raw === 'si' || raw === 'sí' ? 'Sí' as const : raw === 'no' ? 'No' as const : undefined);
          const tutor = rec('Tutor / Familiar Responsable', 'Tutor', 'Referente');
          const item = normalizePaciente({
            id: rec('ID Paciente', 'ID') || '',
            nombre,
            dni: rec('DNI').replace(/\D/g, ''),
            fechaNacimiento: nacimiento,
            genero: rec('Género', 'Genero'),
            domicilio: rec('Domicilio'),
            conviveCon: rec('Convive con'),
            telefono: rec('Teléfono', 'Telefono'),
            nacionalidad: rec('Nacionalidad') || 'Argentina',
            estadoCivil: rec('Estado civil'),
            escolaridad: rec('Escolaridad'),
            ocupacion: rec('Ocupación', 'Ocupacion'),
            estadoCUD: tramite(estadoCudRaw) ?? (rec('Nro CUD', 'CUD') ? 'Sí' : 'En trámite'),
            nroCUD: rec('Nro CUD', 'CUD'),
            vencimientoCUD: vencimiento,
            sube: tramite(normalizeText(rec('SUBE'))) ?? 'No',
            pension: tramite(normalizeText(rec('Pensión', 'Pension'))) ?? 'No',
            referente: {
              nombre: rec('Referente') || tutor,
              vinculo: rec('Vínculo referente', 'Vinculo referente'),
              telefono: rec('Tel. referente', 'Tel referente') || rec('Teléfono', 'Telefono'),
              edad: rec('Edad referente'),
            },
            contactoEmergencia: rec('Contacto emergencia'),
            curador: rec('Curador'),
            otrasInstituciones: rec('Otras instituciones'),
            tipoCobertura: tipo,
            cobertura,
            nroAfiliado: rec('Nro Afiliado', 'Afiliado') || (tipo === 'Particular' ? 'Particular' : ''),
            prestacionesAutorizadas: rec('Prestaciones autorizadas'),
            vencimientoAutorizacion: parseDateLoose(rec('Venc. autorización', 'Venc autorizacion')) || '',
            fechaIngreso: parseDateLoose(rec('Fecha ingreso')) || '',
            diasAsistencia: splitList(rec('Días asistencia', 'Dias asistencia')) as Paciente['diasAsistencia'],
            estado: estadoRaw === 'inactivo' ? 'Inactivo' : estadoRaw === 'otros' ? 'Otros' : 'Activo',
            motivoConsulta: rec('Motivo consulta'),
            derivacion: rec('Derivación', 'Derivacion'),
            diagnostico: rec('Diagnóstico Principal', 'Diagnóstico', 'Diagnostico'),
            diagnosticoAutor: rec('Autor diagnóstico', 'Autor diagnostico'),
            antecedentes: rec('Antecedentes'),
            profesionalesExternos: rec('Prof. externos', 'Prof externos'),
            condicionesMedicas: rec('Condiciones médicas', 'Condiciones medicas'),
            consentimientoFirmado: ['si', 'sí', 'true', '1'].includes(normalizeText(rec('Consentimiento firmado'))),
            tutor,
          });
          result.items.push(item);
          break;
        }
        case 'evoluciones': {
          const fecha = parseDateLoose(rec('Fecha'));
          const pacienteId = rec('ID Paciente');
          if (!fecha) return fail('fecha faltante o inválida.');
          if (!db.pacientes.some((p) => p.id === pacienteId)) return fail(`el paciente "${pacienteId}" no existe.`);
          const areaNombre = rec('Área / Especialidad', 'Área', 'Area', 'Especialidad');
          if (!areaNombre) return fail('falta el área.');
          let area = knownAreas.find((a) => normalizeText(a.nombre) === normalizeText(areaNombre) || a.id === areaNombre);
          if (!area) {
            area = { id: nextAreaId(knownAreas.map((a) => a.id)), nombre: areaNombre };
            knownAreas.push(area);
            result.newAreas.push(area);
          }
          const modalidad: Modalidad = normalizeText(rec('Modalidad')) === 'taller' ? 'Taller' : 'Individual';
          const item: Evolucion = {
            id: rec('ID Evolución', 'ID Evolucion', 'ID') || '',
            fecha,
            hora: rec('Hora') || '00:00',
            pacienteId,
            areaId: area.id,
            profesional: rec('Profesional'),
            modalidad,
            tallerId: rec('ID Taller') || undefined,
            nota: rec('Evolución / Nota de Sesión', 'Evolución', 'Evolucion', 'Nota'),
            objetivos: rec('Objetivos Trabajados', 'Objetivos'),
            addendas: [],
          };
          result.items.push(item);
          break;
        }
        case 'talleres': {
          const nombre = rec('Nombre del Taller', 'Nombre');
          if (!nombre) return fail('falta el nombre del taller.');
          const cupo = parseNumber(rec('Cupo Máximo', 'Cupo'));
          if (cupo === null || cupo < 1) return fail('cupo inválido.');
          const item = normalizeTaller({
            id: rec('ID Taller', 'ID') || '',
            nombre,
            descripcion: rec('Descripción', 'Descripcion'),
            diasHorarios: rec('Días y Horarios', 'Dias y Horarios'),
            terapeutas: splitList(rec('Coordinación', 'Terapeutas a Cargo', 'Terapeutas')),
            cupo,
            inscriptos: splitList(rec('Pacientes Inscriptos (IDs)', 'Pacientes Inscriptos', 'Inscriptos')),
            objetivos: rec('Objetivos del Taller', 'Objetivos'),
            planTrabajo: rec('Plan de trabajo'),
            materiales: rec('Materiales'),
            notasEvolucion: rec('Evolución taller', 'Evolucion taller'),
            activo: !['no', 'false', '0', 'inactivo'].includes(normalizeText(rec('Activo') || 'si')),
          });
          result.items.push(item);
          break;
        }
        case 'medicaciones': {
          const pacienteId = rec('ID Paciente');
          const droga = rec('Droga', 'Nombre genérico', 'Medicamento');
          if (!droga) return fail('falta la droga.');
          if (!db.pacientes.some((p) => p.id === pacienteId)) return fail(`el paciente "${pacienteId}" no existe.`);
          const inicio = parseDateLoose(rec('Fecha inicio', 'Inicio'));
          if (inicio === null) return fail('fecha de inicio inválida.');
          const item = normalizeMedicacion({
            id: rec('ID') || '',
            pacienteId,
            droga,
            presentacion: rec('Presentación', 'Presentacion'),
            concentracion: rec('Concentración', 'Concentracion'),
            dosis: rec('Dosis'),
            horarios: rec('Horarios'),
            fechaInicio: inicio || '',
            observaciones: rec('Observaciones'),
            activo: !['no', 'false', '0', 'suspendida'].includes(normalizeText(rec('Activa') || 'si')),
            historial: [],
          } satisfies Medicacion);
          result.items.push(item);
          break;
        }
        case 'facturacion': {
          const pacienteId = rec('ID Paciente');
          if (!db.pacientes.some((p) => p.id === pacienteId)) return fail(`el paciente "${pacienteId}" no existe.`);
          const periodo = parsePeriodLoose(rec('Mes / Año', 'Mes/Año', 'Periodo', 'Período'));
          if (!periodo) return fail('mes/año inválido (usá aaaa-mm o mm/aaaa).');
          const sesiones = parseNumber(rec('Cantidad de Sesiones', 'Cantidad de Sesiones Realizadas', 'Sesiones'));
          const valor = parseNumber(rec('Valor Sesión', 'Valor Sesion', 'Valor'));
          if (sesiones === null || valor === null) return fail('sesiones o valor inválidos.');
          const estado = ESTADOS_PRESENTACION.find((e) => normalizeText(e) === normalizeText(rec('Estado Presentación', 'Estado Presentacion', 'Estado'))) as EstadoPresentacion | undefined;
          const item: Facturacion = {
            id: rec('ID Registro', 'ID') || '',
            periodo,
            cobertura: rec('Obra Social / Cobertura', 'Cobertura', 'Obra Social') || db.pacientes.find((p) => p.id === pacienteId)?.cobertura || 'Particular',
            pacienteId,
            sesiones,
            practica: rec('Nomenclador / Práctica', 'Práctica', 'Practica'),
            valorSesion: valor,
            estado: estado ?? 'Pendiente',
          };
          result.items.push(item);
          break;
        }
        case 'areas': {
          const nombre = rec('Nombre');
          if (!nombre) return fail('falta el nombre del área.');
          result.items.push({ id: rec('ID Área', 'ID Area', 'ID') || '', nombre } satisfies Area);
          break;
        }
      }
    } catch (err) {
      fail(err instanceof Error ? err.message : 'fila inválida.');
    }
  });

  assignMissingIds(key, result, db, usedIds);
  return result;
}

/** Completa los IDs vacíos de forma correlativa respetando los existentes. */
function assignMissingIds(key: CollectionKey, result: CsvImportResult, db: Database, used: Set<string>) {
  const prefixes: Record<CollectionKey, { prefix: string; pad: number }> = {
    pacientes: { prefix: 'PAC-', pad: 3 },
    evoluciones: { prefix: 'EVO-', pad: 4 },
    talleres: { prefix: 'TAL-', pad: 2 },
    facturacion: { prefix: 'FAC-', pad: 3 },
    areas: { prefix: 'ARE-', pad: 2 },
    medicaciones: { prefix: 'MED-', pad: 4 },
  };
  const items = result.items as { id: string; periodo?: string }[];
  const all = new Set<string>([...(db[key] as { id: string }[]).map((x) => x.id), ...items.map((x) => x.id).filter(Boolean), ...used]);
  const { prefix, pad } = prefixes[key];
  for (const item of items) {
    if (item.id) continue;
    if (key === 'facturacion') {
      const year = (item.periodo ?? '').slice(0, 4);
      let n = 1;
      while (all.has(`FAC-${year}-${String(n).padStart(3, '0')}`)) n++;
      item.id = `FAC-${year}-${String(n).padStart(3, '0')}`;
    } else {
      let n = 1;
      while (all.has(`${prefix}${String(n).padStart(pad, '0')}`)) n++;
      item.id = `${prefix}${String(n).padStart(pad, '0')}`;
    }
    all.add(item.id);
  }
}

// ----- Helpers de parseo -----
const normHeader = (s: string) => normalizeText(s).replace(/[^a-z0-9]/g, '');
const splitList = (s: string) => s.split(/\s*[|;]\s*/).map((x) => x.trim()).filter(Boolean);
const formatDateCsv = (iso: string) => (iso ? formatDate(iso) : '');

/** Devuelve "YYYY-MM-DD", "" si está vacío o null si es inválido. */
export function parseDateLoose(s: string): string | null {
  const v = s.trim();
  if (!v) return '';
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(v);
  let y: number, mo: number, d: number;
  if (m) [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  else if ((m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/.exec(v))) {
    [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (y < 100) y += 2000;
  } else return null;
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function parsePeriodLoose(s: string): string | null {
  const v = s.trim();
  let m = /^(\d{4})-(\d{1,2})/.exec(v);
  if (m) return Number(m[2]) >= 1 && Number(m[2]) <= 12 ? `${m[1]}-${m[2].padStart(2, '0')}` : null;
  m = /^(\d{1,2})[/-](\d{4})$/.exec(v);
  if (m) return Number(m[1]) >= 1 && Number(m[1]) <= 12 ? `${m[2]}-${m[1].padStart(2, '0')}` : null;
  return null;
}

/** Acepta "24500", "24.500", "24.500,50", "$ 24.500". */
export function parseNumber(s: string): number | null {
  let v = s.replace(/[^\d.,-]/g, '');
  if (!v) return null;
  if (v.includes(',')) v = v.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(v)) v = v.replace(/\./g, '');
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
