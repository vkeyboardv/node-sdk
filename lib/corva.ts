process.env.SUPPRESS_NO_CONFIG_WARNING = '1';

import { Context, SQSEvent } from 'aws-lambda';
import type { ClientHandler, LambdaHandler, LocalEventHandler, TaskEventHandler } from './interfaces';
import {
  LambdaEvent,
  LocalLambdaConfig,
  LocalLambdaEvent,
  ScheduledLambdaConfig,
  ScheduledLambdaEvent,
  StreamLambdaConfig,
  StreamLambdaEvent,
  Task,
  TaskLambdaConfig,
  TaskLambdaEvent,
} from './lambdas/interfaces';
import { DEFAULT_SCHEDULED_CONFIG, ScheduledLambda } from './lambdas/scheduled-lambda';
import { DEFAULT_STREAM_CONFIG, StreamLambda } from './lambdas/stream-lambda';
import { DEFAULT_TASK_CONFIG, TaskLambda } from './lambdas/task-lambda';
import { rollbar } from './rollbar';

import { CorvaDataSource } from './api/corva-data-source';
import { LoggerFormat } from './enums';
import { LoggerFactory } from './logger/logger-factory';
import { ScheduledDataTimeEvent, ScheduledDepthEvent, ScheduledNaturalTimeEvent } from './models/scheduled/scheduled';
import { StreamDepthEvent, StreamTimeEvent } from './models/stream/stream';
import { TaskEvent } from './models/task';
import { sdkConfigValidator } from './config/sdk-config-validator';
import type { StatelessContext } from './context/stateless-context';
import type { StatefulContext } from './context/stateful-context';
import { StatelessContextFactory } from './context/stateless-context.factory';
import { StatefulContextFactory } from './context/stateful-context.factory';
import { StateFactory } from './cache/state.factory';
import { SdkConfigFactory } from './config/sdk-config';
import type { SdkConfig } from './config/types';

const isSqsEvent = (event: unknown): event is SQSEvent => !!(event as SQSEvent).Records;

const getFirstEvent = <T>(event: unknown): ScheduledLambdaEvent<T> =>
  (Array.isArray(event) ? (Array.isArray(event[0]) ? event[0][0] : event[0]) : event) as ScheduledLambdaEvent<T>;

const flatten = <T>(input: T | T[]): T[] => {
  if (Array.isArray(input)) {
    return input.reduce((acc: T[], curr: T | T[]) => {
      if (Array.isArray(curr)) {
        return acc.concat(curr);
      }

      acc.push(curr);

      return acc;
    }, [] as T[]);
  }

  return [input];
};

export class Corva {
  private config: SdkConfig;

  /**
   * {@link Corva} class is a factory for lambda functions inside the Corva Platform
   *
   * @example
   * Instantiating the framework
   * ```ts
   * [[include:corva-instantiate.ts]]
   * ```
   */
  constructor(config?: SdkConfig) {
    this.config = SdkConfigFactory.lambda(sdkConfigValidator, config);
  }

  /**
   * ### Task app
   *
   * @example
   * TypeScript
   * ```ts
   * [[include:task.ts]]
   * ```
   * @example
   * JavaScript
   * ```js
   * [[include:task.js]]
   * ```
   * @template TProperties Task properties
   * @template TResult A value returned from the task
   */
  public task<TProperties, TResult>(
    handler: ClientHandler<StatelessContext, TaskEvent<TProperties>, TResult>,
    configuration?: Partial<TaskLambdaConfig>,
  ): LambdaHandler<TResult> {
    return this.wrap(this.taskHandler(handler, configuration));
  }

  /**
   * @internal
   */
  public ecs<TProperties, TResult = void>(
    handler: TaskEventHandler<TProperties, TResult>,
    configuration?: Partial<TaskLambdaConfig>,
  ): (event?: TaskLambdaEvent) => Promise<TResult[]> {
    return (event: TaskLambdaEvent = this.config.event) =>
      this.taskHandler<TProperties, TResult>(handler, configuration)(event, { awsRequestId: event.task_id } as Context);
  }

