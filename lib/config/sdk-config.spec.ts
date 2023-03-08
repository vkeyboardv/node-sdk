import { ValidateFunction } from 'ajv';
import { SdkConfigFactory } from './sdk-config';
import type { SdkConfig } from './types';

function deepFreeze<T extends { [key: string]: any }>(object: T): T {
  const propNames = Object.getOwnPropertyNames(object);

  for (const name of propNames) {
    const value = object[name];

    if (value && typeof value === 'object') {
      deepFreeze(value);
    }
  }

  return Object.freeze(object);
}

describe('SdkConfig', () => {
  describe('#load()', () => {
    it('should not modify initial config', () => {
      const originalConfig: SdkConfig = deepFreeze<SdkConfig>({
        app: {
          key: 'some-provider.some-app-name',
          name: '',
          provider: '',
          env: '',
        },
        api: {
          api: {
            prefixUrl: 'prefixUrl',
            prefixDataUrl: 'prefixDataUrl',
            appKey: 'some.app-key',
          },
        },
        cache: {
          url: '',
        },
        log: {
          level: 'warn',
          thresholds: {
            messageCount: 100500,
            messageErrorCount: 100500,
            messageSize: 100500,
          },
        },
        rollbar: { enabled: false },
        secrets: { expiry: 300 },
      });

      const newConfig = SdkConfigFactory.lambda((() => true) as unknown as ValidateFunction<SdkConfig>, originalConfig);

      expect(originalConfig).toEqual({
        app: {
          key: 'some-provider.some-app-name',
          name: '',
          provider: '',
          env: '',
        },
        api: {
          api: {
            prefixUrl: 'prefixUrl',
            prefixDataUrl: 'prefixDataUrl',
            appKey: 'some.app-key',
          },
        },
        cache: {
          url: '',
        },
        log: {
          level: 'warn',
          thresholds: {
            messageCount: 100500,
            messageErrorCount: 100500,
            messageSize: 100500,
          },
        },
        rollbar: { enabled: false },
        secrets: {
          expiry: 300,
        },
      });

      expect(newConfig).toEqual({
        app: {
          key: 'some-provider.some-app-name',
          name: 'some app name',
          provider: 'some-provider',
          env: '',
        },
        api: {
          api: {
            prefixUrl: 'prefixUrl',
            prefixDataUrl: 'prefixDataUrl',
            appKey: 'some.app-key',
          },
        },
        cache: {
          url: '',
        },
        log: {
          level: 'warn',
          thresholds: {
            messageCount: 100500,
            messageErrorCount: 100500,
            messageSize: 100500,
          },
        },
        rollbar: { enabled: false },
        secrets: {
          expiry: 300,
        },
      });
    });
  });
});
