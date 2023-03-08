process.env.ROLLBAR_ENABLED = 'true';
process.env.ROLLBAR_TOKEN = 'accessToken';

import { Context } from 'aws-lambda';
import * as faker from 'faker';
import { promises as fs } from 'fs';
import { HTTPError } from 'got/dist/source';
import { set } from 'lodash';
import nock from 'nock';
import { join } from 'path';
import {
  CollectionRecord,
  ScheduledDataTimeEvent,
  ScheduledDepthEvent,
  ScheduledNaturalTimeEvent,
  StreamDepthEvent,
  StreamTimeEvent,
  TaskEvent,
} from '.';
import { StatelessContext } from './context/stateless-context';
import { StatefulContext } from './context/stateful-context';
import { Corva } from './corva';
import { LogType, SchedulerType, SourceType, TaskState } from './enums';
import { ERROR_LOG_MESSAGE_ERROR_COUNT_EXCEEDED_MSG } from './lambdas/constants';
import { RawStreamLambdaEvent, ScheduledLambdaEvent, Task, TaskLambdaEvent } from './lambdas/interfaces';
import { SecretsManager } from './secrets/secrets-manager';
import type { SdkConfig } from './config/types';

jest.mock('./cache/state');
jest.mock('pino', () => () => ({
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  levels: { values: { error: 50 } },
}));

