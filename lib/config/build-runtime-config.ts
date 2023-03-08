/* eslint-disable no-invalid-this */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

import type Bottleneck from 'bottleneck';
import type { ExtendOptions } from 'got/dist/source';
import type { RedisOptions } from 'ioredis';
import type { StatsOptions } from '../api/interfaces';
import type { SdkConfig } from './types';

const { version, name } = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8'));

let appName = '';
let appKey = '';

const manifestLocation = resolve(process.cwd(), 'manifest.json');

if (existsSync(manifestLocation)) {
  const { application } = JSON.parse(readFileSync(manifestLocation, 'utf-8'));

  appName = application.name || appName;
  appKey = application.key || appKey;
}

const ROLLBAR_LEVEL_MAPPING = {
  fatal: 'critical',
  error: 'error',
  warn: 'warning',
  info: 'info',
  debug: 'debug',
};

const json = (i: string) => JSON.parse(i);
const boolean = (i: string) => i === 'true' || i === '1';
const number = (i: string) => Number(i);

interface ParseEnv {
  <T>(key: string, defaultValue: T, formatter?: (i: string) => T): T;
  (key: string, defaultValue: string): string;
  (key: string): string;
}

const env: ParseEnv = <T>(key: string, defaultValue?: T, formatter?: (i: string) => T): T => {
  const value = process.env[key];

  if (value === undefined) {
    if (defaultValue === undefined) {
      if (!formatter) {
        // fallback for string
        return '' as T;
      }

      // TODO: uncomment this when we have a way to handle errors
      // throw new Error(`Environment variable ${key} is not set`);
    }

    return defaultValue;
  }

  if (formatter) {
    return formatter(value);
  }

  return value as T;
};

export const buildRuntimeConfig = (): SdkConfig => {
  const app = {
    key: env('APP_KEY', appKey),
    name: env('APP_NAME', appName),
    provider: env('PROVIDER'),
    env: env('NODE_ENV'),
  };
  const log = {
    enabled: env('LOG_ENABLED', true, boolean),
    name: env('LOG_NAME', ''),
    level: env('LOG_LEVEL', 'info'),
    messageKey: 'msg',
    thresholds: {
      messageSize: env('LOG_THRESHOLD_MESSAGE_SIZE', 1000, number),
      messageCount: env('LOG_THRESHOLD_MESSAGE_COUNT', 15, number),
      messageErrorCount: env('LOG_THRESHOLD_ERROR_MESSAGE_COUNT', 15, number),
    },
  };
  const accessToken = env('ROLLBAR_TOKEN', '');

  return {
    secrets: {
      expiry: 5 * 60,
    },
    api: {
      api: {
        apiKey: env('API_KEY'),
        appKey: env('APP_KEY', appKey),
        prefixUrl: env('API_ROOT_URL'),
        prefixDataUrl: env('DATA_API_ROOT_URL'),
      },
      limits: env<Bottleneck.ConstructorOptions>('API_LIMITS', {}, json),
      requestOptions: env<ExtendOptions>('API_REQUEST_OPTIONS', {}, json),
      stats: env<StatsOptions>('API_STATS', {}, json),
    },
    cache: {
      url: env('CACHE_URL', 'redis://127.0.0.1:6379/11'),
      options: env<RedisOptions>(
        'CACHE_OPTIONS',
        {
          connectTimeout: 30000,
          reconnectOnError: () => 1,
          lazyConnect: true,
        },
        json,
      ),
    },
    log,
    app,
    rollbar: {
      enabled: env('ROLLBAR_ENABLED', !!accessToken, boolean),
      // FIXME: this is fallback for tag
      codeVersion: env('GIT_SHA1', `../../${name}/tree/v${version}`),
      accessToken,
      captureUncaught: env('ROLLBAR_CAPTURE_UNCAUGHT', true, boolean),
      exitOnUncaughtException: true,
      captureUnhandledRejections: env('ROLLBAR_CAPTURE_UNHANDLED_REJECTIONS', true, boolean),
      logLevel: ROLLBAR_LEVEL_MAPPING[log.level],
      environment: env('ENVIRONMENT', 'development'),
      payload: {
        context: app.key || name,
      },
      nodeSourceMaps: true,
    },
    event: {
      task_id: env('task_id'),
      version: env('version', 2, number),
      has_secrets: env('has_secrets', false, boolean),
      client_context: {
        env: {
          API_KEY: env('client_context.env.API_KEY'),
        },
      },
    },
  };
};
