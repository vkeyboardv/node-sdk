import { buildRuntimeConfig } from './build-runtime-config';

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(false),
  readFileSync: jest.fn().mockReturnValue('{"name": "test-app", "version": "1.0.0"}'),
}));

describe('buildRuntimeConfig()', () => {
  beforeAll(() => {
    process.env.API_KEY = 'api-key';
    process.env.LOG_ENABLED = 'false';
    process.env.LOG_THRESHOLD_MESSAGE_COUNT = '42';
    process.env.CACHE_OPTIONS = '{"lazyConnect": false, "connectTimeout": 32000}';
  });

  it('should load config from env', () => {
    expect(buildRuntimeConfig()).toMatchInlineSnapshot(`
      {
        "api": {
          "api": {
            "apiKey": "api-key",
            "appKey": "",
            "prefixDataUrl": "",
            "prefixUrl": "",
          },
          "limits": {},
          "requestOptions": {},
          "stats": {},
        },
        "app": {
          "env": "testing",
          "key": "",
          "name": "",
          "provider": "",
        },
        "cache": {
          "options": {
            "connectTimeout": 32000,
            "lazyConnect": false,
          },
          "url": "redis://127.0.0.1:6379/11",
        },
        "event": {
          "client_context": {
            "env": {
              "API_KEY": "",
            },
          },
          "has_secrets": false,
          "task_id": "",
          "version": 2,
        },
        "log": {
          "enabled": false,
          "level": "info",
          "messageKey": "msg",
          "name": "",
          "thresholds": {
            "messageCount": 42,
            "messageErrorCount": 15,
            "messageSize": 1000,
          },
        },
        "rollbar": {
          "accessToken": "",
          "captureUncaught": true,
          "captureUnhandledRejections": true,
          "codeVersion": "../../test-app/tree/v1.0.0",
          "enabled": false,
          "environment": "development",
          "exitOnUncaughtException": true,
          "logLevel": "info",
          "nodeSourceMaps": true,
          "payload": {
            "context": "test-app",
          },
        },
        "secrets": {
          "expiry": 300,
        },
      }
    `);
  });
});
