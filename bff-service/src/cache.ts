interface CacheEntry {
  expiresAt: number;
  status: number;
  headers: Record<string, string>;
  body: string;
}

export class TtlCache {
  private readonly store = new Map<string, CacheEntry>();

  constructor(private readonly ttlMs: number) {}

  get(key: string): CacheEntry | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry;
  }

  set(key: string, value: Omit<CacheEntry, 'expiresAt'>): void {
    this.store.set(key, { ...value, expiresAt: Date.now() + this.ttlMs });
  }

  invalidate(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }
}
