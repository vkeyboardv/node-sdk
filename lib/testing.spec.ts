/* eslint-disable @typescript-eslint/no-unused-vars */
import { LogType, SourceType } from './enums';
import { ScheduledDataTimeEvent, ScheduledDepthEvent, ScheduledNaturalTimeEvent } from './models/scheduled/scheduled';
import { StreamDepthEvent, StreamTimeEvent } from './models/stream/stream';
import { TaskEvent } from './models/task';
import { app_runner } from './testing';

describe('app_runner', () => {
  describe('when running the task app', () => {
    it('should return the data from the processor', async () => {
      const expected = { some: 'data' };
      const result = await app_runner(async (event, context) => {
        return { some: 'data' };
      }, new TaskEvent({ asset_id: 1, company_id: 1, properties: { f: 1 } }));

      expect(result).toEqual(expected);
    });

    it('should throw an error if the processor throws an error', () => {
      const expected = new Error('some error');

      expect(() =>
        app_runner((event, context) => {
          throw expected;
        }, new TaskEvent({ asset_id: 1, company_id: 1, properties: { f: 1 } })),
      ).toThrow(expected);
    });

    it('should throw an error if the processor returns a rejected promise', async () => {
      const expected = new Error('some error');

      await expect(() =>
        app_runner(async (event, context) => {
          throw expected;
        }, new TaskEvent({ asset_id: 1, company_id: 1, properties: { f: 1 } })),
      ).rejects.toThrow(expected);
    });

    describe('when checking the context', () => {
      it('should not have cache', async () => {
        const result = await app_runner(async (event, context) => {
          return (context as any).cache;
        }, new TaskEvent({ asset_id: 1, company_id: 1, properties: { f: 1 } }));

        expect(result).toBeUndefined();
      });

      it('should mock api', async () => {
        const api = await app_runner(async (event, context) => {
          return context.api;
        }, new TaskEvent({ asset_id: 1, company_id: 1, properties: { f: 1 } }));

        expect(api).toBeDefined();
        expect(api.request.name).toBe('mockConstructor');
        expect(api.aggregate.name).toBe('mockConstructor');
        expect(api.getAppSettings.name).toBe('mockConstructor');
        expect(api.getDataset.name).toBe('mockConstructor');
        expect(api.getIteratedDataset.name).toBe('mockConstructor');
        expect(api.produceMessages.name).toBe('mockConstructor');
        expect(api.provider.name).toBe('mockConstructor');
        expect(api.saveData.name).toBe('mockConstructor');
      });

      it('should mock logger', async () => {
        const logger = await app_runner(async (event, context) => {
          return context.logger;
        }, new TaskEvent({ asset_id: 1, company_id: 1, properties: { f: 1 } }));

        expect(logger).toBeDefined();
        expect(logger.debug.name).toBe('mockConstructor');
        expect(logger.error.name).toBe('mockConstructor');
        expect(logger.info.name).toBe('mockConstructor');
        expect(logger.warn.name).toBe('mockConstructor');
      });

      it('should set dummy config', async () => {
        const config = await app_runner(async (event, context) => {
          return context.config;
        }, new TaskEvent({ asset_id: 1, company_id: 1, properties: { f: 1 } }));

        expect(config).toEqual(expect.any(Object));
      });

      describe('when not passing secrets', () => {
        it('should set empty secrets', async () => {
          const secrets = await app_runner(async (event, context) => {
            return context.secrets;
          }, new TaskEvent({ asset_id: 1, company_id: 1, properties: { f: 1 } }));

          expect(secrets).toBeUndefined();
        });
      });

      describe('when passing secrets', () => {
        it('should set the secrets', async () => {
          const secrets = await app_runner(
            async (event, context) => {
              return context.secrets;
            },
            new TaskEvent({ asset_id: 1, company_id: 1, properties: { f: 1 } }),
            { foo: 'bar' },
          );

          expect(secrets).toEqual({ foo: 'bar' });
        });
      });
    });
  });

  describe('when running the scheduled app', () => {
    describe('when running the scheduled data-time app', () => {
      it('should return the data from the processor', async () => {
        const expected = { some: 'data' };
        const result = await app_runner(async (event, context) => {
          return { some: 'data' };
        }, new ScheduledDataTimeEvent({ asset_id: 1, company_id: 1, start_time: 1, end_time: 1 }));

        expect(result).toEqual(expected);
      });

      describe('when checking the context', () => {
        it('should set & mock the cache', async () => {
          const cache = await app_runner(async (event, context) => {
            return context.cache;
          }, new ScheduledDataTimeEvent({ asset_id: 1, company_id: 1, start_time: 1, end_time: 1 }));

          expect(cache).toBeDefined();
          expect(cache.delete.name).toBe('mockConstructor');
          expect(cache.deleteAll.name).toBe('mockConstructor');
          expect(cache.deleteMany.name).toBe('mockConstructor');
          expect(cache.load.name).toBe('mockConstructor');
          expect(cache.loadAll.name).toBe('mockConstructor');
          expect(cache.store.name).toBe('mockConstructor');
          expect(cache.vacuum.name).toBe('mockConstructor');
        });
      });
    });

    describe('when running the scheduled depth app', () => {
      it('should return the data from the processor', async () => {
        const expected = { some: 'data' };
        const result = await app_runner(async (event, context) => {
          return { some: 'data' };
        }, new ScheduledDepthEvent({ asset_id: 1, company_id: 1, top_depth: 1, bottom_depth: 1, log_identifier: '', interval: 1 }));

        expect(result).toEqual(expected);
      });
    });

    describe('when running the scheduled natural-time app', () => {
      it('should return the data from the processor', async () => {
        const expected = { some: 'data' };
        const result = await app_runner(async (event, context) => {
          return { some: 'data' };
        }, new ScheduledNaturalTimeEvent({ asset_id: 1, company_id: 1, schedule_start: 1, interval: 1 }));

        expect(result).toEqual(expected);
      });
    });
  });

  describe('when running the stream app', () => {
    describe('when running the stream depth app', () => {
      it('should return the data from the processor', async () => {
        const expected = { some: 'data' };
        const result = await app_runner(
          async (event, context) => {
            return { some: 'data' };
          },
          new StreamDepthEvent(
            {
              asset_id: 1,
              company_id: 1,
              records: [
                {
                  measured_depth: 1,
                  log_identifier: '5701c048cf9a',
                  data: {
                    foo: 'bar',
                  },
                  metadata: {
                    boo: 'far',
                  },
                },
              ],
            },
            {
              metadata: {
                source_type: SourceType.Drilling,
                app_stream_id: 1,
                apps: {
                  foo: { app_connection_id: 1 },
                },
                log_type: LogType.Depth,
              },
            },
          ),
        );

        expect(result).toEqual(expected);
      });
    });

    describe('when running the stream time app', () => {
      it('should return the data from the processor', async () => {
        const expected = { some: 'data' };
        const result = await app_runner(
          async (event, context) => {
            return { some: 'data' };
          },
          new StreamTimeEvent(
            {
              asset_id: 1,
              company_id: 1,

              records: [
                {
                  timestamp: 1,
                  data: {
                    foo: 'bar',
                  },
                  metadata: {
                    boo: 'far',
                  },
                },
              ],
            },
            {
              metadata: {
                source_type: SourceType.Drilling,
                app_stream_id: 1,
                apps: {
                  foo: { app_connection_id: 1 },
                },
                log_type: LogType.Depth,
              },
            },
          ),
        );

        expect(result).toEqual(expected);
      });
    });
  });
});
