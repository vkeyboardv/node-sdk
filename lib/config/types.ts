import { RedisOptions } from 'ioredis';
import { ApiClientOptions } from '../api/interfaces';
import { AppConfig } from '../interfaces';
import { LoggingConfiguration } from '../logger/interfaces';
import { TaskLambdaEvent } from '../types';
import { Configuration } from 'rollbar';

export type SdkConfig = Record<string, unknown> & {
  secrets: {
    expiry: number;
  };
  log: Omit<LoggingConfiguration, 'rollbar'>;
  api: Omit<ApiClientOptions, 'logger'>;
  cache: {
    url: string;
    options?: RedisOptions;
  };
  app: AppConfig;
  rollbar: Configuration;
  event?: TaskLambdaEvent;
};
