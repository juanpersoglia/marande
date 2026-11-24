import { addDays, formatPeriod, nowTime, parseISO, shiftPeriod, todayISO } from '@/lib/format';
import { nextFacturacionIds } from '@/services/ids';
import { practicaDeEvolucion, valorSugerido } from '@/services/domain';
import { normalizePaciente } from '@/data/normalize';
import type { Area, Database, Evolucion, Facturacion, Medicacion, Paciente, Taller } from '@/types';

// Datos de ejemplo (ficticios). Las fechas se generan relativas a "hoy" para que el
// dashboard, los vencimientos de CUD y la facturación del mes se vean siempre coherentes.

const AREAS: Area[] = [
  // Especialidades clínicas (prestaciones)
  { id: 'ARE-01', nombre: 'Kinesiología' },
  { id: 'ARE-02', nombre: 'Fonoaudiología' },
  { id: 'ARE-03', nombre: 'Terapia Ocupacional' },
  { id: 'ARE-04', nombre: 'Psicopedagogía' },
  { id: 'ARE-05', nombre: 'Psicología' },
  { id: 'ARE-06', nombre: 'Musicoterapia' },
  { id: 'ARE-07', nombre: 'Psicomotricidad' },
  // Seguimiento institucional (Marandé)
  { id: 'ARE-08', nombre: 'General' },
  { id: 'ARE-09', nombre: 'Talleres' },
  { id: 'ARE-10', nombre: 'Familiar' },
  { id: 'ARE-11', nombre: 'Reuniones clínicas' },
  { id: 'ARE-12', nombre: 'Informes' },
  { id: 'ARE-13', nombre: 'Incidentes o situaciones de crisis' },
];

interface PlanItem {
  areaId: string;
  dows: number[]; // 1 = lunes ... 5 = viernes
  hora: string;
  prof: string;
}

/** Campos mínimos del seed; el resto se completa en buildSeed. */
type SeedPaciente = {
  nombre: string;
  dni: string;
  fechaNacimiento: string;
  diagnostico: string;
  nroCUD: string;
  cudDias: number | null;
  tipoCobertura: Paciente['tipoCobertura'];
  cobertura: string;
  nroAfiliado: string;
  tutor: string;
  telefono: string;
  estado: Paciente['estado'];
  plan: PlanItem[];
  genero?: string;
  domicilio?: string;
  sube?: Paciente['sube'];
  pension?: Paciente['pension'];
  diasAsistencia?: Paciente['diasAsistencia'];
  medicamentos?: Omit<Medicacion, 'id' | 'pacienteId' | 'historial'>[];
};

const PROF = {
  ries: 'Lic. Marcelo Ríos',
  mansilla: 'Lic. Paula Mansilla',
  cuenca: 'Lic. Daniela Cuenca',
  aguirre: 'Lic. Romina Aguirre',
  lucero: 'Lic. Ana Lucero',
  salas: 'Lic. Federico Salas',
  ponce: 'Lic. Cecilia Ponce',
  medina: 'Lic. Gustavo Medina',
};

