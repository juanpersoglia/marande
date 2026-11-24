import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { FeedbackProvider } from '@/components/feedback';
import { Button } from '@/components/ui';
import { DataProvider, useData } from '@/store/DataContext';
import DashboardPage from '@/pages/DashboardPage';
import PacientesPage from '@/pages/PacientesPage';
import PacienteFichaPage from '@/pages/PacienteFichaPage';
import EvolucionesPage from '@/pages/EvolucionesPage';
import TalleresPage from '@/pages/TalleresPage';
import FacturacionPage from '@/pages/FacturacionPage';
import DatosPage from '@/pages/DatosPage';

function Gate() {
  const { status, error, storage } = useData();

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        <div className="flex items-center gap-3">
          <span className="size-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          Cargando historia clínica...
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md rounded-xl border border-red-200 bg-white p-6 text-center shadow-xs">
          <h1 className="text-lg font-semibold text-slate-900">No se pudieron cargar los datos</h1>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
          <p className="mt-1 text-xs text-slate-400">Almacenamiento: {storage.label}</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>Reintentar</Button>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="pacientes" element={<PacientesPage />} />
        <Route path="pacientes/:id" element={<PacienteFichaPage />} />
        <Route path="evoluciones" element={<EvolucionesPage />} />
        <Route path="talleres" element={<TalleresPage />} />
        <Route path="facturacion" element={<FacturacionPage />} />
        <Route path="datos" element={<DatosPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <FeedbackProvider>
        <DataProvider>
          <Gate />
        </DataProvider>
      </FeedbackProvider>
    </BrowserRouter>
  );
}
