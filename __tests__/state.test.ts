/* eslint-disable @typescript-eslint/unbound-method */
import { State } from '../lib/cache/state';
import { CorvaLogger } from '../lib';
import { DEFAULT_CACHE_TTL } from '../lib/constants';
import { ContextCreationOpts } from '../lib/interfaces';
import { RawStreamLambdaEvent, ScheduledLambdaEvent, StreamLambdaEvent } from '../lib/lambdas/interfaces';
import { StateFactory } from '../lib/cache/state.factory';
import { runtimeConfig } from '../lib/config/runtime-config';

describe('State', () => {
  let state: State;
  const hashName = 'test-provider/well/42/stream/126/some-provider.some-app-name/84';
  const zsetName = 'test-provider/well/42/stream/126/some-provider.some-app-name/84.EXPIREAT';
  const redis = StateFactory.getCache(runtimeConfig);
  const logger = {
    warn: jest.fn(),
  } as unknown as CorvaLogger;
  const fakeOpts = {
    logger,
    config: {
      app: runtimeConfig.app,
    },
    event: {
      asset_id: 42,
      app_connection: 84,
      app_stream_id: 126,
    },
  } as unknown as ContextCreationOpts<
    StreamLambdaEvent<unknown> | ScheduledLambdaEvent<unknown>,
    RawStreamLambdaEvent<unknown> | ScheduledLambdaEvent<unknown>
  >;

  beforeAll(async () => {
    await new Promise((resolve) => redis.once('connect', resolve));

    state = StateFactory.setup(fakeOpts);
  });

  beforeEach(async () => {
    await redis.flushdb();
  });

  afterAll(() => redis.disconnect());

  it('should setup lua methods for redis', () => {
    expect(redis.luaGet).toBeTruthy();
    expect(redis.luaSet).toBeTruthy();
    expect(redis.luaVacuum).toBeTruthy();
    expect(redis.luaDeleteAll).toBeTruthy();
  });

  describe('#store()', () => {
    describe('single value', () => {
      it('should store', async () => {
        await state.store('someKey', 'someValue');

        await expect(redis.hget(hashName, 'someKey')).resolves.toEqual('someValue');
      });

      it('should set a default expire', async () => {
        const now = Date.now();
        const expectedFrom = DEFAULT_CACHE_TTL * 1000 + now;
        // assuming that store + zscore will take no more than 110ms
        const expectedTo = expectedFrom + 110;

        await state.store('someKey', 'someValue');

        const expireAt = await redis.zscore(zsetName, 'someKey');

        expect(+expireAt).toBeGreaterThanOrEqual(expectedFrom);
        expect(+expireAt).toBeLessThan(expectedTo);
      });

      it('should set a custom expire', async () => {
        const customExpire = 500;
        const now = Date.now();
        const expectedFrom = customExpire * 1000 + now;
        // assuming that store + zscore will take no more than 110ms
        const expectedTo = expectedFrom + 110;

        await state.store('someKey', 'someValue', customExpire);

        const expireAt = await redis.zscore(zsetName, 'someKey');

        expect(+expireAt).toBeGreaterThanOrEqual(expectedFrom);
        expect(+expireAt).toBeLessThan(expectedTo);
      });
    });

    describe('multiple values', () => {
      it('should store', async () => {
        const data = {
          someKey: 'someValue',
          someKey2: 'someValue2',
          someKey3: 'someValue2',
        };

        await state.store(data);

        for (const [key, expected] of Object.entries(data)) {
          await expect(redis.hget(hashName, key)).resolves.toEqual(expected);
        }
      });
    });
  });

  describe('#load()', () => {
    it('should load a single value', async () => {
      await state.store('someKey', 'someValue');

      await expect(state.load('someKey')).resolves.toEqual('someValue');
    });

    it('should handle non-existing key', async () => {
      await expect(state.load('some-non-existingKey')).resolves.toEqual(null);
    });

    it('should handle ttl exceeded', async () => {
      await state.store('someKey', 'someValue', 1);

      await new Promise((r) => setTimeout(r, 2000));

      await expect(state.load('someKey')).resolves.toEqual(null);
    });

    it('should not remove values from redis after ttl on some key exceeded', async () => {
      await state.store('someKey', 'someValue');
      await state.store('someKey1', 'someValue1', 1);

      await new Promise((r) => setTimeout(r, 2000));

      await expect(redis.hget(hashName, 'someKey')).resolves.toEqual('someValue');
      await expect(redis.hget(hashName, 'someKey1')).resolves.toEqual('someValue1');
    });

    it('should remove values from redis after ttl on all keys exceeded', async () => {
      await state.store('someKey', 'someValue', 1);
      await state.store('someKey1', 'someValue1', 1);

      await new Promise((r) => setTimeout(r, 2000));

      await expect(redis.hget(hashName, 'someKey')).resolves.toEqual(null);
      await expect(redis.hget(hashName, 'someKey1')).resolves.toEqual(null);
    });
  });

  describe('#loadMany()', () => {
    it('should load multiple values', async () => {
      const data = {
        someKey: 'someValue',
        someKey2: 'someValue2',
        someKey3: 'someValue2',
      };

      await state.store(data);

      await expect(state.loadMany(...Object.keys(data))).resolves.toEqual(Object.values(data));
    });

    it('should handle load multiple values with some none-existing ones', async () => {
      const data = {
        someKey: 'someValue',
        someKey2: 'someValue2',
        someKey3: 'someValue2',
      };

      await state.store(data);

      await expect(state.loadMany('foo', 'someKey2', 'bar')).resolves.toEqual([null, 'someValue2', null]);
    });

    it('should respect ttl', async () => {
      const data = {
        someKey: 'someValue',
        someKey2: 'someValue2',
        someKey3: 'someValue2',
      };

      await state.store(data, 1);
      await state.store('foo', 'fooValue');

      await new Promise((r) => setTimeout(r, 2000));

      await expect(state.loadMany('foo', 'someKey2', 'bar')).resolves.toEqual(['fooValue', null, null]);
    });
  });

  describe('#vacuum()', () => {
    it('should remove X first expired values from redis', async () => {
      await state.store('someKey', 'someValue');

      const data = {
        someKey1: 'someValue1',
        someKey2: 'someValue2',
        someKey3: 'someValue3',
        someKey4: 'someValue4',
      };

      await state.store(data, 1);

      await new Promise((r) => setTimeout(r, 2000));

      await state.vacuum(3);

      await expect(redis.hgetall(hashName)).resolves.toEqual({
        // not expired - default TTL
        someKey: 'someValue',
        // not vacuumed - 4th element
        someKey4: 'someValue4',
      });
    });
  });

  describe('#deleteAll()', () => {
    it('should remove all values from redis', async () => {
      const data = {
        someKey1: 'someValue1',
        someKey2: 'someValue2',
      };

      await state.store(data);

      await state.deleteAll();

      const count = await state.loadMany('someKey1', 'someKey2');

      expect(count).toEqual([null, null]);
    });
  });
});
