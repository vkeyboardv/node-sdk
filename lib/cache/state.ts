import { DEFAULT_CACHE_TTL } from '../constants';

import type { CorvaLogger } from '../logger/corva-logger';
import type { RedisExtension } from './interfaces';
import type { Redis, KeyType, ValueType } from 'ioredis';

/**
 * 
 * Apps might need to share some data between runs. The SDK provides a {@link State} class that allows you to store, load, and do
other operations with data.
 *
 * {@link State} instance is inserted automatically to {@link Corva.stream} and {@link Corva.scheduled} apps' {@link StatefulContext}
 * 
 * ⚠️⚠️⚠️ {@link Corva.task | Task} apps don't get a {@link State} inside {@link StatelessContext} as they aren't meant to store data between invokes.
 *
 * ℹ️ {@link State} uses a dict-like database, so the data is stored as `key:value` pairs.
 * ℹ️ `key` should be of `string` type, and `value` can have any of the following types: `string`, `Buffer`, `number`,`any[]`.
 * 
 * The SDK by itself creates the unique key under the hood, so no need to add well id/company name/etc. to the keys.
 * 
 * ### Use case
 * A typical example of Cache usage is:
 * 
 * 1. Store some data during app invoke.
 * 2. Retrieve and use the data during app invoke.
 * 
 * ### ℹ️ To get the most out of Cache
 * 
 * - Store as small amounts of data as possible.
 * - Try to stay below 100kb.
 */
export class State {
  private readonly zsetName: KeyType;
  /**
   * @internal
   */
  constructor(private redis: Redis & RedisExtension, private logger: CorvaLogger, private hashName: KeyType) {
    this.zsetName = `${hashName.toString()}.EXPIREAT`;
  }

  /**
   * Save multiple values
   *
   * ⚠️⚠️⚠️ Cache can store only string data. Cast your data to string before saving.
   *
   * ℹ️ By default, {@link State | Cache} sets an expiry to 60 days.
   * @example
   * ```ts
   * [[include:cache/store-and-load.ts]]
   * ```
   */
  store(key: string, value: ValueType, expiry?: number): Promise<void>;
  store(input: Record<string, ValueType>, expiry?: number): Promise<void>;
  public async store(
    input: string | Record<string, ValueType>,
    valueOrExpiry?: ValueType | number,
    expiry?: number,
  ): Promise<void> {
    if (typeof input === 'string') {
      await this.redis.luaSet(this.hashName, this.zsetName, input, valueOrExpiry, expiry || DEFAULT_CACHE_TTL);

      return;
    } else {
      await Promise.all(
        Object.entries(input).map(([key, value]) =>
          this.redis.luaSet(this.hashName, this.zsetName, key, value, (valueOrExpiry as number) || DEFAULT_CACHE_TTL),
        ),
      );
    }
  }

  /**
   * Load cache value by provided key
   * @example
   * ```ts
   * [[include:cache/store-and-load.ts]]
   * ```
   */
  public load(key: string): Promise<string> {
    return this.redis.luaGet(this.hashName, this.zsetName, key);
  }

  /**
   * Load multiple cache values by provided keys
   * @example
   * ```ts
   * [[include:cache/store-and-load-multiple.ts]]
   * ```
   */
  public loadMany(...keys: string[]): Promise<string[]> {
    return Promise.all(keys.map((field) => this.redis.luaGet(this.hashName, this.zsetName, field)));
  }

  /**
   * Load all cache values
   */
  public loadAll(): Promise<Record<string, string>> {
    return this.redis.hgetall(this.hashName);
  }

  /**
   * Clean value(s) from cache
   * @example
   * ```ts
   * [[include:cache/delete.ts]]
   * ```
   */
  public async delete(...keys: string[]): Promise<void> {
    await Promise.all(keys.map((key) => this.redis.luaSet(this.hashName, this.zsetName, key, '', -1)));
  }

  /**
   * Remove a few elements from cache
   * @example
   * ```ts
   * [[include:cache/delete-many.ts]]
   * ```
   */
  public async deleteMany(keys: string[]): Promise<void> {
    await Promise.all(keys.map((key) => this.redis.luaSet(this.hashName, this.zsetName, key, '', -1)));
  }

  /**
   * Clean all values from cache
   */
  public async deleteAll(): Promise<void> {
    await this.redis.luaDeleteAll(this.hashName, this.zsetName);
  }

  /**
   * @internal
   */
  public vacuum(count: number) {
    return this.redis.luaVacuum(this.hashName, this.zsetName, count);
  }
}
