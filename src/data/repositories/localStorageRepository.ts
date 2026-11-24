import type { CollectionKey } from '@/types';
import { COLLECTION_KEYS } from '@/types';
import type { Repositories, Repository } from './types';

const PREFIX = 'hcd:v1:';
const INIT_KEY = `${PREFIX}initialized`;

export const storageKey = (name: CollectionKey) => `${PREFIX}${name}`;

class LocalStorageRepository<T extends { id: string }> implements Repository<T> {
  private cache: T[] | null = null;

  constructor(private readonly key: string) {}

  private read(): T[] {
    if (this.cache) return this.cache;
    try {
      const raw = localStorage.getItem(this.key);
      this.cache = raw ? (JSON.parse(raw) as T[]) : [];
    } catch {
      this.cache = [];
    }
    return this.cache;
  }

  private write(items: T[]) {
    this.cache = items;
    try {
      localStorage.setItem(this.key, JSON.stringify(items));
    } catch (err) {
      this.cache = null;
      throw new Error(
        'No se pudo guardar en este navegador. Probá liberar espacio o descargá un respaldo desde Datos y respaldo.',
        { cause: err },
      );
    }
  }

  async list() {
    return [...this.read()];
  }

  async upsert(item: T) {
    const items = this.read();
    const index = items.findIndex((x) => x.id === item.id);
    this.write(index >= 0 ? items.map((x, i) => (i === index ? item : x)) : [...items, item]);
    return item;
  }

  async remove(id: string) {
    this.write(this.read().filter((x) => x.id !== id));
  }

  async replaceAll(items: T[]) {
    this.write([...items]);
  }
}

export function createLocalStorageRepositories(): Repositories {
  const repos = Object.fromEntries(
    COLLECTION_KEYS.map((name) => [name, new LocalStorageRepository(storageKey(name))]),
  );
  return {
    ...(repos as unknown as Omit<Repositories, 'label' | 'kind' | 'isInitialized' | 'markInitialized'>),
    label: 'Este navegador / dispositivo',
    kind: 'local',
    async isInitialized() {
      return localStorage.getItem(INIT_KEY) === '1';
    },
    async markInitialized() {
      localStorage.setItem(INIT_KEY, '1');
    },
  };
}