const PACIENTES: SeedPaciente[] = [
  {
    nombre: 'Mateo Gómez', dni: '55120344', fechaNacimiento: '2015-03-12',
    diagnostico: 'Trastorno del Espectro Autista (TEA) - nivel 2', nroCUD: 'CUD-2023-04518', cudDias: 210,
    tipoCobertura: 'Obra Social', cobertura: 'IOSCOR', nroAfiliado: '0412358/01',
    tutor: 'Carolina Gómez (madre)', telefono: '379 4612345', estado: 'Activo',
    plan: [
      { areaId: 'ARE-02', dows: [2, 4], hora: '09:00', prof: PROF.mansilla },
      { areaId: 'ARE-03', dows: [1], hora: '10:00', prof: PROF.aguirre },
    ],
  },
  {
    nombre: 'Valentina Acosta', dni: '52877610', fechaNacimiento: '2012-08-04',
    diagnostico: 'Parálisis cerebral espástica (diparesia)', nroCUD: 'CUD-2021-01977', cudDias: 25,
    tipoCobertura: 'Obra Social', cobertura: 'OSECAC', nroAfiliado: '27-52877610-0/00',
    tutor: 'Marcelo Acosta (padre)', telefono: '379 4587721', estado: 'Activo',
    plan: [
      { areaId: 'ARE-01', dows: [1, 3, 5], hora: '08:30', prof: PROF.ries },
      { areaId: 'ARE-03', dows: [2], hora: '10:30', prof: PROF.aguirre },
    ],
  },
  {
    nombre: 'Joaquín Ledesma', dni: '58340981', fechaNacimiento: '2018-11-22',
    diagnostico: 'Trastorno del desarrollo del lenguaje', nroCUD: '', cudDias: null,
    tipoCobertura: 'Prepaga', cobertura: 'Swiss Medical', nroAfiliado: '4471-0088213',
    tutor: 'Natalia Ledesma (madre)', telefono: '379 4390012', estado: 'Activo',
    plan: [
      { areaId: 'ARE-02', dows: [2, 4], hora: '10:00', prof: PROF.cuenca },
      { areaId: 'ARE-07', dows: [3], hora: '11:00', prof: PROF.medina },
    ],
  },
  {
    nombre: 'Camila Romero', dni: '49560213', fechaNacimiento: '2009-05-30',
    diagnostico: 'Discapacidad intelectual leve', nroCUD: 'CUD-2022-03340', cudDias: 60,
    tipoCobertura: 'Obra Social', cobertura: 'PROFE - Incluir Salud', nroAfiliado: '2900155/04',
    tutor: 'Gladys Romero (abuela)', telefono: '379 4455670', estado: 'Activo',
    plan: [
      { areaId: 'ARE-04', dows: [1, 3], hora: '14:00', prof: PROF.lucero },
      { areaId: 'ARE-05', dows: [4], hora: '15:00', prof: PROF.salas },
    ],
  },
  {
    nombre: 'Thiago Fernández', dni: '54908732', fechaNacimiento: '2016-01-18',
    diagnostico: 'TDAH y trastorno mixto del lenguaje', nroCUD: 'CUD-2024-00871', cudDias: 400,
    tipoCobertura: 'Prepaga', cobertura: 'OSDE', nroAfiliado: '310-5498823-02',
    tutor: 'Sebastián Fernández (padre)', telefono: '379 4601928', estado: 'Activo',
    plan: [
      { areaId: 'ARE-04', dows: [2], hora: '15:00', prof: PROF.lucero },
      { areaId: 'ARE-02', dows: [4], hora: '14:00', prof: PROF.cuenca },
    ],
  },
  {
    nombre: 'Sofía Duarte', dni: '51234876', fechaNacimiento: '2011-09-09',
    diagnostico: 'Síndrome de Down', nroCUD: 'CUD-2020-02214', cudDias: -12,
    tipoCobertura: 'Obra Social', cobertura: 'IOSCOR', nroAfiliado: '0398812/03',
    tutor: 'Patricia Duarte (madre)', telefono: '379 4778801', estado: 'Activo',
    plan: [
      { areaId: 'ARE-02', dows: [1, 4], hora: '11:00', prof: PROF.mansilla },
      { areaId: 'ARE-07', dows: [2], hora: '09:30', prof: PROF.medina },
    ],
  },
  {
    nombre: 'Lautaro Benítez', dni: '53011457', fechaNacimiento: '2014-02-27',
    diagnostico: 'Trastorno del Espectro Autista (TEA) - nivel 1', nroCUD: 'CUD-2023-05102', cudDias: 75,
    tipoCobertura: 'Particular', cobertura: 'Particular', nroAfiliado: 'Particular',
    tutor: 'Rosana Benítez (madre)', telefono: '379 4223344', estado: 'Activo',
    plan: [
      { areaId: 'ARE-05', dows: [1, 3], hora: '17:00', prof: PROF.salas },
      { areaId: 'ARE-03', dows: [5], hora: '16:00', prof: PROF.aguirre },
    ],
  },
  {
    nombre: 'Martina Villalba', dni: '58812340', fechaNacimiento: '2019-06-15',
    diagnostico: 'Hipoacusia neurosensorial bilateral', nroCUD: 'CUD-2024-01450', cudDias: 620,
    tipoCobertura: 'Prepaga', cobertura: 'Galeno', nroAfiliado: '88120-4471/9',
    tutor: 'Lorena Villalba (madre)', telefono: '379 4311290', estado: 'Activo',
    plan: [
      { areaId: 'ARE-02', dows: [2, 4], hora: '08:30', prof: PROF.cuenca },
      { areaId: 'ARE-07', dows: [3], hora: '10:30', prof: PROF.medina },
    ],
  },
  {
    nombre: 'Ramiro Quiroga', dni: '47320918', fechaNacimiento: '2005-12-03',
    diagnostico: 'Discapacidad intelectual moderada', nroCUD: 'CUD-2021-00763', cudDias: 150,
    tipoCobertura: 'Obra Social', cobertura: 'OSDEPYM', nroAfiliado: '55120-3347/00',
    tutor: 'Héctor Quiroga (padre)', telefono: '379 4690071', estado: 'Activo',
    plan: [
      { areaId: 'ARE-03', dows: [2, 4], hora: '11:30', prof: PROF.aguirre },
      { areaId: 'ARE-05', dows: [3], hora: '16:00', prof: PROF.salas },
    ],
  },
  {
    nombre: 'Agustina Núñez', dni: '53667802', fechaNacimiento: '2013-07-21',
    diagnostico: 'Trastorno específico del aprendizaje (dislexia)', nroCUD: 'CUD-2022-04877', cudDias: 330,
    tipoCobertura: 'Obra Social', cobertura: 'OSECAC', nroAfiliado: '27-53667802-4/00',
    tutor: 'Mariela Núñez (madre)', telefono: '379 4512267', estado: 'Activo',
    plan: [{ areaId: 'ARE-04', dows: [1, 3], hora: '16:00', prof: PROF.lucero }],
  },
  {
    nombre: 'Bruno Sosa', dni: '52190455', fechaNacimiento: '2010-10-10',
    diagnostico: 'Epilepsia y discapacidad intelectual', nroCUD: 'CUD-2020-03019', cudDias: 18,
    tipoCobertura: 'Obra Social', cobertura: 'IOSCOR', nroAfiliado: '0377120/02',
    tutor: 'Silvia Sosa (madre)', telefono: '379 4667789', estado: 'Activo',
    plan: [
      { areaId: 'ARE-01', dows: [2, 4], hora: '09:00', prof: PROF.ries },
      { areaId: 'ARE-05', dows: [5], hora: '10:00', prof: PROF.salas },
    ],
  },
  {
    nombre: 'Emilia Cabrera', dni: '56120087', fechaNacimiento: '2017-04-02',
    diagnostico: 'Trastorno del Espectro Autista (TEA) - nivel 3', nroCUD: 'CUD-2024-00219', cudDias: 900,
    tipoCobertura: 'Prepaga', cobertura: 'Medifé', nroAfiliado: '7710-2231008',
    tutor: 'Florencia Cabrera (madre)', telefono: '379 4399821', estado: 'Activo',
    plan: [
      { areaId: 'ARE-03', dows: [1, 3], hora: '08:30', prof: PROF.aguirre },
      { areaId: 'ARE-02', dows: [5], hora: '10:30', prof: PROF.mansilla },
    ],
  },
  {
    nombre: 'Norma Báez', dni: '5240318', fechaNacimiento: '1951-02-14',
    diagnostico: 'Secuelas de ACV (hemiparesia derecha)', nroCUD: 'CUD-2023-02760', cudDias: 1200,
    tipoCobertura: 'Obra Social', cobertura: 'PAMI', nroAfiliado: '15-05240318-00',
    tutor: 'Hugo Báez (hijo)', telefono: '379 4745510', estado: 'Activo',
    plan: [
      { areaId: 'ARE-01', dows: [1, 3, 5], hora: '08:30', prof: PROF.ries },
      { areaId: 'ARE-02', dows: [2], hora: '11:00', prof: PROF.cuenca },
    ],
  },
  {
    nombre: 'Gonzalo Pereyra', dni: '42188730', fechaNacimiento: '2000-03-19',
    diagnostico: 'Lesión medular incompleta (T10)', nroCUD: 'CUD-2019-01882', cudDias: 45,
    tipoCobertura: 'Particular', cobertura: 'Particular', nroAfiliado: 'Particular',
    tutor: 'Gonzalo Pereyra (autónomo)', telefono: '379 4801177', estado: 'Inactivo', plan: [],
  },
  {
    nombre: 'Julieta Ayala', dni: '50433219', fechaNacimiento: '2008-01-25',
    diagnostico: 'Trastorno del Espectro Autista (TEA) - nivel 1', nroCUD: 'CUD-2019-00654', cudDias: -200,
    tipoCobertura: 'Obra Social', cobertura: 'OSECAC', nroAfiliado: '27-50433219-1/00',
    tutor: 'Daniel Ayala (padre)', telefono: '379 4276650', estado: 'Inactivo', plan: [],
  },
];

