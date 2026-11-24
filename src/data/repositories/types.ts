import type { CollectionKey, Entity } from '@/types';

/**
 * Contrato de persistencia. La interfaz (React) NUNCA habla con localStorage ni con fetch:
 * solo conoce estas interfaces. Para conectar Google Sheets / Apps Script, Supabase o
 * cualquier API alcanza con crear otra implementación de `Repositories` (ver httpRepository.ts
 * como ejemplo) y devolverla desde `createRepositories()` en `index.ts`.
 */
export interface Repository<T extends { id: string }> {
  list(): Promise<T[]>;
  upsert(item: T): Promise<T>;
  remove(id: string): Promise<void>;
  /** Reemplaza toda la colección (importaciones, restauración de datos de ejemplo). */
  replaceAll(items: T[]): Promise<void>;
}

export type Repositories = {
  [K in CollectionKey]: Repository<Entity<K>>;
} & {
  /** Etiqueta para mostrar en la UI (ej. "Navegador (localStorage)"). */
  readonly label: string;
  readonly kind: 'local' | 'api';
  /** ¿Ya se cargaron datos alguna vez? Evita volver a sembrar datos de ejemplo. */
  isInitialized(): Promise<boolean>;
  markInitialized(): Promise<void>;
};
