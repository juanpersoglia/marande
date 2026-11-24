import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { Button, Modal } from '@/components/ui';
import { cn } from '@/lib/format';

// ---------- Toasts ----------
type ToastTone = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ConfirmOptions {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
}

interface FeedbackContextValue {
  toast: (message: string, tone?: ToastTone) => void;
  /** Muestra un mensaje de error a partir de cualquier excepción. */
  toastError: (err: unknown) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [pending, setPending] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const toast = useCallback(
    (message: string, tone: ToastTone = 'success') => {
      const id = ++counter.current;
      setToasts((t) => [...t, { id, tone, message }]);
      setTimeout(() => dismiss(id), tone === 'error' ? 7000 : 3500);
    },
    [dismiss],
  );

  const toastError = useCallback((err: unknown) => toast(err instanceof Error ? err.message : 'Ocurrió un error inesperado.', 'error'), [toast]);

  const confirm = useCallback(
    (options: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ ...options, resolve })),
    [],
  );

  const settle = (value: boolean) => {
    pending?.resolve(value);
    setPending(null);
  };

  const icons = { success: CircleCheck, error: CircleAlert, info: Info };
  const styles = {
    success: 'border-emerald-200 text-emerald-900 [&>svg]:text-emerald-600',
    error: 'border-red-200 text-red-900 [&>svg]:text-red-600',
    info: 'border-sky-200 text-sky-900 [&>svg]:text-sky-600',
  };

  return (
    <FeedbackContext.Provider value={{ toast, toastError, confirm }}>
      {children}
      <div className="no-print pointer-events-none fixed right-3 bottom-3 z-[60] flex w-[calc(100%-1.5rem)] max-w-sm flex-col gap-2 sm:right-4 sm:bottom-4" aria-live="polite">
        {toasts.map((t) => {
          const Icon = icons[t.tone];
          return (
            <div key={t.id} className={cn('pointer-events-auto flex items-start gap-3 rounded-xl border bg-white p-3.5 text-sm shadow-lg', styles[t.tone])}>
              <Icon className="mt-0.5 size-5 shrink-0" />
              <p className="flex-1 font-medium">{t.message}</p>
              <button onClick={() => dismiss(t.id)} aria-label="Cerrar aviso" className="text-slate-400 hover:text-slate-700">
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
      <Modal
        open={!!pending}
        onClose={() => settle(false)}
        title={pending?.title ?? ''}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => settle(false)}>Cancelar</Button>
            <Button variant={pending?.tone === 'primary' ? 'primary' : 'danger'} onClick={() => settle(true)}>
              {pending?.confirmLabel ?? 'Confirmar'}
            </Button>
          </>
        }
      >
        <div className="text-sm text-slate-600">{pending?.message}</div>
      </Modal>
    </FeedbackContext.Provider>
  );
}

export function useFeedback(): FeedbackContextValue {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback debe usarse dentro de <FeedbackProvider>');
  return ctx;
}