  private taskHandler<TProperties, TResult>(
    handler: TaskEventHandler<TProperties, TResult>,
    configuration: Partial<TaskLambdaConfig> = DEFAULT_TASK_CONFIG,
  ) {
    return (rawEvent: TaskLambdaEvent, context: Context): Promise<TResult[]> => {
      const logger = LoggerFactory.create(this.config.log, context, configuration.logFormat);

      const lambda = new TaskLambda<TProperties, TResult>(
        {
          process: handler,
          logger,
          configuration,
          createContext: (event: Task<TProperties, TResult>, context: Context): Promise<StatelessContext> =>
            StatelessContextFactory.create({
              config: this.config,
              logger,
              context,
              event,
              rawEvent,
              apiKeyResolver: configuration.apiKeyResolvementStrategy,
            }),
        },
        (context: Context) =>
          CorvaDataSource.getApiClient(this.config, context, logger, configuration.apiKeyResolvementStrategy, rawEvent),
      );

      return lambda.run(rawEvent, context);
    };
  }

  /**
   * ### Realtime app
   *
   * Stream apps can be *time* (need to rely on {@link CollectionRecord.timestamp | `timestamp`}) or *depth* (need to rely on {@link CollectionRecord.measured_depth | `measured_depth`}) based.
   *
   * @example
   * TypeScript
   * ```ts
   * [[include:stream.ts]]
   * ```
   * @example
   * JavaScript
   * ```js
   * [[include:stream.js]]
   * ```
   * @template TRecord Record that comes in StreamEvent.records
   * @template TResult A value returned from the handler invocation
   */
  stream<TResult>(
    handler: ClientHandler<StatefulContext, StreamDepthEvent<unknown, unknown>, TResult>,
    configuration?: Partial<StreamLambdaConfig>,
  ): LambdaHandler<TResult>;
  stream<TResult>(
    handler: ClientHandler<StatefulContext, StreamTimeEvent<unknown, unknown>, TResult>,
    configuration?: Partial<StreamLambdaConfig>,
  ): LambdaHandler<TResult>;
  public stream<TResult>(
    handler: ClientHandler<StatefulContext, any, TResult>,
    configuration?: Partial<StreamLambdaConfig>,
  ): LambdaHandler<TResult> {
    return this.wrap(this.streamHandler(handler, configuration));
  }

  private streamHandler<TResult>(
    handler: ClientHandler<
      StatefulContext,
      StreamDepthEvent<unknown, unknown> | StreamTimeEvent<unknown, unknown>,
      TResult
    >,
    configuration: Partial<StreamLambdaConfig> = DEFAULT_STREAM_CONFIG,
  ) {
    return (rawEvent: unknown, context: Context) => {
      const logger = LoggerFactory.create(this.config.log, context, configuration.logFormat);
      const lambda = new StreamLambda(
        {
          process: handler,
          logger,
          configuration,
          createContext: (event: StreamLambdaEvent<unknown>, context: Context): Promise<StatefulContext> =>
            StatefulContextFactory.create({
              config: this.config,
              logger,
              context,
              event,
              apiKeyResolver: configuration.apiKeyResolvementStrategy,
            }),
        },
        StateFactory.getCache(this.config),
        this.config.app,
      );

      return lambda.run(rawEvent, context);
    };
  }

  /**
   * ### Scheduled app
   *
   * Scheduled apps can be based on:
   * - data time - invoked each {@link library.BaseScheduledLambdaEvent.interval | `<configured interval>`} seconds, while data available
   * - depth time - invoked each {@link library.BaseScheduledLambdaEvent.interval | `<configured interval>`} feet
   * - natural time - invoked each {@link library.BaseScheduledLambdaEvent.interval | `<configured interval>`} seconds
   *
   * @example
   * TypeScript
   * ```ts
   * [[include:scheduled.ts]]
   * ```
   *
   * @example
   * JavaScript
   * ```js
   * [[include:scheduled.js]]
   * ```
   * @template TProperties Additional properties that come from app configuration
   * @template TResult A value returned from the handler invocation
   */
  public scheduled<
    TEvent extends ScheduledDataTimeEvent | ScheduledDepthEvent | ScheduledNaturalTimeEvent,
    TResult = unknown,
  >(
    handler: ClientHandler<StatefulContext, TEvent, TResult>,
    configuration?: Partial<ScheduledLambdaConfig>,
  ): LambdaHandler<TResult> {
    return this.wrap(this.scheduledHandler(handler, configuration));
  }

