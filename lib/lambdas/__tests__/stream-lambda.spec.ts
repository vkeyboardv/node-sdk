import { Context } from 'aws-lambda';
import type { Redis } from 'ioredis';
import { StatefulContext } from '../../context/stateful-context';
import { FilteringMode } from '../../enums';
import { CorvaLogger } from '../../logger/corva-logger';
import type { SdkConfig } from '../../config/types';
import type { CollectionRecord, RawStreamLambdaEvent } from '../interfaces';
import { StreamLambda } from '../stream-lambda';
import completedEvent = require('./__fixtures__/event.completed.json');
import depthEvent = require('./__fixtures__/event.depth.json');
import timeEvent = require('./__fixtures__/event.time.json');

const logger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn(),
  trace: jest.fn(),
  once: jest.fn(),
} as unknown as CorvaLogger;

const configuration = {
  swallowErrors: false,
};

const CacheClient = jest.fn().mockImplementation(() => {
  const cache = new Map();

  return {
    get: jest.fn().mockImplementation((key) => {
      const val = cache.get(key);

      return Promise.resolve(val);
    }),
    set: jest.fn().mockImplementation((key, value) => {
      cache.set(key, value);

      return Promise.resolve();
    }),
    del: jest.fn().mockImplementation((key) => {
      cache.delete(key);

      return Promise.resolve();
    }),
    hset: jest.fn().mockImplementation((key, field, value) => {
      const val = cache.get(key) || {};

      val[field] = value;
      cache.set(key, val);

      return Promise.resolve();
    }),
    hget: jest.fn().mockImplementation((key, filed) => {
      const val = cache.get(key) || {};

      return Promise.resolve(val[filed]);
    }),
    hmget: jest.fn().mockImplementation((key, ...fields) => {
      const val = cache.get(key) || {};
      const res = fields.map((fieled) => {
        return val[fieled];
      });

      return Promise.resolve(res);
    }),
    quit: jest.fn().mockImplementation(() => {
      return Promise.resolve();
    }),
  };
});

const fakeConfig = {
  app: {
    key: 'stream.test-app',
    provider: 'corva',
  },
} as unknown as SdkConfig;

const createContext = () => Promise.resolve({} as unknown as StatefulContext);

