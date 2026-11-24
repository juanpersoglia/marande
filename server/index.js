// Servidor Express de Historia Clínica Digital.
//  - Expone una API REST genérica por colección (/api/pacientes, /api/evoluciones, ...)
//    que persiste en server/data/db.json (reemplazable por cualquier base de datos).
//  - Sirve el build del front (carpeta dist/) con fallback para el router del cliente.
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3001;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');
const DIST_DIR = path.join(__dirname, '..', 'dist');

const COLLECTIONS = ['pacientes', 'evoluciones', 'talleres', 'facturacion', 'areas', 'medicaciones'];

// ---------- Persistencia en archivo (escritura atómica) ----------
function readDb() {
  if (!fs.existsSync(DATA_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (err) {
    console.error('No se pudo leer db.json:', err);
    return null;
  }
}

function writeDb(db) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

function emptyDb() {
  return Object.fromEntries(COLLECTIONS.map((c) => [c, []]));
}

// ---------- API ----------
const app = express();
app.use(express.json({ limit: '25mb' }));

app.get('/api/status', (_req, res) => {
  res.json({ ok: true, initialized: fs.existsSync(DATA_FILE), collections: COLLECTIONS });
});

app.param('collection', (req, res, next, name) => {
  if (!COLLECTIONS.includes(name)) {
    return res.status(404).json({ error: `Colección desconocida: ${name}` });
  }
  next();
});

app.get('/api/:collection', (req, res) => {
  const db = readDb() ?? emptyDb();
  res.json(db[req.params.collection] ?? []);
});

// Reemplaza la colección completa.
app.put('/api/:collection', (req, res) => {
  if (!Array.isArray(req.body)) return res.status(400).json({ error: 'Se esperaba un arreglo.' });
  const db = readDb() ?? emptyDb();
  db[req.params.collection] = req.body;
  writeDb(db);
  res.json({ ok: true, count: req.body.length });
});

// Crea o actualiza un registro.
app.put('/api/:collection/:id', (req, res) => {
  const item = req.body;
  if (!item || typeof item !== 'object' || item.id !== req.params.id) {
    return res.status(400).json({ error: 'El id del cuerpo debe coincidir con el de la URL.' });
  }
  const db = readDb() ?? emptyDb();
  const list = db[req.params.collection] ?? [];
  const index = list.findIndex((x) => x.id === item.id);
  if (index >= 0) list[index] = item;
  else list.push(item);
  db[req.params.collection] = list;
  writeDb(db);
  res.json(item);
});

app.delete('/api/:collection/:id', (req, res) => {
  const db = readDb() ?? emptyDb();
  db[req.params.collection] = (db[req.params.collection] ?? []).filter((x) => x.id !== req.params.id);
  writeDb(db);
  res.json({ ok: true });
});

// ---------- Front (build de producción) ----------
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Servidor listo en http://localhost:${PORT}`);
  if (!fs.existsSync(DIST_DIR)) {
    console.log('(No hay carpeta dist/: ejecutá "npm run build:api" para servir también la interfaz.)');
  }
});
