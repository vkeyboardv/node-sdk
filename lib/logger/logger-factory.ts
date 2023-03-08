import { CorvaLogger } from './corva-logger';

import ecsFormat from '@elastic/ecs-pino-format';
import { Context } from 'aws-lambda';
import mergeOptions from 'merge-options';
import pino, { DestinationStream, LogFn, LoggerOptions } from 'pino';
import Rollbar, { LogArgument } from 'rollbar';
import { LoggerFormat } from '../enums';
import { rollbar } from '../rollbar';
import { LoggingConfiguration } from './interfaces';

type ErrorContainer = { err?: Error };

const isErrorContainer = (arg: unknown): arg is ErrorContainer => !!(arg as ErrorContainer).err;

const env = process.env.NODE_ENV || '';

const shouldUsePinoPretty = ['development', 'local'].includes(env.toLowerCase());

const DEFAULT_OPTIONS = {
  level: process.env.LOG_LEVEL || 'warn',
  base: {},
  rollbar: {
    levels: ['error', 'fatal'],
  },
  enabled: !['off', 'OFF'].includes(process.env.LOG_LEVEL),
};

const resolveEnvSpecificOptions = (logFormat: LoggerFormat, options: LoggingConfiguration): LoggerOptions => {
  if (shouldUsePinoPretty) {
    // prettify for local development
    return {
      transport: {
        target: 'pino-pretty',
      },
    };
  }

  if (logFormat === LoggerFormat.Text) {
    // custom formatter for cloudwatch
    return {
      transport: {
        target: './cloudwatch-formatter',
        options,
      },
    };
  }

  // pino logs as json by default
  return ecsFormat();
};

export class LoggerFactory {
  static create(
    options: LoggingConfiguration,
    context: Context,
    logFormat: LoggerFormat,
    destStream?: DestinationStream,
  ): CorvaLogger {
    const opts = mergeOptions(
      DEFAULT_OPTIONS,
      options,
      resolveEnvSpecificOptions(logFormat, options),
    ) as LoggingConfiguration;

    if (destStream) {
      delete opts.transport;
    }

    const logger = destStream ? pino(opts, destStream) : pino(opts);
    const corvaLogger = new CorvaLogger(logger, opts.thresholds, context.awsRequestId);

    if (!rollbar) {
      return corvaLogger;
    }

    const fatalLogger = (err: Rollbar.LogArgument, ...args: unknown[]) => {
      logger.fatal.apply(logger, [err, ...args]);

      return rollbar.critical(err, args);
    };

    opts.rollbar.levels.forEach((method: keyof Rollbar | string) => {
      const originMethod = logger[method] as LogFn;
      const rollbarMethod = rollbar[method as 'log'] && (rollbar[method as 'log'].bind(rollbar) as Rollbar['log']);

      const normalLogger = (meta: LogArgument | ErrorContainer, ...args: unknown[]) => {
        originMethod.apply(logger, [meta, ...args]);

        if (typeof rollbarMethod === 'function') {
          const rollbarArgs: LogArgument[] = [];

          if (isErrorContainer(meta)) {
            rollbarArgs.push(meta.err.message, meta.err);
          } else {
            rollbarArgs.push(...(args as LogArgument[]));
          }

          rollbarArgs.push(meta);

          rollbarMethod(...rollbarArgs);
        }
      };

      logger[method] = method === 'fatal' ? fatalLogger : normalLogger;
    });

    return corvaLogger;
  }
}
