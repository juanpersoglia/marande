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
    toast('Respaldo descargado. Guardalo en un lugar seguro.');
  };

  const exportCsv = (key: CollectionKey) => {
    downloadFile(`${key}-${todayISO()}.csv`, exportCollectionCSV(key, db));
    toast(`Planilla de ${CSV_LABELS[key].toLowerCase()} descargada.`);
  };

  const onJsonFile = async (file: File) => {
    setBusy(true);
    try {
      const text = await readFileAsText(file);
      const data = parseDatabaseJSON(text);
      const counts = COLLECTION_KEYS.filter((k) => data[k]).map((k) => `${CSV_LABELS[k]}: ${data[k]!.length}`).join(', ');
      const ok = await confirm({
        title: importMode === 'replace' ? '¿Reemplazar los datos actuales?' : '¿Sumar estos datos?',
        message: (
          <>
            <p className="mb-2">Archivo: <strong>{file.name}</strong></p>
            <p className="mb-2">{counts}</p>
            <p>
              {importMode === 'replace'
                ? 'Se van a borrar los datos actuales de esas secciones y se van a cargar los del archivo.'
                : 'Se van a agregar los nuevos y actualizar los que ya existan. No se pierde el resto.'}
            </p>
          </>
        ),
        confirmLabel: importMode === 'replace' ? 'Reemplazar' : 'Sumar datos',
        tone: importMode === 'replace' ? 'danger' : 'primary',
      });
      if (!ok) return;
      const summary = await importDatabase(data, importMode);
      const detail = Object.entries(summary).map(([k, n]) => `${CSV_LABELS[k as CollectionKey]}: ${n}`).join(', ');
      toast(`Datos cargados · ${detail}`);
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
        title: `Importar ${CSV_LABELS[csvKey].toLowerCase()}`,
        message: (
          <>
            <p className="mb-2">
              Se encontraron {result.items.length} {result.items.length === 1 ? 'fila lista' : 'filas listas'}
              {result.errors.length ? ` y ${result.errors.length} con error` : ''}.
            </p>
            {result.errors.length > 0 && (
              <ul className="mb-2 max-h-32 list-disc overflow-auto pl-5 text-xs text-amber-800">
                {result.errors.slice(0, 8).map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
            <p>
              {importMode === 'replace'
                ? 'Se reemplazan todos los datos de esta sección.'
                : 'Se suman a lo que ya hay (si el código se repite, se actualiza).'}
            </p>
          </>
        ),
        confirmLabel: 'Importar',
        tone: importMode === 'replace' ? 'danger' : 'primary',
      });
      if (!ok) return;
      await importDatabase(payload, importMode === 'replace' ? 'replace' : 'merge');
      toast(`Se importaron ${result.items.length} registros de ${CSV_LABELS[csvKey].toLowerCase()}.`);
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
      message: 'Se van a reemplazar todos tus datos actuales por los de demostración. Si querés conservarlos, primero descargá un respaldo.',
      confirmLabel: 'Restaurar ejemplos',
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
      message: 'Se van a borrar pacientes, evoluciones, talleres y facturación. Las áreas/especialidades se mantienen.',
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
        description="Acá podés guardar una copia de toda la información o cargarla en otra computadora o celular. Es la forma de no perder lo que cargaste."
      />

      <div className="mb-6 rounded-xl border border-brand-200 bg-brand-50 px-4 py-4 text-sm text-brand-900 sm:px-5">
        <p className="font-semibold">Dónde se guardan tus datos: {storage.label}</p>
        <p className="mt-1 text-brand-800">
          {storage.kind === 'local'
            ? 'La información queda en este navegador. Si cambiás de equipo o borrás los datos del sitio, se pierde. Por eso conviene descargar un respaldo de vez en cuando.'
            : 'La información se guarda en el servidor del instituto y se comparte entre quienes usan el sistema.'}
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
          <CardHeader
            title="Copia de seguridad completa"
            description="Descargá un solo archivo con todo (pacientes, evoluciones, talleres y facturación). Ideal para pasarlo a otra PC."
          />
          <div className="space-y-4 p-5">
            <div className="flex flex-wrap gap-2">
              <Button onClick={exportJson}><Download className="size-4" />Descargar respaldo</Button>
              <Button variant="secondary" disabled={busy} onClick={() => jsonInput.current?.click()}>
                <Upload className="size-4" />Cargar respaldo
              </Button>
              <input ref={jsonInput} type="file" accept=".json,application/json" className="hidden" onChange={(e) => e.target.files?.[0] && onJsonFile(e.target.files[0])} />
            </div>
            <div>
              <p className="mb-1 text-sm font-medium text-slate-700">Al cargar un respaldo</p>
              <Select value={importMode} onChange={(e) => setImportMode(e.target.value as ImportMode)} aria-label="Cómo cargar el respaldo">
                <option value="merge">Sumar a lo que ya hay (recomendado)</option>
                <option value="replace">Reemplazar los datos actuales</option>
              </Select>
            </div>
            <p className="flex items-start gap-2 text-xs text-slate-500">
              <FileJson className="mt-0.5 size-4 shrink-0" />
              El archivo se descarga con la fecha del día para que sepas cuándo lo hiciste.
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Exportar o importar planillas"
            description="Una sección por archivo, para abrir o editar en Excel o Google Sheets."
          />
          <div className="space-y-4 p-5">
            <div>
              <p className="mb-1 text-sm font-medium text-slate-700">Qué sección</p>
              <Select value={csvKey} onChange={(e) => setCsvKey(e.target.value as CollectionKey)} aria-label="Sección a exportar o importar">
                {COLLECTION_KEYS.map((k) => <option key={k} value={k}>{CSV_LABELS[k]}</option>)}
              </Select>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => exportCsv(csvKey)}><Download className="size-4" />Descargar planilla</Button>
              <Button variant="secondary" disabled={busy} onClick={() => csvInput.current?.click()}>
                <Upload className="size-4" />Cargar planilla
              </Button>
              <input ref={csvInput} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && onCsvFile(e.target.files[0])} />
            </div>
            <p className="flex items-start gap-2 text-xs text-slate-500">
              <FileSpreadsheet className="mt-0.5 size-4 shrink-0" />
              También podés descargar planillas desde Evoluciones o Facturación con los filtros que tengas aplicados.
            </p>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Opciones de prueba"
            description="Útil si querés volver a los datos de ejemplo o empezar de cero."
          />
          <div className="flex flex-wrap gap-3 p-5">
            <Button variant="secondary" onClick={restoreDemo}><RefreshCcw className="size-4" />Volver a datos de ejemplo</Button>
            <Button variant="danger" onClick={clearData}><Trash2 className="size-4" />Borrar todos los datos</Button>
          </div>
        </Card>
      </div>
    </>
  );
}