afterAll(() => {
  jest.resetAllMocks();
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Stream lambda', () => {
  describe('depth based', () => {
    test('skips processed records', async () => {
      const result = [];
      const process = jest.fn().mockImplementation((event) => {
        result.push(event);

        return event;
      });
      const cacheClient = new CacheClient() as unknown as Redis;

      await cacheClient.hset('corva/well/1/stream/123/stream.test-app/123', 'state.lastProcessedDepth', 900);

      const sl = new StreamLambda(
        {
          configuration: { ...configuration, filteringMode: FilteringMode.Depth },
          process,
          logger,
          createContext,
        },
        cacheClient,
        fakeConfig.app,
      );
      const event = depthEvent;

      await expect(
        sl.run(event as unknown as RawStreamLambdaEvent<CollectionRecord>[], {} as unknown as Context),
      ).resolves.toMatchSnapshot();
      expect(logger.error).not.toHaveBeenCalled();
      expect(result).toMatchObject(
        expect.arrayContaining([
          expect.objectContaining({
            records: expect.arrayContaining([
              expect.not.objectContaining({
                measured_depth: 800,
              }),
            ]),
          }),
        ]),
      );
      expect(result).toMatchSnapshot();
      await expect(
        cacheClient.hget('corva/well/1/stream/123/stream.test-app/123', 'state.lastProcessedDepth'),
      ).resolves.toBe(1300);
      await expect(
        cacheClient.hget('corva/well/2/stream/123/stream.test-app/123', 'state.lastProcessedDepth'),
      ).resolves.toBe(1600);
    });

    test('updates last processed only if new max value > previous', async () => {
      const result = [];
      const process = jest.fn().mockImplementation((event): Array<Record<string, unknown>> => {
        result.push(event);

        return event;
      });
      const cacheClient = new CacheClient() as unknown as Redis;

      await cacheClient.hset('corva/well/1/stream/123/stream.test-app/123', 'state.lastProcessedDepth', 1400);

      const sl = new StreamLambda(
        {
          configuration: { ...configuration, filteringMode: FilteringMode.Depth },
          process,
          logger,
          createContext,
        },
        cacheClient,
        fakeConfig.app,
      );
      const event = depthEvent;

      await expect(
        sl.run(event as unknown as RawStreamLambdaEvent<CollectionRecord>[], {} as unknown as Context),
      ).resolves.toMatchSnapshot();

      await expect(
        cacheClient.hget('corva/well/1/stream/123/stream.test-app/123', 'state.lastProcessedDepth'),
      ).resolves.toBe(1400); // update skipped

      await expect(
        cacheClient.hget('corva/well/2/stream/123/stream.test-app/123', 'state.lastProcessedDepth'),
      ).resolves.toBe(1600);
    });

    test("desn't skip processed records by default", async () => {
      const result = [];
      const process = jest.fn().mockImplementation((event) => {
        result.push(event);

        return event;
      });
      const cacheClient = new CacheClient() as unknown as Redis;

      await cacheClient.hset('corva/well/1/stream/123/stream.test-app/123', 'state.lastProcessedDepth', 900);

      const sl = new StreamLambda(
        {
          configuration,
          process,
          logger,
          createContext,
        },
        cacheClient,
        fakeConfig.app,
      );
      const event = depthEvent;

      await expect(
        sl.run(event as unknown as RawStreamLambdaEvent<CollectionRecord>[], {} as unknown as Context),
      ).resolves.toMatchSnapshot();
      expect(logger.error).not.toHaveBeenCalled();
      expect(result).toMatchObject(
        expect.arrayContaining([
          expect.objectContaining({
            records: expect.arrayContaining([
              expect.objectContaining({
                measured_depth: 800,
              }),
            ]),
          }),
        ]),
      );
      expect(result).toMatchSnapshot();
      await expect(
        cacheClient.hget('corva/well/1/stream/123/stream.test-app/123', 'state.lastProcessedDepth'),
      ).resolves.toBe(1300);
      await expect(
        cacheClient.hget('corva/well/2/stream/123/stream.test-app/123', 'state.lastProcessedDepth'),
      ).resolves.toBe(1600);
    });

    test("desn't skip processed records when disabled in settings", async () => {
      const result = [];
      const process = jest.fn().mockImplementation((event) => {
        result.push(event);

        return event;
      });
      const cacheClient = new CacheClient() as unknown as Redis;

      await cacheClient.hset('corva/well/1/stream/123/stream.test-app/123', 'state.lastProcessedDepth', 900);

      const sl = new StreamLambda(
        {
          configuration,
          process,
          logger,
          createContext,
        },
        cacheClient,
        fakeConfig.app,
      );
      const event = depthEvent;

      await expect(
        sl.run(event as unknown as RawStreamLambdaEvent<CollectionRecord>[], {} as unknown as Context),
      ).resolves.toMatchSnapshot();
      expect(logger.error).not.toHaveBeenCalled();
      expect(result).toMatchObject(
        expect.arrayContaining([
          expect.objectContaining({
            records: expect.arrayContaining([
              expect.objectContaining({
                measured_depth: 800,
              }),
            ]),
          }),
        ]),
      );
      expect(result).toMatchSnapshot();
      await expect(
        cacheClient.hget('corva/well/1/stream/123/stream.test-app/123', 'state.lastProcessedDepth'),
      ).resolves.toBe(1300);
      await expect(
        cacheClient.hget('corva/well/2/stream/123/stream.test-app/123', 'state.lastProcessedDepth'),
      ).resolves.toBe(1600);
    });
  });
  describe('time based', () => {
    test('map records', async () => {
      const result = [];
      const process = jest.fn().mockImplementation((event) => {
        result.push(event);

        return event;
      });
      const cacheClient = new CacheClient() as unknown as Redis;
      const sl = new StreamLambda(
        {
          configuration: {
            ...configuration,
            filteringMode: FilteringMode.Timestamp,
          },
          process,
          logger,
          createContext,
        },
        cacheClient,
        fakeConfig.app,
      );
      const event = timeEvent;

      await expect(
        sl.run(event as unknown as RawStreamLambdaEvent<CollectionRecord>[], {} as unknown as Context),
      ).resolves.toMatchSnapshot();
      expect(logger.error).not.toHaveBeenCalled();
      expect(result).toMatchSnapshot();
      await expect(
        cacheClient.hget('corva/well/1/stream/123/stream.test-app/123', 'state.lastProcessedTimestamp'),
      ).resolves.toBe(1546301300);
      await expect(
        cacheClient.hget('corva/well/2/stream/123/stream.test-app/123', 'state.lastProcessedTimestamp'),
      ).resolves.toBe(1546301600);
    });

    test('skips processed records', async () => {
      const result = [];
      const process = jest.fn().mockImplementation((event) => {
        result.push(event);

        return event;
      });
      const cacheClient = new CacheClient() as unknown as Redis;

      await cacheClient.hset('corva/well/1/stream/123/stream.test-app/123', 'state.lastProcessedTimestamp', 1546300800);

      const sl = new StreamLambda(
        {
          configuration: {
            ...configuration,
            filteringMode: FilteringMode.Timestamp,
          },
          process,
          logger,
          createContext,
        },
        cacheClient,
        fakeConfig.app,
      );
      const event = timeEvent;

      await expect(
        sl.run(event as unknown as RawStreamLambdaEvent<CollectionRecord>[], {} as unknown as Context),
      ).resolves.toMatchSnapshot();
      expect(logger.error).not.toHaveBeenCalled();
      expect(result).toMatchObject(
        expect.arrayContaining([
          expect.objectContaining({
            records: expect.arrayContaining([
              expect.not.objectContaining({
                timestamp: 1546300800,
              }),
            ]),
          }),
        ]),
      );
      expect(result).toMatchSnapshot();
    });

    test('updates last processed only if new max value > previous', async () => {
      const result = [];
      const process = jest.fn().mockImplementation((event): Array<Record<string, unknown>> => {
        result.push(event);

        return event;
      });
      const cacheClient = new CacheClient() as unknown as Redis;

      await cacheClient.hset('corva/well/1/stream/123/stream.test-app/123', 'state.lastProcessedTimestamp', 1546301400);

      const sl = new StreamLambda(
        {
          configuration: {
            ...configuration,
            filteringMode: FilteringMode.Timestamp,
          },
          process,
          logger,
          createContext,
        },
        cacheClient,
        fakeConfig.app,
      );
      const event = timeEvent;

      await expect(
        sl.run(event as unknown as RawStreamLambdaEvent<CollectionRecord>[], {} as unknown as Context),
      ).resolves.toMatchSnapshot();

      await expect(
        cacheClient.hget('corva/well/1/stream/123/stream.test-app/123', 'state.lastProcessedTimestamp'),
      ).resolves.toBe(1546301400); // update skipped

      await expect(
        cacheClient.hget('corva/well/2/stream/123/stream.test-app/123', 'state.lastProcessedTimestamp'),
      ).resolves.toBe(1546301600);
    });

    test("doesn't skip processed records if disabled in stettings", async () => {
      const result = [];
      const process = jest.fn().mockImplementation((event) => {
        result.push(event);

        return event;
      });
      const cacheClient = new CacheClient() as unknown as Redis;

      await cacheClient.hset('corva/well/1/stream/123/stream.test-app/123', 'state.lastProcessedTimestamp', 1546300800);

      const sl = new StreamLambda(
        {
          configuration,
          process,
          logger,
          createContext,
        },
        cacheClient,
        fakeConfig.app,
      );
      const event = timeEvent;

      await expect(
        sl.run(event as unknown as RawStreamLambdaEvent<CollectionRecord>[], {} as unknown as Context),
      ).resolves.toMatchSnapshot();
      expect(logger.error).not.toHaveBeenCalled();
      expect(result).toMatchObject(
        expect.arrayContaining([
          expect.objectContaining({
            records: expect.arrayContaining([
              expect.objectContaining({
                timestamp: 1546300800,
              }),
            ]),
          }),
        ]),
      );
      expect(result).toMatchSnapshot();
    });

    test('no last time in state', async () => {
      const result = [];
      const process = jest.fn().mockImplementation((event) => {
        result.push(event);

        return event;
      });
      const cacheClient = new CacheClient() as unknown as Redis;

      await cacheClient.hset('corva/well/1/stream/123/stream.test-app/123', 'state.foo', 'bar');

      const sl = new StreamLambda(
        {
          configuration: {
            ...configuration,
            filteringMode: FilteringMode.Timestamp,
          },
          process,
          logger,
          createContext,
        },
        cacheClient,
        fakeConfig.app,
      );
      const event = timeEvent;

      sl.run(event as unknown as RawStreamLambdaEvent<CollectionRecord>[], {} as unknown as Context).catch(console.log);

      await expect(
        sl.run(event as unknown as RawStreamLambdaEvent<CollectionRecord>[], {} as unknown as Context),
      ).resolves.toMatchSnapshot();
      expect(logger.error).not.toHaveBeenCalled();
      expect(result).toMatchObject(
        expect.arrayContaining([
          expect.objectContaining({
            records: expect.arrayContaining([
              expect.objectContaining({
                timestamp: 1546300800,
              }),
            ]),
          }),
        ]),
      );

      expect(result).toMatchSnapshot();
    });

    test('all records already processed', async () => {
      const result = [];
      const process = jest.fn().mockImplementation((event) => {
        result.push(event);

        return event;
      });
      const cacheClient = new CacheClient() as unknown as Redis;

      await cacheClient.hset('corva/well/1/stream/123/stream.test-app/123', 'state.lastProcessedTimestamp', 1546301300);

      const sl = new StreamLambda(
        {
          configuration: {
            ...configuration,
            filteringMode: FilteringMode.Timestamp,
          },
          process,
          logger,
          createContext,
        },
        cacheClient,
        fakeConfig.app,
      );
      const event = timeEvent;

      await expect(
        sl.run(event as unknown as RawStreamLambdaEvent<CollectionRecord>[], {} as unknown as Context),
      ).resolves.toMatchSnapshot();
      expect(logger.error).not.toHaveBeenCalled();
      expect(result).toMatchObject(
        expect.arrayContaining([
          expect.objectContaining({
            records: expect.arrayContaining([
              expect.not.objectContaining({
                asset_id: 1,
              }),
            ]),
          }),
        ]),
      );

      expect(result).toMatchSnapshot();
    });

    test('process completed wits', async () => {
      const result = [];
      const process = jest.fn().mockImplementation((event) => {
        result.push(event);

        return event;
      });
      const cacheClient = new CacheClient() as unknown as Redis;
      const sl = new StreamLambda(
        {
          process,
          configuration: {
            ...configuration,
            filteringMode: FilteringMode.Timestamp,
          },
          logger,
          createContext,
        },
        cacheClient,
        fakeConfig.app,
      );
      const event = completedEvent;

      await expect(
        sl.run(event as unknown as RawStreamLambdaEvent<CollectionRecord>[], {} as unknown as Context),
      ).resolves.toMatchSnapshot();
      expect(logger.error).not.toHaveBeenCalled();
      expect(result.length).toBe(event.length);
      expect(result[0].records.length).toBe(event[0].records.length);
      expect(result).toMatchSnapshot();
    });
  });

  test('error thrown', async () => {
    const err = new Error('Stream error');
    const process = jest.fn().mockImplementation(() => {
      throw err;
    });
    const cacheClient = new CacheClient() as unknown as Redis;
    const sl = new StreamLambda(
      {
        configuration: {
          ...configuration,
          filteringMode: FilteringMode.Timestamp,
        },
        process,
        logger,
        createContext,
      },
      cacheClient,
      fakeConfig.app,
    );
    const event = timeEvent;

    await expect(
      sl.run(event as unknown as RawStreamLambdaEvent<CollectionRecord>[], {} as unknown as Context),
    ).rejects.toMatchObject(err);
  });
});