  private scheduledHandler<THandler extends (...args: any[]) => Promise<any>>(
    handler: THandler,
    configuration: Partial<ScheduledLambdaConfig> = DEFAULT_SCHEDULED_CONFIG,
  ): LambdaHandler<Awaited<ReturnType<THandler>>> {
    return (rawEvent: unknown, context: Context) => {
      const logger = LoggerFactory.create(this.config.log, context, configuration.logFormat);
      const lambda = new ScheduledLambda(
        {
          process: handler,
          logger,
          configuration,
          createContext: (event: ScheduledLambdaEvent, context: Context): Promise<StatefulContext> =>
            StatefulContextFactory.create({
              config: this.config,
              logger,
              context,
              event,
              apiKeyResolver: configuration.apiKeyResolvementStrategy,
            }),
        },
        (context: Context) =>
          CorvaDataSource.getApiClient(
            this.config,
            context,
            logger,
            configuration.apiKeyResolvementStrategy,
            getFirstEvent(rawEvent),
          ),
      );

      return lambda.run(rawEvent, context);
    };
  }

  /**
   * @internal
   *  ### Local test
   *
   *  This is the method for creating handler that can be called locally to test event handlers for the app.
   *  Currently, only following types of apps are supported:
   *  - task app
   *
   *  @example
   * TypeScript
   *  ```ts
   *  [[include:local.ts]]
   *  ```
   * @param handler Provided handler to wrap
   * @param configuration Configuration for wrapping
   * @template TOriginalEvent Type of the argument that returned handler should accept
   * @template TPreProcessedEvent Type of the event that provided handler accepts
   * @template TResult Type of the result of the provided handler
   */
  public local<TOriginalEvent, TPreProcessedEvent extends LocalLambdaEvent<unknown>, TResult>(
    handler: LocalEventHandler<TPreProcessedEvent, TResult>,
    configuration: LocalLambdaConfig<TOriginalEvent, TPreProcessedEvent>,
  ): (event?: TOriginalEvent) => Promise<TResult> {
    return (event: TOriginalEvent) =>
      this.localHandler<TOriginalEvent, TPreProcessedEvent, TResult>(handler, configuration)(event, {
        awsRequestId: 'local-request',
      } as Context);
  }

  private localHandler<TOriginalEvent, TPreProcessedEvent extends LocalLambdaEvent<unknown>, TResult = void>(
    handler: LocalEventHandler<TPreProcessedEvent, TResult>,
    configuration: LocalLambdaConfig<TOriginalEvent, TPreProcessedEvent>,
  ) {
    return async (rawEvent: TOriginalEvent, context: Context): Promise<TResult> => {
      const eventForHandler = await configuration.getEventForHandler(rawEvent);
      const logger = LoggerFactory.create(this.config.log, context, LoggerFormat.Text);
      const contextForHandler = await StatelessContextFactory.create({
        config: this.config,
        logger,
        context,
        event: eventForHandler,
        rawEvent,
        apiKeyResolver: configuration.apiKeyResolvementStrategy,
      });

      return handler(eventForHandler, contextForHandler);
    };
  }

  private wrap<TEvent extends LambdaEvent<unknown, unknown>, TResult = unknown>(
    handler: LambdaHandler<TResult>,
  ): LambdaHandler<TResult> {
    const lambdaHandler = async (event: SQSEvent | TEvent, context: Context): Promise<TResult[]> => {
      context.callbackWaitsForEmptyEventLoop = false;

      if (isSqsEvent(event)) {
        const result = await Promise.all(
          event.Records.map((message) => JSON.parse(message.body) as TEvent).map((event) => handler(event, context)),
        );

        return result.flat();
      }

      return handler(event, context).then(flatten);
    };

    if (rollbar) {
      return rollbar.lambdaHandler(lambdaHandler) as unknown as LambdaHandler<TResult>;
    }

    return lambdaHandler;
  }
}