interface TallerSeed {
  id: string;
  nombre: string;
  descripcion: string;
  diasHorarios: string;
  terapeutas: string[];
  cupo: number;
  activo: boolean;
  objetivos: string;
  planTrabajo: string;
  materiales: string;
  notasEvolucion: string;
  dows: number[];
  hora: string;
  areaId: string;
  inscriptos: number[];
  notas: string[];
}

const TALLERES: TallerSeed[] = [
  {
    id: 'TAL-01', nombre: 'Taller de Habilidades Sociales',
    descripcion: 'Espacio grupal para practicar comunicación, turnos y resolución de conflictos entre pares.',
    diasHorarios: 'Martes y jueves de 16:00 a 17:30',
    terapeutas: [PROF.salas, PROF.aguirre], cupo: 8, activo: true, dows: [2, 4], hora: '16:00', areaId: 'ARE-05',
    objetivos: 'Favorecer la comunicación, el respeto de turnos y la resolución de conflictos en grupo.',
    planTrabajo: 'Juego de roles, dinámicas cooperativas y trabajo con tarjetas de emociones.',
    materiales: 'Tarjetas de emociones, afiches, material de papelería.',
    notasEvolucion: 'El grupo sostiene bien las consignas. Se observa avance en el respeto de turnos.',
    inscriptos: [1, 4, 5, 7, 10, 12],
    notas: [
      'Se trabajó con juego de roles sobre cómo pedir ayuda y saludar. El grupo participó con entusiasmo y respetó los turnos de palabra.',
      'Actividad de cooperación con material concreto (armado de un mural). {n} se integró al equipo con mínimas indicaciones.',
      'Dinámica de reconocimiento de emociones con tarjetas. {n} identificó y nombró alegría, enojo y tristeza.',
      'Juego reglado con consigna grupal. Se observó tolerancia a la espera y menor frustración ante la pérdida.',
    ],
  },
  {
    id: 'TAL-02', nombre: 'Taller de Música y Expresión',
    descripcion: 'Taller de musicoterapia y expresión corporal en formato grupal.',
    diasHorarios: 'Lunes de 15:30 a 16:30',
    terapeutas: [PROF.ponce], cupo: 10, activo: true, dows: [1], hora: '15:30', areaId: 'ARE-06',
    objetivos: 'Estimular la expresión y la regulación emocional a través de la música y el ritmo.',
    planTrabajo: 'Improvisación rítmica, canciones con movimiento y exploración sonora.',
    materiales: 'Instrumentos de percusión, parlante, pañuelos.',
    notasEvolucion: 'Buena adhesión. Se fortalece la atención compartida.',
    inscriptos: [1, 2, 3, 6, 8, 9, 11, 12],
    notas: [
      'Improvisación rítmica con instrumentos de percusión. {n} sostuvo el pulso junto al grupo durante toda la actividad.',
      'Canción con consignas de movimiento. Buena respuesta a los cambios de ritmo y dinámica.',
      'Se propuso exploración sonora libre y luego dirigida. {n} eligió instrumento y participó del cierre grupal.',
    ],
  },
  {
    id: 'TAL-03', nombre: 'Taller de Vida Independiente (AVD)',
    descripcion: 'Dispositivo de actividades de la vida diaria orientado a la autonomía.',
    diasHorarios: 'Miércoles de 10:00 a 12:00',
    terapeutas: [PROF.aguirre, PROF.lucero], cupo: 6, activo: true, dows: [3], hora: '10:00', areaId: 'ARE-03',
    objetivos: 'Desarrollar AVD: colaciones, higiene, orden del espacio y manejo del dinero.',
    planTrabajo: 'Recetas simples, compra simulada y secuencias de cuidado personal.',
    materiales: 'Utensilios de cocina, billetes didácticos, apoyos visuales.',
    notasEvolucion: 'Grupo estable. Se avanza en independencia con supervisión a distancia.',
    inscriptos: [2, 4, 6, 9, 11, 13],
    notas: [
      'Se elaboró una receta simple (ensalada de frutas) siguiendo pasos con apoyo visual. {n} participó en el corte y el servido.',
      'Práctica de manejo de dinero con compra simulada en el almacén del taller. Se reforzó el reconocimiento de billetes.',
      'Secuencia de vestido y cuidado personal. {n} resolvió con supervisión a distancia.',
    ],
  },
  {
    id: 'TAL-04', nombre: 'Taller de Juego y Motricidad',
    descripcion: 'Circuitos y juegos cooperativos para motricidad gruesa y planificación motora.',
    diasHorarios: 'Viernes de 9:30 a 10:30',
    terapeutas: [PROF.medina], cupo: 8, activo: true, dows: [5], hora: '09:30', areaId: 'ARE-07',
    objetivos: 'Mejorar coordinación, equilibrio y planificación motora.',
    planTrabajo: 'Circuitos con obstáculos, juegos con pelota y ritmo corporal.',
    materiales: 'Aros, pelotas, colchonetas, túnel.',
    notasEvolucion: 'Participación activa. Se observa mejor coordinación óculo-manual.',
    inscriptos: [1, 2, 3, 6, 8, 12],
    notas: [
      'Circuito motor con obstáculos (túnel, aros, equilibrio). {n} completó el recorrido con apoyo mínimo.',
      'Juegos con pelota y consignas de lateralidad. Se observó mejor coordinación óculo-manual.',
      'Actividad de ritmo y desplazamientos coordinados en parejas. Buena disposición del grupo.',
    ],
  },
  {
    id: 'TAL-05', nombre: 'Taller de Lectoescritura Funcional',
    descripcion: 'Acercamiento a lectura y escritura en situaciones cotidianas.',
    diasHorarios: 'Miércoles y viernes de 14:00 a 15:00',
    terapeutas: [PROF.lucero], cupo: 8, activo: false, dows: [3, 5], hora: '14:00', areaId: 'ARE-04',
    objetivos: 'Lectura y escritura funcional (carteles, listas, recetas, mensajes).',
    planTrabajo: 'Suspendido temporalmente por reorganización de espacios.',
    materiales: 'Fichas, carteles, hojas de trabajo.',
    notasEvolucion: 'Sin actividad vigente.',
    inscriptos: [5, 10], notas: [],
  },
];

