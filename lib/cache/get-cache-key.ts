import { ERROR_MISSING_CONNECTION_ID } from '../constants';
import type { CacheKeyParams } from './interfaces';

/**
 * Generates cache key from provided params
 * @throws {Error} if appConnectionId is not provided
 */
export function getCacheKey({
  provider = 'corva',
  assetId,
  appStreamId,
  appKey,
  appConnectionId,
}: CacheKeyParams): string {
  if (typeof appConnectionId === 'undefined') {
    throw new Error(ERROR_MISSING_CONNECTION_ID);
  }

  return `${provider}/well/${assetId}/stream/${appStreamId}/${appKey}/${appConnectionId}`;
}
