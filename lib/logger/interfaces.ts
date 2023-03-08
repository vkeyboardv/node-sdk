import { LoggerOptions } from 'pino';
import Rollbar from 'rollbar';

export interface LoggingConfiguration extends LoggerOptions {
  thresholds: {
    messageSize: number;
    messageCount: number;
    messageErrorCount: number;
  };
  rollbar?: {
    instance?: Rollbar;
    levels?: Array<LoggingConfiguration['level']>;
  };
}