const NOTAS: Record<string, string[]> = {
  'ARE-01': [
    'Se realizaron ejercicios de fortalecimiento de miembros inferiores y trabajo de bipedestación asistida. {n} toleró bien el esfuerzo, sin dolor referido.',
    'Movilizaciones pasivas y activo-asistidas, elongación de isquiotibiales y trabajo de equilibrio sobre superficie inestable. Buena respuesta.',
    'Entrenamiento de marcha con andador en circuito de 10 metros. Se corrigió el patrón de apoyo. Se sugiere continuar con la progresión.',
    'Trabajo de control de tronco en sedestación y transferencias. {n} colaboró durante toda la sesión.',
  ],
  'ARE-02': [
    'Se trabajó articulación de fonemas /r/ y /s/ en sílabas y palabras con apoyo visual. {n} logró mayor precisión en palabras bisílabas.',
    'Estimulación del lenguaje comprensivo y expresivo con juego simbólico. Se amplió vocabulario de categorías (animales, alimentos).',
    'Praxias bucofonatorias y soplo dirigido. Se trabajó atención conjunta y respuesta a consignas de dos pasos.',
    'Actividades de conciencia fonológica (rimas y segmentación silábica). {n} participó con buena motivación.',
  ],
  'ARE-03': [
    'Actividades de motricidad fina: ensartado, encastres y uso de tijera con apoyo. Mejora en la prensión trípode.',
    'Integración sensorial con circuito de texturas y actividad propioceptiva. {n} mostró buena regulación durante la sesión.',
    'Trabajo de autonomía en vestido (abrochado de botones y cierres). Se logró mayor independencia con guía verbal.',
    'Planificación y secuenciación de una actividad cotidiana con apoyo visual. Buena tolerancia a la frustración.',
  ],
  'ARE-04': [
    'Se trabajaron estrategias de comprensión lectora con textos breves y preguntas guía. {n} identificó personajes y secuencia de hechos.',
    'Actividades de cálculo con material concreto (suma y resta con reagrupamiento). Se reforzó la resolución de problemas simples.',
    'Escritura de oraciones a partir de imágenes, con foco en separación de palabras y uso de mayúsculas.',
    'Juegos de atención y memoria de trabajo. Se observó mayor sostenimiento de la tarea que en sesiones previas.',
  ],
  'ARE-05': [
    'Sesión de juego y conversación. {n} pudo expresar emociones frente a situaciones de frustración. Se trabajaron estrategias de autorregulación.',
    'Se abordó la rutina escolar y los vínculos con pares. Se acordaron con la familia pautas de anticipación.',
    'Trabajo de identificación y manejo de emociones con material gráfico. Buena disposición y participación activa.',
    'Entrevista breve con la familia y sesión de juego dirigido. Se observa avance en la tolerancia a los cambios de actividad.',
  ],
  'ARE-06': [
    'Improvisación sonoro-musical con instrumentos de percusión. {n} respondió a los cambios de intensidad y tempo.',
    'Canciones con movimiento y consignas de imitación. Se favoreció la atención compartida y el contacto visual.',
    'Exploración de instrumentos de viento y cuerdas. Buena expresión emocional durante la sesión.',
  ],
  'ARE-07': [
    'Circuito psicomotor: equilibrio, saltos y desplazamientos. {n} mejoró la coordinación global y la orientación espacial.',
    'Juego con pelotas y esquema corporal frente al espejo. Se trabajó lateralidad y noción de cuerpo propio.',
    'Actividades de coordinación dinámica y ritmo corporal. Buena disposición y participación durante toda la sesión.',
  ],
};

