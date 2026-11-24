import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { ClipboardList, DatabaseBackup, HardDrive, LayoutDashboard, Menu, Receipt, Server, UsersRound, Users, X } from 'lucide-react';
import { cn, formatDate, todayISO } from '@/lib/format';
import { useData } from '@/store/DataContext';

const NAV = [
  { to: '/', label: 'Resumen', icon: LayoutDashboard, end: true },
  { to: '/pacientes', label: 'Pacientes', icon: Users },
  { to: '/evoluciones', label: 'Evoluciones', icon: ClipboardList },
  { to: '/talleres', label: 'Talleres', icon: UsersRound },
  { to: '/facturacion', label: 'Facturación', icon: Receipt },
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
      <div className="min-w-0 leading-tight">
        <p className="text-[15px] font-bold text-white">Historia Clínica</p>
        <p className="truncate text-xs text-brand-200">Instituto de Discapacidad</p>
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
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2" aria-label="Navegación principal">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
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
          Datos guardados en
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

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div className="min-h-screen min-w-0 lg:pl-64">
      {/* Barra lateral fija (PC / tablet horizontal) */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 bg-brand-900 lg:block">
        <SidebarContent />
      </aside>

      {/* Cajón deslizable (tablet vertical / móvil) */}
      {open && (
        <div className="no-print fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[min(18rem,88vw)] flex-col bg-brand-900 shadow-2xl">
            <button onClick={() => setOpen(false)} aria-label="Cerrar menú" className="absolute top-3 right-2 rounded-lg p-2.5 text-brand-100 hover:bg-white/10">
              <X className="size-5" />
            </button>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <header className="no-print sticky top-0 z-20 flex items-center gap-2 border-b border-slate-200 bg-white/90 px-3 py-2.5 backdrop-blur sm:gap-3 sm:px-4 sm:py-3 lg:px-8">
        <button onClick={() => setOpen(true)} aria-label="Abrir menú" className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden">
          <Menu className="size-6" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800 lg:hidden">Historia Clínica</p>
          <p className="truncate text-xs text-slate-500 first-letter:uppercase sm:text-sm sm:font-medium lg:text-slate-500">
            {formatDate(todayISO())}
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl min-w-0 px-3 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-8">
        <Outlet />
      </main>
    </div>
  );
}
