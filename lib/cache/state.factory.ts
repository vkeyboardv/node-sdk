import IORedis, { Redis } from 'ioredis';
import { ContextCreationOpts } from '../interfaces';
import { RawStreamLambdaEvent, ScheduledLambdaEvent, StreamLambdaEvent } from '../lambdas/interfaces';
import { getCacheKey } from './get-cache-key';
import type { RedisExtension } from './interfaces';
import { State } from './state';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { SdkConfig } from '../config/types';

const getScript = readFileSync(join(__dirname, 'lua-scripts', 'get.lua'), 'utf-8');
const setScript = readFileSync(join(__dirname, 'lua-scripts', 'set.lua'), 'utf-8');
const vacuumScript = readFileSync(join(__dirname, 'lua-scripts', 'vacuum.lua'), 'utf-8');
const deleteAllScript = readFileSync(join(__dirname, 'lua-scripts', 'deleteAll.lua'), 'utf-8');

type Opts = ContextCreationOpts<
  StreamLambdaEvent<unknown> | ScheduledLambdaEvent<unknown>,
  RawStreamLambdaEvent<unknown> | ScheduledLambdaEvent<unknown>
>;

export class StateFactory {
  /**
   * @internal
   */
  static setup(opts: Opts): State {
    const redis = StateFactory.getCache(opts.config);

    return new State(
      redis,
      opts.logger,
      getCacheKey({
        provider: opts.config.app.provider,
        appKey: opts.config.app.key,
        assetId: opts.event.asset_id,
        appConnectionId: opts.event.app_connection,
        appStreamId: (opts.event as StreamLambdaEvent<unknown>).app_stream_id,
      }),
    );
  }

  private static redis: Redis;

  /**
   * @internal
   */
  public static getCache(config: SdkConfig) {
    if (!this.redis) {
      this.redis = new IORedis(config.cache.url, config.cache.options);

      this.redis.defineCommand('luaGet', { numberOfKeys: 2, lua: getScript });
      this.redis.defineCommand('luaSet', { numberOfKeys: 2, lua: setScript });
      this.redis.defineCommand('luaVacuum', { numberOfKeys: 2, lua: vacuumScript });
      this.redis.defineCommand('luaDeleteAll', { numberOfKeys: 2, lua: deleteAllScript });
    }

    return this.redis as Redis & RedisExtension;
  }
}
