import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { ClipboardList, DatabaseBackup, HardDrive, LayoutDashboard, Menu, Receipt, Server, UsersRound, Users, X } from 'lucide-react';
import { cn, formatDateLong, todayISO } from '@/lib/format';
import { useData } from '@/store/DataContext';

const NAV = [
  { to: '/', label: 'Resumen', icon: LayoutDashboard, end: true },
  { to: '/pacientes', label: 'Pacientes', icon: Users },
  { to: '/evoluciones', label: 'Evoluciones', icon: ClipboardList },
  { to: '/talleres', label: 'Talleres', icon: UsersRound },
  { to: '/facturacion', label: 'Obras Sociales y Facturación', icon: Receipt },
  { to: '/datos', label: 'Datos y respaldo', icon: DatabaseBackup },
];

function Brand() {
  return (
    <div className="flex items-center gap-3 px-5 py-5">
      <div className="flex size-10 items-center justify-center rounded-xl bg-brand-500 shadow-inner">
        <svg viewBox="0 0 32 32" className="size-6" aria-hidden>
          <path d="M13 7h6v6h6v6h-6v6h-6v-6H7v-6h6z" fill="#fff" />
        </svg>
      </div>
      <div className="leading-tight">
        <p className="text-[15px] font-bold text-white">Historia Clínica</p>
        <p className="text-xs text-brand-200">Instituto de Discapacidad</p>
      </div>
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { storage } = useData();
  const StorageIcon = storage.kind === 'api' ? Server : HardDrive;
  return (
    <div className="flex h-full flex-col">
      <Brand />
      <nav className="flex-1 space-y-1 px-3 py-2" aria-label="Navegación principal">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive ? 'bg-white/15 text-white' : 'text-brand-100 hover:bg-white/10 hover:text-white',
              )
            }
          >
            <Icon className="size-5 shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="m-3 rounded-lg bg-black/15 p-3 text-xs text-brand-100">
        <div className="flex items-center gap-2 font-medium text-white">
          <StorageIcon className="size-4" />
          Almacenamiento
        </div>
        <p className="mt-1 text-brand-200">{storage.label}</p>
      </div>
    </div>
  );
}

export function Layout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="min-h-screen lg:pl-64">
      {/* Barra lateral fija (PC / tablet horizontal) */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 bg-brand-900 lg:block">
        <SidebarContent />
      </aside>

      {/* Cajón deslizable (tablet vertical / móvil) */}
      {open && (
        <div className="no-print fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-brand-900 shadow-2xl">
            <button onClick={() => setOpen(false)} aria-label="Cerrar menú" className="absolute top-4 right-3 rounded-lg p-2 text-brand-100 hover:bg-white/10">
              <X className="size-5" />
            </button>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <header className="no-print sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:px-8">
        <button onClick={() => setOpen(true)} aria-label="Abrir menú" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden">
          <Menu className="size-6" />
        </button>
        <p className="text-sm font-medium text-slate-500 first-letter:uppercase">{formatDateLong(todayISO())}</p>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8 lg:py-8">
        <Outlet />
      </main>
    </div>
  );
}
