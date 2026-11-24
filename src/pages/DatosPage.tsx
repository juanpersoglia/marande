import { useRef, useState } from 'react';
import { Download, FileJson, FileSpreadsheet, RefreshCcw, Trash2, Upload } from 'lucide-react';
import { Button, Card, CardHeader, PageHeader, Select } from '@/components/ui';
import { useFeedback } from '@/components/feedback';
import { downloadFile, readFileAsText } from '@/lib/csv';
import { todayISO } from '@/lib/format';
import {
  APP_ID,
  CSV_LABELS,
  exportCollectionCSV,
  exportDatabaseJSON,
  importCollectionCSV,
  parseDatabaseJSON,
} from '@/services/dataTransfer';
import { useData, type ImportMode } from '@/store/DataContext';
import { COLLECTION_KEYS, type CollectionKey, type Database } from '@/types';

export default function DatosPage() {
  const { db, storage, importDatabase, restoreDemoData, clearAllData, saveArea } = useData();
  const { toast, toastError, confirm } = useFeedback();
  const jsonInput = useRef<HTMLInputElement>(null);
  const csvInput = useRef<HTMLInputElement>(null);
  const [csvKey, setCsvKey] = useState<CollectionKey>('pacientes');
  const [importMode, setImportMode] = useState<ImportMode>('merge');
  const [busy, setBusy] = useState(false);

  const exportJson = () => {
    downloadFile(`${APP_ID}-${todayISO()}.json`, exportDatabaseJSON(db), 'application/json;charset=utf-8');
    toast('Respaldo JSON descargado.');
  };

  const exportCsv = (key: CollectionKey) => {
    downloadFile(`${key}-${todayISO()}.csv`, exportCollectionCSV(key, db));
    toast(`${CSV_LABELS[key]} exportado a CSV.`);
  };

  const onJsonFile = async (file: File) => {
    setBusy(true);
    try {
      const text = await readFileAsText(file);
      const data = parseDatabaseJSON(text);
      const counts = COLLECTION_KEYS.filter((k) => data[k]).map((k) => `${CSV_LABELS[k]}: ${data[k]!.length}`).join(', ');
      const ok = await confirm({
        title: importMode === 'replace' ? 'Reemplazar todos los datos' : 'Fusionar datos',
        message: (
          <>
            <p className="mb-2">Archivo: <strong>{file.name}</strong></p>
            <p className="mb-2">{counts}</p>
            <p>
              {importMode === 'replace'
                ? 'Se reemplazarán las colecciones incluidas en el archivo.'
                : 'Se fusionarán por ID (los existentes se actualizan; los nuevos se agregan).'}
            </p>
          </>
        ),
        confirmLabel: importMode === 'replace' ? 'Reemplazar' : 'Fusionar',
        tone: importMode === 'replace' ? 'danger' : 'primary',
      });
      if (!ok) return;
      const summary = await importDatabase(data, importMode);
      const detail = Object.entries(summary).map(([k, n]) => `${CSV_LABELS[k as CollectionKey]}: ${n}`).join(', ');
      toast(`Importación OK · ${detail}`);
    } catch (err) {
      toastError(err);
    } finally {
      setBusy(false);
      if (jsonInput.current) jsonInput.current.value = '';
    }
  };

  const onCsvFile = async (file: File) => {
    setBusy(true);
    try {
      const text = await readFileAsText(file);
      const result = importCollectionCSV(csvKey, text, db);
      if (result.errors.length && result.items.length === 0) {
        throw new Error(result.errors.slice(0, 5).join('\n'));
      }
      for (const area of result.newAreas) await saveArea(area.nombre, area.id);
      const payload = { [csvKey]: result.items } as Partial<Database>;
      if (result.newAreas.length) payload.areas = [...db.areas, ...result.newAreas];
      const ok = await confirm({
        title: `Importar ${CSV_LABELS[csvKey]}`,
        message: (
          <>
            <p className="mb-2">{result.items.length} filas válidas{result.errors.length ? ` · ${result.errors.length} con error` : ''}.</p>
            {result.errors.length > 0 && (
              <ul className="mb-2 max-h-32 list-disc overflow-auto pl-5 text-xs text-amber-800">
                {result.errors.slice(0, 8).map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
            <p>Modo: {importMode === 'replace' ? 'reemplazar colección' : 'fusionar por ID'}.</p>
          </>
        ),
        confirmLabel: 'Importar',
        tone: importMode === 'replace' ? 'danger' : 'primary',
      });
      if (!ok) return;
      await importDatabase(payload, importMode === 'replace' ? 'replace' : 'merge');
      toast(`Importados ${result.items.length} registros de ${CSV_LABELS[csvKey]}.`);
    } catch (err) {
      toastError(err);
    } finally {
      setBusy(false);
      if (csvInput.current) csvInput.current.value = '';
    }
  };

  const restoreDemo = async () => {
    const ok = await confirm({
      title: 'Restaurar datos de ejemplo',
      message: 'Se reemplazarán todos los datos actuales por el set de demostración. Esta acción no se puede deshacer (salvo que tengas un respaldo).',
      confirmLabel: 'Restaurar demo',
    });
    if (!ok) return;
    try {
      await restoreDemoData();
      toast('Datos de ejemplo restaurados.');
    } catch (err) {
      toastError(err);
    }
  };

  const clearData = async () => {
    const ok = await confirm({
      title: 'Vaciar datos',
      message: 'Se borrarán pacientes, evoluciones, talleres y facturación. Se conservan las áreas/especialidades.',
      confirmLabel: 'Vaciar todo',
    });
    if (!ok) return;
    try {
      await clearAllData();
      toast('Datos vaciados.');
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <>
      <PageHeader
        title="Datos y respaldo"
        description="Importá / exportá JSON o CSV para no perder información al cambiar de navegador o equipo. La capa de repositorio permite migrar a API, Supabase o Sheets sin reescribir la interfaz."
      />

      <div className="mb-6 rounded-xl border border-brand-200 bg-brand-50 px-5 py-4 text-sm text-brand-900">
        <p className="font-semibold">Almacenamiento actual: {storage.label}</p>
        <p className="mt-1 text-brand-800">
          {storage.kind === 'local'
            ? 'Los datos viven en localStorage de este navegador. Hacé un respaldo JSON periódicamente.'
            : 'Los datos se persisten en el servidor Express (archivo db.json).'}
        </p>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-brand-800">
          <li>{db.pacientes.length} pacientes</li>
          <li>{db.evoluciones.length} evoluciones</li>
          <li>{db.talleres.length} talleres</li>
          <li>{db.facturacion.length} facturación</li>
          <li>{db.areas.length} áreas</li>
        </ul>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Respaldo completo (JSON)" description="Incluye todas las colecciones. Ideal para migrar de equipo." />
          <div className="space-y-4 p-5">
            <div className="flex flex-wrap gap-2">
              <Button onClick={exportJson}><Download className="size-4" />Exportar JSON</Button>
              <Button variant="secondary" disabled={busy} onClick={() => jsonInput.current?.click()}>
                <Upload className="size-4" />Importar JSON
              </Button>
              <input ref={jsonInput} type="file" accept=".json,application/json" className="hidden" onChange={(e) => e.target.files?.[0] && onJsonFile(e.target.files[0])} />
            </div>
            <div>
              <p className="mb-1 text-sm font-medium text-slate-700">Modo de importación</p>
              <Select value={importMode} onChange={(e) => setImportMode(e.target.value as ImportMode)} aria-label="Modo de importación">
                <option value="merge">Fusionar por ID (recomendado)</option>
                <option value="replace">Reemplazar colecciones del archivo</option>
              </Select>
            </div>
            <p className="flex items-start gap-2 text-xs text-slate-500">
              <FileJson className="mt-0.5 size-4 shrink-0" />
              El archivo incluye un encabezado con versión y fecha de exportación para trazabilidad.
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader title="Importar / exportar CSV" description="Una colección por archivo. Compatible con Excel (separador ;)." />
          <div className="space-y-4 p-5">
            <div>
              <p className="mb-1 text-sm font-medium text-slate-700">Colección</p>
              <Select value={csvKey} onChange={(e) => setCsvKey(e.target.value as CollectionKey)} aria-label="Colección CSV">
                {COLLECTION_KEYS.map((k) => <option key={k} value={k}>{CSV_LABELS[k]}</option>)}
              </Select>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => exportCsv(csvKey)}><Download className="size-4" />Exportar CSV</Button>
              <Button variant="secondary" disabled={busy} onClick={() => csvInput.current?.click()}>
                <Upload className="size-4" />Importar CSV
              </Button>
              <input ref={csvInput} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && onCsvFile(e.target.files[0])} />
            </div>
            <p className="flex items-start gap-2 text-xs text-slate-500">
              <FileSpreadsheet className="mt-0.5 size-4 shrink-0" />
              Podés exportar cada módulo por separado desde acá, o usar los botones CSV de Evoluciones / Facturación con el filtro aplicado.
            </p>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Mantenimiento" description="Utilidades para demos y entornos de prueba." />
          <div className="flex flex-wrap gap-3 p-5">
            <Button variant="secondary" onClick={restoreDemo}><RefreshCcw className="size-4" />Restaurar datos de ejemplo</Button>
            <Button variant="danger" onClick={clearData}><Trash2 className="size-4" />Vaciar datos</Button>
          </div>
        </Card>
      </div>
    </>
  );
}
