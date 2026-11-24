import { useEffect, useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/format';

// ---------- Botones ----------
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft';
const buttonStyles: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white shadow-xs hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-300',
  secondary: 'border border-slate-300 bg-white text-slate-700 shadow-xs hover:bg-slate-50 active:bg-slate-100',
  soft: 'bg-brand-50 text-brand-800 hover:bg-brand-100',
  ghost: 'text-slate-600 hover:bg-slate-100 active:bg-slate-200',
  danger: 'bg-red-600 text-white shadow-xs hover:bg-red-700 active:bg-red-800',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-70',
        size === 'sm' && 'min-h-9 px-2.5 py-1.5 text-xs',
        size === 'md' && 'min-h-11 px-3.5 py-2.5 text-sm sm:min-h-10 sm:py-2',
        size === 'lg' && 'min-h-12 px-5 py-3 text-base',
        buttonStyles[variant],
        className,
      )}
      {...props}
    />
  );
}

export function IconButton({
  label,
  className,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn('inline-flex size-10 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 sm:size-8', className)}
      {...props}
    />
  );
}

// ---------- Contenedores ----------
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn('rounded-xl border border-slate-200 bg-white shadow-xs', className)}>{children}</section>;
}

export function CardHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5 sm:py-4">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-bold tracking-tight break-words text-slate-900 sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-slate-500">{description}</p>}
      </div>
      {actions && (
        <div className="no-print flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center [&>button]:w-full sm:[&>button]:w-auto">
          {actions}
        </div>
      )}
    </header>
  );
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      {icon && <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">{icon}</div>}
      <p className="font-semibold text-slate-800">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ---------- Etiquetas ----------
export type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';
const toneStyles: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  brand: 'bg-brand-50 text-brand-800 ring-brand-200',
  success: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-800 ring-amber-200',
  danger: 'bg-red-50 text-red-700 ring-red-200',
  info: 'bg-sky-50 text-sky-800 ring-sky-200',
};

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset', toneStyles[tone], className)}>
      {children}
    </span>
  );
}

export function StatCard({
  label, value, hint, icon, tone = 'brand',
}: { label: string; value: ReactNode; hint?: ReactNode; icon: ReactNode; tone?: 'brand' | 'sky' | 'amber' | 'emerald' }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-700',
    sky: 'bg-sky-50 text-sky-700',
    amber: 'bg-amber-50 text-amber-700',
    emerald: 'bg-emerald-50 text-emerald-700',
  };
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight break-words text-slate-900 sm:text-3xl">{value}</p>
        </div>
        <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl sm:size-11', tones[tone])}>{icon}</div>
      </div>
      {hint && <p className="mt-3 text-sm text-slate-500">{hint}</p>}
    </Card>
  );
}

export function ProgressBar({ value, tone = 'brand' }: { value: number; tone?: 'brand' | 'amber' | 'red' }) {
  const colors = { brand: 'bg-brand-500', amber: 'bg-amber-500', red: 'bg-red-500' };
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn('h-full rounded-full transition-all', colors[tone])} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

// ---------- Formularios ----------
export function Field({
  label, hint, error, required, className, children,
}: { label: string; hint?: ReactNode; error?: string; required?: boolean; className?: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children(id)}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function Input({ className, invalid, ...props }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input className={cn('field-control', className)} aria-invalid={invalid || undefined} {...props} />;
}

export function Select({ className, invalid, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select className={cn('field-control pr-8', className)} aria-invalid={invalid || undefined} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className, invalid, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <textarea className={cn('field-control min-h-24 resize-y', className)} aria-invalid={invalid || undefined} {...props} />;
}

export function SearchInput({ value, onChange, placeholder, className }: { value: string; onChange: (v: string) => void; placeholder: string; className?: string }) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="field-control pl-9"
      />
    </div>
  );
}

export function Segmented<T extends string>({
  value, onChange, options, label,
}: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex w-full rounded-lg bg-slate-100 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            value === o.value ? 'bg-white text-brand-800 shadow-xs' : 'text-slate-600 hover:text-slate-900',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (v: T) => void; tabs: { value: T; label: string; count?: number }[] }) {
  return (
    <div role="tablist" className="no-print flex gap-1 overflow-x-auto border-b border-slate-200">
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            '-mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors',
            value === t.value ? 'border-brand-600 text-brand-800' : 'border-transparent text-slate-500 hover:text-slate-800',
          )}
        >
          {t.label}
          {t.count !== undefined && (
            <span className={cn('rounded-full px-2 py-0.5 text-xs', value === t.value ? 'bg-brand-100 text-brand-800' : 'bg-slate-100 text-slate-600')}>{t.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ---------- Modal ----------
export function Modal({
  open, onClose, title, description, children, footer, size = 'md',
}: { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' };
  return (
    <div className="no-print fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4 md:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className={cn('relative flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-2xl', widths[size])}>
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:gap-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="text-base font-semibold break-words text-slate-900 sm:text-lg">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
          </div>
          <IconButton label="Cerrar" onClick={onClose} className="shrink-0">
            <X className="size-5" />
          </IconButton>
        </div>
        <div className="overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">{children}</div>
        {footer && (
          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:rounded-b-2xl sm:px-6 [&>button]:w-full sm:[&>button]:w-auto">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Tabla ----------
export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="-mx-px overflow-x-auto overscroll-x-contain">{children}</div>;
}
