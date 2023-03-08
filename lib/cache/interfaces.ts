import type { KeyType } from 'ioredis';

/**
 * Cache key parameters
 */
export interface CacheKeyParams {
  /**
   * @default corva
   */
  provider?: string;
  assetId: number;
  appStreamId: number;
  appKey: string;
  sourceType?: string;
  appConnectionId: number;
}

/**
 * @internal
 */
export interface RedisExtension {
  luaGet(hashName: KeyType, zsetName: KeyType, key: string): Promise<string | null>;
  luaSet(hashName: KeyType, zsetName: KeyType, key: string, value: unknown, ttl: number): Promise<null>;
  luaVacuum(hashName: KeyType, zsetName: KeyType, delete_count: number): Promise<null>;
  luaDeleteAll(hashName: KeyType, zsetName: KeyType): Promise<null>;
}
