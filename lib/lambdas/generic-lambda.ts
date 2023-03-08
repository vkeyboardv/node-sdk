import type { Context } from 'aws-lambda';
import type { ClientHandler, HandlerContext } from '../interfaces';
import type { CorvaLogger } from '../logger/corva-logger';
import {
  ERROR_LOG_MESSAGE_ERROR_COUNT_EXCEEDED_EVENT,
  ERROR_LOG_MESSAGE_ERROR_COUNT_EXCEEDED_MSG,
  ERROR_PROCESS_NOT_IMPLEMENTED,
} from './constants';
import type {
  GenericLambdaOptions,
  LambdaConfig,
  LambdaRunner,
  PostProcessArgs,
  ProcessArgs,
  StreamLambdaConfig,
} from './interfaces';
import { LambdaError } from './lambda-error';

export abstract class GenericLambda<
  TOriginalEvent,
  TPreProcessedEvent,
  TProcessedData,
  TConfig extends LambdaConfig = LambdaConfig,
  TContext extends HandlerContext = HandlerContext,
  TClientEvent = unknown,
> implements LambdaRunner<TProcessedData>
{
  /**
   * Logger instance
   */
  protected logger: CorvaLogger;
  /**
   * Event processor function
   */
  protected process: ClientHandler<TContext, TClientEvent, TProcessedData>;

  abstract client(event: TPreProcessedEvent): TClientEvent;

  /**
   * Lambda configuration object
   * @default {}
   */
  protected configuration: TConfig;

  protected context: TContext;

  constructor({
    process,
    logger,
    configuration = {} as TConfig,
    createContext,
  }: GenericLambdaOptions<
    ClientHandler<TContext, TClientEvent, TProcessedData>,
    TConfig,
    (event: TPreProcessedEvent, context: Context) => Promise<TContext>
  >) {
    this.process = process;
    this.logger = logger;
    this.configuration = configuration || ({} as TConfig);
    this.createContext = createContext;
  }

  protected abstract preProcess(args: ProcessArgs): Promise<TPreProcessedEvent[]>;

  protected createContext: (event: TPreProcessedEvent | TOriginalEvent, context: Context) => Promise<TContext>;

  protected postProcess({ error }: PostProcessArgs<unknown, TProcessedData>): Promise<void> {
    if (!error) {
      return;
    }

    // should throw an error if it's present
    // this.logger.error(error, 'Lambda failed');

    throw error;
  }

  async run(event: unknown, context: Context): Promise<TProcessedData[]> {
    if (!this.process) {
      throw new LambdaError(ERROR_PROCESS_NOT_IMPLEMENTED, { event });
    }

    this.logger.once(ERROR_LOG_MESSAGE_ERROR_COUNT_EXCEEDED_EVENT, () => {
      throw new LambdaError(ERROR_LOG_MESSAGE_ERROR_COUNT_EXCEEDED_MSG, { event });
    });

    const events = Array.isArray(event) ? event.flat(2) : [event];

    let modEvent: TPreProcessedEvent[];
    const result: TProcessedData[] = [];

    try {
      modEvent = await this.preProcess({ event: events, context });
    } catch (error) {
      await this.postProcess({ error: error as Error, event: events, context }).catch((e) => {
        if (!this.configuration.swallowErrors) {
          throw e;
        }
      });

      return result;
    }

    if (!modEvent || !modEvent.length) {
      await this.postProcess({ event: modEvent, context });

      return result;
    }

    const ctx = await this.createContext(modEvent[0], context);

    if (ctx.cache) {
      await ctx.cache.vacuum((this.configuration as unknown as StreamLambdaConfig).vacuumDeleteCount);
    }

    try {
      for (const e of modEvent) {
        result.push(await this.process(this.client(e), ctx));
      }

      const data = result.filter(Boolean);

      await this.postProcess({ event: modEvent, context, data });

      return data;
    } catch (error) {
      // fail task
      await this.postProcess({ error: error as Error, event: modEvent, context }).catch((e) => {
        if (!this.configuration.swallowErrors) {
          throw e;
        }
      });
    } finally {
      // do something else?
      // kind of finalization stuff, shutdown
      // mb call some function
    }
  }
}
