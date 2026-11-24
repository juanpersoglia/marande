import { COLLECTION_KEYS } from '@/types';
import type { Repositories, Repository } from './types';

// Ejemplo de implementación remota: habla con el servidor Express (server/index.js).
// Para Supabase / Apps Script / otra API basta con replicar este archivo.

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
  } catch (err) {
    throw new Error('No se pudo conectar con el servidor. ¿Está corriendo "npm run server"?', { cause: err });
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Error del servidor (${res.status})`);
  }
  return res.json() as Promise<T>;
}

class HttpRepository<T extends { id: string }> implements Repository<T> {
  constructor(private readonly base: string) {}

  list() {
    return request<T[]>(this.base);
  }
  upsert(item: T) {
    return request<T>(`${this.base}/${encodeURIComponent(item.id)}`, {
      method: 'PUT',
      body: JSON.stringify(item),
    });
  }
  async remove(id: string) {
    await request(`${this.base}/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }
  async replaceAll(items: T[]) {
    await request(this.base, { method: 'PUT', body: JSON.stringify(items) });
  }
}

export function createHttpRepositories(apiBase = '/api'): Repositories {
  const repos = Object.fromEntries(
    COLLECTION_KEYS.map((name) => [name, new HttpRepository(`${apiBase}/${name}`)]),
  );
  return {
    ...(repos as unknown as Omit<Repositories, 'label' | 'kind' | 'isInitialized' | 'markInitialized'>),
    label: 'Servidor (API Express)',
    kind: 'api',
    async isInitialized() {
      const status = await request<{ initialized: boolean }>(`${apiBase}/status`);
      return status.initialized;
    },
    async markInitialized() {
      // El servidor considera inicializada la base apenas existe db.json (se crea al sembrar).
    },
  };
}
