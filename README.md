# Historia Clínica Digital

Aplicación web de Historia Clínica Digital para institutos de atención a la discapacidad (Argentina). Pensada para uso ágil en consulta (PC / tablet), con estética limpia y persistencia local o vía API.

## Arranque rápido

```bash
npm install
npm run dev
```

Abrí [http://localhost:5173](http://localhost:5173). La primera vez se cargan datos de ejemplo realistas (pacientes, evoluciones, talleres y facturación).

### Modo API (Express)

```bash
# Terminal 1
npm run server

# Terminal 2
npm run dev:api
```

El front habla con `http://localhost:3001/api` y persiste en `server/data/db.json`.

## Estructura

```
marande/
├── index.html
├── package.json
├── vite.config.ts
├── server/                 # API Express opcional
│   └── index.js
└── src/
    ├── App.tsx             # Rutas
    ├── main.tsx
    ├── index.css           # Tema (azul petróleo / teal)
    ├── types/              # Modelo de dominio
    ├── data/
    │   ├── seed.ts         # Datos de ejemplo
    │   ├── catalogs.ts     # Coberturas y nomenclador
    │   └── repositories/   # localStorage | HTTP (intercambiables)
    ├── store/              # DataContext (CRUD + import)
    ├── services/           # Dominio, queries, IDs, import/export
    ├── lib/                # format, csv
    ├── components/         # UI, layout, badges, feedback
    ├── features/           # Formularios por módulo
    └── pages/              # Pantallas
```

## Módulos

| Ruta | Módulo |
|------|--------|
| `/` | Dashboard / resumen general |
| `/pacientes` | Listado y alta de pacientes |
| `/pacientes/:id` | Ficha / legajo individual |
| `/evoluciones` | Registro clínico multidisciplinario |
| `/talleres` | Espacios grupales |
| `/facturacion` | Obras sociales y liquidación |
| `/datos` | Importar / exportar JSON y CSV |

## Persistencia

- Por defecto: **localStorage** (`npm run dev`).
- Opcional: **Express + JSON** (`npm run server` + `npm run dev:api`).
- La interfaz habla solo con repositorios (`src/data/repositories`). Para conectar Supabase, Google Sheets o otra API, agregá un repositorio nuevo y seleccionálo en `createRepositories()`.

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Front con Vite (localStorage) |
| `npm run dev:api` | Front apuntando a la API |
| `npm run server` | API Express en :3001 |
| `npm run build` | Build de producción |
| `npm run typecheck` | TypeScript sin emitir |
| `npm start` | Sirve API + `dist/` (después de `build`) |