const OBJETIVOS: Record<string, string[]> = {
  'ARE-01': ['Fortalecimiento muscular y control postural', 'Mejorar el patrón de marcha y equilibrio', 'Aumentar rango articular y disminuir tono'],
  'ARE-02': ['Mejorar la inteligibilidad del habla', 'Ampliar vocabulario expresivo', 'Comprensión de consignas complejas'],
  'ARE-03': ['Motricidad fina y prensión', 'Autonomía en actividades de la vida diaria', 'Integración y regulación sensorial'],
  'ARE-04': ['Comprensión lectora', 'Razonamiento lógico-matemático', 'Sostenimiento de la atención en la tarea'],
  'ARE-05': ['Regulación emocional', 'Tolerancia a la frustración', 'Habilidades sociales y vínculos con pares'],
  'ARE-06': ['Expresión y regulación emocional', 'Atención compartida', 'Interacción grupal a través del ritmo'],
  'ARE-07': ['Coordinación global y equilibrio', 'Esquema corporal y lateralidad', 'Planificación motora'],
};

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pad3 = (n: number) => String(n).padStart(3, '0');

function parseTutor(tutor: string): { nombre: string; vinculo: string } {
  const m = /^(.+?)\s*\(([^)]+)\)\s*$/.exec(tutor);
  return m ? { nombre: m[1].trim(), vinculo: m[2].trim() } : { nombre: tutor, vinculo: '' };
}