jest.mock('ioredis', () => {
  class IORedisMock {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    constructor() {}
    cache = new Map<string, number>();

    async hget(key: string): Promise<string | number | undefined> {
      return Promise.resolve(this.cache.get(key));
    }
    async hset(key: string, value: number): Promise<void> {
      this.cache.set(key, value);

      return Promise.resolve();
    }
    defineCommand() {
      //
    }
  }

  return IORedisMock;
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Corva (e2e)', () => {
  afterAll(() => {
    delete process.env.ROLLBAR_ENABLED;
    delete process.env.ROLLBAR_TOKEN;
  });

  const context: Context = {
    getRemainingTimeInMillis: () => 2000,
    callbackWaitsForEmptyEventLoop: true,
    functionName: 'test',
    functionVersion: '1',
    invokedFunctionArn: 'arn::',
    memoryLimitInMB: '128',
    awsRequestId: '3457a315-4a4b-56b8-9153-faaf150d9a20',
    logGroupName: 'log_group',
    logStreamName: 'log_stream',
    done: () => ({}),
    fail: () => ({}),
    succeed: () => ({}),
  };

  beforeEach(() => {
    SecretsManager.settledTime = undefined;
    SecretsManager.secrets = undefined;
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  describe('timeouts', () => {
    it('should not send api key to rollbar', async () => {
      const apiKey = 'fd0bd22b294c130aae39cb775ed290ea7ffb13b3b6ab16cc';
      const expected = 'fd0***6cc';
      const event = {
        Records: [
          {
            body: `{"type":"data_app","stream":"corva.dataset-export-scheduler","category":"scheduling_app","interval":900,"batch_size":10,"queue_name":"corva-dataset-export","invoke_type":"sqs_lambda","queue_suffix":".fifo","message_broker":"kafka","scheduler_type":1,"whitelisted_app_connection_settings":{"edit":[],"read":[]},"collection":"wits","cron_string":"*/10 * * * *","settings_schema":{"interval":{"type":"integer","default":900,"required":true},"collection":{"type":"string","required":true}},"environment":"qa","app":9207,"app_key":"corva.dataset-export-scheduler","app_connection":545336,"app_stream":21916,"source_type":"drilling","log_type":"time","company":71,"provider":"corva","api_url":"https://api.qa.corva.ai","api_key":"${apiKey}","schedule":359420694,"schedule_start":1631407732942,"schedule_end":1631408632942,"asset_id":46662122,"asset_name":"Rishi_test_State McGary 16-9 UB 2BS (S1-C) (2021-09-06 12:18:52 UTC)","asset_type":"Well","timezone":"America/Chicago","day_shift_start":"06:00","client_context":{"env":{"API_KEY":"${apiKey}"}}}`,
            receiptHandle:
              'AQEBFlYSL7lXLVWwooeGfKpM4gprVesrJJIfjP8WUw4sJlEsoF4NeWomxWhk2wER44/hc4aV87EJ5CsPgPfWwFLL9P4RZIGBZaTLL1XIZy55P/guHWfGppg4JET+RZfvwgVNvPFVgmZ0W6LVbJEeYzHLnPm+EuV0Osy9vbME+jTx0DMnE/eBuDYDz9ZFknG7/3i2Be/ICngBchMCbCBMpydCzY6LrR8s+/sA971rZSCEv8G+Hw991evHj3hVEhpcny5iNXJX150Axk6iogNGNrS66IHQkgvClSPlXC6WULec5QY=',
            md5OfBody: 'f088fb959bf7243fe06fcbce28e27a1f',
            eventSourceARN: 'arn:aws:sqs:us-east-1:357495513245:corva-dataset-export-qa.fifo',
            eventSource: 'aws:sqs',
            awsRegion: 'us-east-1',
            messageId: '59eff5c5-8cda-48f6-8d2d-4a04db8087f5',
            attributes: {
              ApproximateFirstReceiveTimestamp: '1631607185020',
              SequenceNumber: '18864384453396465152',
              SenderId: 'AIDAILYR223FGJJDUT2AY',
              MessageDeduplicationId: '8869e60d366b7eed8b221382d3cd80dca7c64900159a9be9537e7012df3228be',
              SentTimestamp: '1631407733152',
              ApproximateReceiveCount: '4',
              MessageGroupId: 'asset-46662122',
            },
            messageAttributes: {},
          },
        ],
      };

      const scope = nock('https://api.rollbar.com/')
        .post('/api/1/item/', (body: { data: { custom: { originalEvent: { Records: { body: string }[] } } } }) => {
          try {
            const data: string = body.data.custom.originalEvent.Records[0].body;

            return !data.includes(apiKey) && data.includes(expected);
          } catch (e) {
            return false;
          }
        })
        .reply(200, {});

      await new Corva()
        .scheduled(async () => sleep(1001))(event, context)
        .catch(() => {
          return;
        });

      while (!scope.isDone()) {
        await sleep(100);
      }

      expect(scope.isDone()).toBeTruthy();
    });
  });

  describe('events handling', () => {
    const assetId = faker.datatype.number();
    const config: SdkConfig = {
      app: {
        name: 'some name',
        key: 'some.app-key',
        provider: 'test',
        env: 'test',
      },
      log: {
        enabled: false,
        level: 'error',
        thresholds: {
          messageSize: 0,
          messageCount: 0,
          messageErrorCount: 0,
        },
      },
      secrets: {
        expiry: 300,
      },
      rollbar: {
        enabled: false,
      },
      api: {
        api: {
          prefixUrl: 'http://localhost-api',
          prefixDataUrl: 'http://localhost-data',
          appKey: 'some.app-key',
          apiKey: 'apiKey',
        },
        requestOptions: {
          retry: 0,
        },
      },
      cache: {
        url: 'redis://localhost:1234',
      },
    };

    describe('stream event handler', () => {
      const event: RawStreamLambdaEvent<CollectionRecord<unknown>> = {
        metadata: {
          apps: {
            [config.app.key]: {
              has_secrets: true,
              app_connection_id: faker.datatype.number(),
            },
          },
          source_type: 'source-type',
          log_type: LogType.Time,
          app_stream_id: faker.datatype.number(),
        },
        records: [{ asset_id: assetId } as unknown as CollectionRecord<unknown>],
        asset_id: faker.datatype.number(),
        company_id: faker.datatype.number(),
      };

      it('should fetch secrets', async () => {
        const secrets = { SOME_KEY: 'some-value' };

        const scope = nock('http://localhost-api')
          .get(`/v2/apps/secrets/values?app_key=${config.app.key}`)
          .reply(200, secrets);

        const handler = new Corva(config).stream((event, context) => {
          expect(event).toBeInstanceOf(StreamTimeEvent);
          expect(context).toBeInstanceOf(StatefulContext);

          expect(context.secrets).toEqual(secrets);

          return Promise.resolve();
        });

        await handler([event], context);

        expect(scope.isDone()).toBeTruthy();
      });

      it('should fetch secrets only once', async () => {
        const secrets = { SOME_KEY: 'some-value' };

        const scope = nock('http://localhost-api')
          .get(`/v2/apps/secrets/values?app_key=${config.app.key}`)
          .reply(200, secrets);

        const handler = new Corva(config).stream((event, context) => {
          expect(context.secrets).toEqual(secrets);

          return Promise.resolve();
        });

        await handler([event], context);
        await handler([event], context);
        await handler([event], context);

        expect(scope.isDone()).toBeTruthy();
      });

      it('should fetch secrets after timeout', async () => {
        const secrets = { SOME_KEY: 'some-value' };

        const scope = nock('http://localhost-api')
          .get(`/v2/apps/secrets/values?app_key=${config.app.key}`)
          .twice()
          .reply(200, secrets);

        const handler = new Corva(set(config, 'secrets.expiry', 0.1)).stream((event, context) => {
          expect(context.secrets).toEqual(secrets);

          return Promise.resolve();
        });

        await handler([event], context);

        await sleep(101);

        await handler([event], context);

        expect(scope.isDone()).toBeTruthy();

        jest.useRealTimers();
      });

      it('should not fetch secrets', async () => {
        const updatedEvent = set(event, `metadata.apps['${config.app.key}'].has_secrets`, false);

        const handler = new Corva(config).stream((event, context) => {
          expect(context.secrets).toBeUndefined();

          return Promise.resolve();
        });

        await handler([updatedEvent], context);
      });

      it('should reject with fetch secrets errors', async () => {
        const assetId = faker.datatype.number();
        const appConnection = faker.datatype.number();

        const scope = nock('http://localhost-api')
          .get(`/v2/apps/secrets/values?app_key=${config.app.key}`)
          .reply(404, {});

        const event: RawStreamLambdaEvent<CollectionRecord<unknown>> = {
          metadata: {
            apps: {
              [config.app.key]: {
                has_secrets: true,
                app_connection_id: appConnection,
              },
            },
            source_type: 'source-type',
            log_type: LogType.Time,
            app_stream_id: faker.datatype.number(),
          },
          records: [{ asset_id: assetId } as unknown as CollectionRecord<unknown>],
          asset_id: faker.datatype.number(),
          company_id: faker.datatype.number(),
        };

        const handler = new Corva(config).stream((event, context) => {
          expect(context.secrets).toBeUndefined();

          return Promise.resolve();
        });

        await expect(() => handler([event], context)).rejects.toThrow(HTTPError);

        expect(scope.isDone()).toBeTruthy();
      });

      it('should work for event with no data', async () => {
        const processor = jest.fn();

        const handler = new Corva({
          ...config,
          app: {
            ...config.app,
            key: 'corva.wits-depth-summary',
          },
        }).stream(processor);

        const event = JSON.parse(
          await fs.readFile(join(process.cwd(), 'events', 'stream.no-data.json'), 'utf-8'),
        ) as RawStreamLambdaEvent<CollectionRecord<null>>[];

        await handler(event, context);

        expect(processor).not.toHaveBeenCalled();
      });

      it('should reject because of exceeded messageErrorCount limit', async () => {
        const _config = {
          ...config,
          log: {
            ...config.log,
            thresholds: {
              messageSize: 100,
              messageCount: 100,
              messageErrorCount: 1,
            },
          },
        };

        const handler = new Corva(_config).stream((_event, context) => {
          context.logger.error('error');
          context.logger.error('error');

          return Promise.resolve();
        });

        await expect(() => handler([event], context)).rejects.toThrow(ERROR_LOG_MESSAGE_ERROR_COUNT_EXCEEDED_MSG);
      });
    });

    describe('scheduled event handler', () => {
      const event: ScheduledLambdaEvent<unknown> = {
        collection: 'string',
        cron_string: 'string',
        environment: 'testing',
        app: 1,
        app_key: 'some.app-key',
        app_connection: 123,
        source_type: SourceType.Drilling,
        company: 1,
        provider: 'string',
        schedule: 1,
        interval: 1,
        schedule_start: 1,
        schedule_end: 1,
        asset_id: 1,
        asset_name: 'string',
        asset_type: 'Well',
        timezone: 'string',
        log_type: LogType.Depth,
        app_stream: 1,
        scheduler_type: SchedulerType.NaturalTime,
        has_secrets: true,
        day_shift_start: '06:00',
      };

      it('should fetch secrets', async () => {
        const secrets = { SOME_KEY: 'some-value' };

        const scope = nock('http://localhost-api')
          .get(`/v2/apps/secrets/values?app_key=${config.app.key}`)
          .reply(200, secrets)
          .post('/scheduler/1/completed')
          .reply(200);

        const handler = new Corva(config).scheduled((event, context) => {
          expect(event).toBeInstanceOf(ScheduledNaturalTimeEvent);
          expect(context).toBeInstanceOf(StatefulContext);

          expect(context.secrets).toEqual(secrets);

          return Promise.resolve();
        });

        await handler(event, context);

        expect(scope.isDone()).toBeTruthy();
      });

      it('should not fetch secrets', async () => {
        const scope = nock('http://localhost-api').post('/scheduler/1/completed').reply(200);

        const handler = new Corva(config).scheduled((event, context) => {
          expect(context.secrets).toBeUndefined();

          return Promise.resolve();
        });

        await handler(set(event, 'has_secrets', false), context);

        expect(scope.isDone()).toBeTruthy();
      });

      it('should reject because of exceeded messageErrorCount limit', async () => {
        const scope = nock('http://localhost-api').post('/scheduler/1/completed').reply(200);

        const _config = {
          ...config,
          log: {
            ...config.log,
            thresholds: {
              messageSize: 100,
              messageCount: 100,
              messageErrorCount: 1,
            },
          },
        };

        const handler = new Corva(_config).scheduled((_event, context) => {
          context.logger.error('error');
          context.logger.error('error');

          return Promise.resolve();
        });

        await expect(() => handler([event], context)).rejects.toThrow(ERROR_LOG_MESSAGE_ERROR_COUNT_EXCEEDED_MSG);

        expect(scope.isDone()).toBeTruthy();
      });
    });

    describe('task event handler', () => {
      const event: TaskLambdaEvent = {
        task_id: 'task_id',
        version: 2,
      };
      const task: Task<unknown, unknown> = {
        id: 'task_id',
        state: TaskState.Running,
        fail_reason: null,
        document_bucket: 'string',
        properties: {},
        payload: {},
        asset_id: 42,
        company_id: 1,
        app_id: 1,
      };

      it('should fetch secrets', async () => {
        const secrets = { SOME_KEY: 'some-value' };

        const scope = nock('http://localhost-api')
          .get(`/v2/apps/secrets/values?app_key=${config.app.key}`)
          .reply(200, secrets)
          .put('/v2/tasks/task_id/success')
          .reply(200)
          .get('/v2/tasks/task_id')
          .reply(200, task);

        const handler = new Corva(config).task((event, context) => {
          expect(event).toBeInstanceOf(TaskEvent);
          expect(context).toBeInstanceOf(StatelessContext);

          expect(context.secrets).toEqual(secrets);

          return Promise.resolve();
        });

        await handler(set(event, 'has_secrets', true), context);

        expect(scope.isDone()).toBeTruthy();
      });

      it('should not fetch secrets (explicit)', async () => {
        const scope = nock('http://localhost-api')
          .put('/v2/tasks/task_id/success')
          .reply(200)
          .get('/v2/tasks/task_id')
          .reply(200, task);

        const handler = new Corva(config).task((event, context) => {
          expect(context.secrets).toBeUndefined();

          return Promise.resolve();
        });

        await handler(set(event, 'has_secrets', false), context);

        expect(scope.isDone()).toBeTruthy();
      });

      it('should not fetch secrets (no value)', async () => {
        const scope = nock('http://localhost-api').get('/v2/tasks/task_id').reply(200, task);

        const handler = new Corva(config).task((event, context) => {
          expect(context.secrets).toBeUndefined();

          return Promise.resolve();
        });

        await handler(event, context);

        expect(scope.isDone()).toBeTruthy();
      });

      it('should reject because of exceeded messageErrorCount limit', async () => {
        const scope = nock('http://localhost-api').get('/v2/tasks/task_id').reply(200, task);

        const _config = {
          ...config,
          log: {
            ...config.log,
            thresholds: {
              messageSize: 100,
              messageCount: 100,
              messageErrorCount: 1,
            },
          },
        };

        const handler = new Corva(_config).task((_event, context) => {
          context.logger.error('error');
          context.logger.error('error');

          return Promise.resolve();
        });

        await expect(() => handler([event], context)).rejects.toThrow(ERROR_LOG_MESSAGE_ERROR_COUNT_EXCEEDED_MSG);

        expect(scope.isDone()).toBeTruthy();
      });
    });
  });

  describe('types', () => {
    it('should allow to use handlers', () => {
      const streamDepth = new Corva().stream((event: StreamDepthEvent<{ a: number }, { b: string }>, context) => {
        event.records[0].data.a;
        event.records[0].metadata.b;

        context.cache;

        return Promise.resolve();
      });

      new Corva().stream((event: StreamDepthEvent<{ a: number }, { b: string }>) => {
        event.records[0].data.a;
        event.records[0].metadata.b;

        return Promise.resolve();
      });

      new Corva().stream(() => {
        return Promise.resolve();
      });

      expect(streamDepth).toBeDefined();

      const streamTime = new Corva().stream((event: StreamTimeEvent<{ a: number }, { b: string }>, context) => {
        event.records[0].data.a;
        event.records[0].metadata.b;

        context.cache;

        return Promise.resolve();
      });

      new Corva().stream((event: StreamTimeEvent<{ a: number }, { b: string }>) => {
        event.records[0].data.a;
        event.records[0].metadata.b;

        return Promise.resolve();
      });

      new Corva().stream(() => {
        return Promise.resolve();
      });

      expect(streamTime).toBeDefined();

      const scheduledDataTime = new Corva().scheduled((event: ScheduledDataTimeEvent, context) => {
        event.start_time;
        event.end_time;

        event.asset_id;
        event.company_id;
        event.rerun;

        context.cache;

        return Promise.resolve();
      });

      new Corva().scheduled((event: ScheduledDataTimeEvent) => {
        event.start_time;
        event.end_time;

        event.asset_id;
        event.company_id;
        event.rerun;

        return Promise.resolve();
      });

      new Corva().scheduled(() => {
        return Promise.resolve();
      });

      expect(scheduledDataTime).toBeDefined();

      const scheduledNaturalTime = new Corva().scheduled((event: ScheduledNaturalTimeEvent, context) => {
        event.schedule_start;

        event.asset_id;
        event.company_id;
        event.rerun;

        context.cache;

        return Promise.resolve();
      });

      new Corva().scheduled((event: ScheduledNaturalTimeEvent) => {
        event.schedule_start;

        event.asset_id;
        event.company_id;
        event.rerun;

        return Promise.resolve();
      });

      expect(scheduledNaturalTime).toBeDefined();

      const scheduledDepth = new Corva().scheduled((event: ScheduledDepthEvent, context) => {
        event.top_depth;
        event.bottom_depth;
        event.interval;
        event.log_identifier;

        event.asset_id;
        event.company_id;
        event.rerun;

        context.cache;

        return Promise.resolve();
      });

      const processor = async (event: ScheduledDataTimeEvent, context: StatefulContext) => {
        // Insert your logic here
        context.logger.info('Hello, World!');
      };

      new Corva().scheduled(processor);

      new Corva().scheduled((event: ScheduledDepthEvent) => {
        event.top_depth;
        event.bottom_depth;
        event.interval;
        event.log_identifier;

        event.asset_id;
        event.company_id;
        event.rerun;

        return Promise.resolve();
      });

      expect(scheduledDepth).toBeDefined();

      const task = new Corva().task((event: TaskEvent<{ some: string }>, context) => {
        event.asset_id;
        event.company_id;
        event.properties.some;

        return Promise.resolve();
      });

      new Corva().task((event: TaskEvent<{ some: string }>) => {
        event.asset_id;
        event.company_id;
        event.properties.some;

        return Promise.resolve();
      });

      expect(task).toBeDefined();
    });
  });
});
