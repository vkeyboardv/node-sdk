import { EventEmitter } from 'node:events';
import { LogFn, Logger } from 'pino';
import { ERROR_LOG_MESSAGE_ERROR_COUNT_EXCEEDED_EVENT } from '../lambdas/constants';
import type { LoggingConfiguration } from './interfaces';

/**
As apps are executed very frequently (once a second or so), unlimited logging can lead to huge amounts of data. {@link Corva | corva-sdk} provides a logger object, which is a safe way for app logging.

The Logger is a @see [pino](https://github.com/pinojs/pino) instance and should be used like every other logger.

The Logger has following features:
- Log messages are injected with contextual information, which makes it easy to filter through logs while debugging issues.
- Log messages have limited length. Too long messages are truncated to not exceed the limit. Max message size can be controlled by `LOG_THRESHOLD_MESSAGE_SIZE` env variable. Default value is 1000 symbols or bytes.
- Number of log messages is limited. After reaching the limit logging gets disabled. The number of log messages can be controlled by `LOG_THRESHOLD_MESSAGE_COUNT` env variable. Default value is 15 messages.
- Logging level can be set using `LOG_LEVEL` env variable. Default value is `info`, other options are `trace`, `debug`, `error`, `fatal`.
 */
export class CorvaLogger extends EventEmitter {
  private assetId: number;
  private appConnection: number;
  private messageCount = 0;
  private messageErrorCount = 0;

  /**
   * @internal
   */
  constructor(
    private logger: Logger,
    private thresholds: LoggingConfiguration['thresholds'],
    private requestId: string,
    assetId?: number,
    appConnection?: number,
  ) {
    super();

    this.assetId = assetId;
    this.appConnection = appConnection;
  }

  /**
   * @internal
   */
  setAssetId(assetId: number): void {
    this.assetId = assetId;
  }

  /**
   * @internal
   */
  setAppConnection(appConnection: number): void {
    this.appConnection = appConnection;
  }

  trace(message: unknown, ...args: unknown[]): void {
    return this.log('trace', message, ...args);
  }

  debug(message: unknown, ...args: unknown[]): void {
    return this.log('debug', message, ...args);
  }

  info(message: unknown, ...args: unknown[]): void {
    return this.log('info', message, ...args);
  }

  warn(message: unknown, ...args: unknown[]): void {
    return this.log('warn', message, ...args);
  }

  error(message: unknown, ...args: unknown[]): void {
    return this.log('error', message, ...args);
  }

  fatal(message: unknown, ...args: unknown[]): void {
    return this.log('fatal', message, ...args);
  }

  fork(assetId: number, appConnection?: number): CorvaLogger {
    return new CorvaLogger(this.logger, this.thresholds, this.requestId, assetId, appConnection);
  }

  private log(level: keyof Logger, message: string | Error | Record<string, any>, ...args: unknown[]): void {
    const isMessageCountExceeded = this.messageCount >= this.thresholds.messageCount;
    const isMessageErrorCountExceeded = this.messageErrorCount >= this.thresholds.messageErrorCount;

    if (isMessageCountExceeded) {
      return;
    }

    if (isMessageErrorCountExceeded) {
      this.emit(ERROR_LOG_MESSAGE_ERROR_COUNT_EXCEEDED_EVENT);

      return;
    }

    const ctx = {
      asset_id: this.assetId,
      app_connection: this.appConnection,
      request_id: this.requestId,
    };

    if (typeof message === 'string') {
      if (/%s|%d|%O|%o|%j/.test(message) || !args.length) {
        return this.callLogger(level, ctx, message, ...args);
      }

      return this.callLogger(level, Object.assign(ctx, ...args), message);
    }

    if (message instanceof Error) {
      return this.callLogger(level, { ...ctx, err: message, args });
    }

    return this.callLogger(level, {
      asset_id: this.assetId,
      app_connection: this.appConnection,
      request_id: this.requestId,
      ...message,
      ...args,
    });
  }

  private callLogger(level: keyof Logger, obj: any, ...args: unknown[]) {
    if (this.logger.levels.values[level] >= this.logger.levelVal && level !== 'error') {
      this.messageCount++;
    }

    if (level === 'error') {
      this.messageErrorCount++;
    }

    const fn: LogFn = (this.logger[level] as unknown as LogFn).bind(this.logger);

    fn(obj, ...args);

    const isMessageCountExceeded = this.messageCount === this.thresholds.messageCount;
    const isMessageErrorCountExceeded = this.messageErrorCount === this.thresholds.messageErrorCount;

    if (isMessageCountExceeded || isMessageErrorCountExceeded) {
      this.logger.warn({ ...obj, msg: 'Exceeded logging threshold per invoke' });
    }
  }
}