export function buildSeed(today = todayISO()): Database {
  const rand = mulberry32(2026);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];

  const pacientes: Paciente[] = PACIENTES.map((sp, i) => {
    const ref = parseTutor(sp.tutor);
    const vencimientoCUD = sp.cudDias === null ? '' : addDays(today, sp.cudDias);
    return normalizePaciente({
      id: `PAC-${pad3(i + 1)}`,
      nombre: sp.nombre,
      dni: sp.dni,
      fechaNacimiento: sp.fechaNacimiento,
      genero: sp.genero ?? '',
      domicilio: sp.domicilio ?? 'Corrientes Capital',
      conviveCon: ref.vinculo ? `Con ${ref.vinculo}` : '',
      telefono: sp.telefono,
      nacionalidad: 'Argentina',
      estadoCivil: '',
      escolaridad: '',
      ocupacion: '',
      estadoCUD: sp.cudDias === null ? 'En trámite' : 'Sí',
      nroCUD: sp.nroCUD,
      vencimientoCUD,
      sube: sp.sube ?? 'No',
      pension: sp.pension ?? 'No',
      fotoNota: '',
      referente: { nombre: ref.nombre, vinculo: ref.vinculo, telefono: sp.telefono, edad: '' },
      contactoEmergencia: `${ref.nombre} · ${sp.telefono}`,
      curador: '',
      otrasInstituciones: '',
      tipoCobertura: sp.tipoCobertura,
      cobertura: sp.cobertura,
      nroAfiliado: sp.nroAfiliado,
      prestacionesAutorizadas: sp.tipoCobertura === 'Particular' ? '' : 'Centro de día jornada simple',
      vencimientoAutorizacion: sp.cudDias === null ? '' : addDays(today, Math.max(30, (sp.cudDias ?? 90) - 30)),
      fechaIngreso: addDays(today, -400 - i * 17),
      diasAsistencia: sp.diasAsistencia ?? ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'],
      estado: sp.estado,
      motivoConsulta: 'Ingreso a centro de día / continuidad de apoyos',
      derivacion: '',
      diagnostico: sp.diagnostico,
      diagnosticoAutor: '',
      antecedentes: '',
      profesionalesExternos: '',
      condicionesMedicas: '',
      consentimientoFirmado: true,
    });
  });

  const medicaciones: Medicacion[] = [];
  let medN = 1;
  const pushMed = (pacienteId: string, data: Omit<Medicacion, 'id' | 'pacienteId' | 'historial'> & { historialDetalle?: string }) => {
    const id = `MED-${String(medN++).padStart(4, '0')}`;
    medicaciones.push({
      id,
      pacienteId,
      droga: data.droga,
      presentacion: data.presentacion,
      concentracion: data.concentracion,
      dosis: data.dosis,
      horarios: data.horarios,
      fechaInicio: data.fechaInicio,
      observaciones: data.observaciones,
      activo: data.activo,
      historial: [{ id: `ADD-${id}-1`, fecha: data.fechaInicio, motivo: 'Alta', detalle: data.historialDetalle ?? 'Inicio de tratamiento' }],
    });
  };
  pushMed(pacientes[0].id, {
    droga: 'Risperidona', presentacion: 'Comprimido', concentracion: '1 mg',
    dosis: '1 comprimido', horarios: 'Noche', fechaInicio: addDays(today, -200),
    observaciones: 'Indicado por psiquiatra externo', activo: true,
  });
  pushMed(pacientes[10].id, {
    droga: 'Ácido valproico', presentacion: 'Comprimido', concentracion: '500 mg',
    dosis: '1 comprimido', horarios: 'Mañana y noche', fechaInicio: addDays(today, -500),
    observaciones: 'Control periódico de niveles', activo: true,
  });
  pushMed(pacientes[1].id, {
    droga: 'Baclofeno', presentacion: 'Comprimido', concentracion: '10 mg',
    dosis: '1/2 comprimido', horarios: 'Mañana y tarde', fechaInicio: addDays(today, -120),
    observaciones: '', activo: true,
  });

  const talleres: Taller[] = TALLERES.map(({ dows: _d, hora: _h, areaId: _a, notas: _n, inscriptos, ...t }) => ({
    ...t,
    inscriptos: inscriptos.map((n) => pacientes[n - 1].id),
  }));

  // ----- Evoluciones: desde el 1° del mes de hace dos meses hasta hoy -----
  const start = `${shiftPeriod(today.slice(0, 7), -2)}-01`;
  const now = nowTime();
  const drafts: Omit<Evolucion, 'id'>[] = [];

  for (let date = start; date <= today; date = addDays(date, 1)) {
    const dow = parseISO(date).getDay();
    const skipIfFuture = (hora: string) => date === today && hora > now;

    PACIENTES.forEach((sp, i) => {
      const paciente = pacientes[i];
      for (const item of sp.plan) {
        if (!item.dows.includes(dow) || skipIfFuture(item.hora) || rand() < 0.1) continue;
        drafts.push({
          fecha: date, hora: item.hora, pacienteId: paciente.id, areaId: item.areaId, profesional: item.prof,
          modalidad: 'Individual',
          nota: pick(NOTAS[item.areaId]).replace('{n}', paciente.nombre.split(' ')[0]),
          objetivos: pick(OBJETIVOS[item.areaId]),
          addendas: [],
        });
      }
    });

    TALLERES.forEach((st, ti) => {
      if (!st.activo || !st.dows.includes(dow) || skipIfFuture(st.hora) || st.notas.length === 0) return;
      for (const num of st.inscriptos) {
        if (rand() < 0.15) continue;
        const paciente = pacientes[num - 1];
        if (paciente.estado !== 'Activo') continue;
        drafts.push({
          fecha: date, hora: st.hora, pacienteId: paciente.id, areaId: st.areaId, profesional: st.terapeutas[0],
          modalidad: 'Taller', tallerId: talleres[ti].id,
          nota: pick(st.notas).replace('{n}', paciente.nombre.split(' ')[0]),
          objetivos: pick(OBJETIVOS[st.areaId]),
          addendas: [],
        });
      }
    });
  }

  drafts.sort((a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`));
  const evoluciones: Evolucion[] = drafts.map((d, i) => ({ ...d, id: `EVO-${String(i + 1).padStart(4, '0')}` }));

  // ----- Facturación: una línea por paciente / práctica / mes, a partir de las sesiones cargadas -----
  const grupos = new Map<string, { periodo: string; paciente: Paciente; practica: string; valor: number; sesiones: number }>();
  for (const e of evoluciones) {
    const practica = practicaDeEvolucion(e);
    const paciente = pacientes.find((p) => p.id === e.pacienteId);
    if (!practica || !paciente) continue;
    const periodo = e.fecha.slice(0, 7);
    const key = `${periodo}|${paciente.id}|${practica.nombre}`;
    const g = grupos.get(key) ?? {
      periodo, paciente, practica: practica.nombre, valor: valorSugerido(practica, paciente.cobertura), sesiones: 0,
    };
    g.sesiones += 1;
    grupos.set(key, g);
  }

  const current = today.slice(0, 7);
  const sorted = [...grupos.values()].sort(
    (a, b) => a.periodo.localeCompare(b.periodo) || a.paciente.id.localeCompare(b.paciente.id) || a.practica.localeCompare(b.practica),
  );
  const ids = new Set<string>();
  const facturacion: Facturacion[] = sorted.map((g) => {
    const [id] = nextFacturacionIds([...ids], g.periodo, 1);
    ids.add(id);
    let estado: Facturacion['estado'] = 'Pendiente';
    if (g.periodo === shiftPeriod(current, -2)) estado = g.paciente.cobertura === 'OSDE' ? 'Presentado' : 'Liquidado';
    else if (g.periodo === shiftPeriod(current, -1)) {
      estado = ['OSECAC', 'PAMI'].includes(g.paciente.cobertura)
        ? 'Pendiente'
        : g.paciente.tipoCobertura === 'Particular' ? 'Liquidado' : 'Presentado';
    }
    return {
      id, periodo: g.periodo, cobertura: g.paciente.cobertura, pacienteId: g.paciente.id, sesiones: g.sesiones,
      practica: g.practica, valorSesion: g.valor, estado,
    };
  });

  return { pacientes, evoluciones, talleres, facturacion, areas: AREAS, medicaciones };
}

export const SEED_DESCRIPTION = `Datos ficticios de ejemplo (${formatPeriod(shiftPeriod(todayISO().slice(0, 7), -2))} a hoy).`;
