import { createHttpRepositories } from './httpRepository';
import { createLocalStorageRepositories } from './localStorageRepository';
import type { Repositories } from './types';

export type { Repositories, Repository } from './types';

/**
 * Único lugar donde se decide el backend de persistencia.
 *   npm run dev      -> localStorage
 *   npm run dev:api  -> servidor Express (VITE_STORAGE=api)
 * Para sumar Supabase / Google Sheets: crear `supabaseRepository.ts` y devolverlo acá.
 */
export function createRepositories(): Repositories {
  return import.meta.env.VITE_STORAGE === 'api' ? createHttpRepositories() : createLocalStorageRepositories();
}
