import type { Context } from 'aws-lambda';
import type { CorvaApi } from './api/interfaces';
import type { State } from './cache/state';
import type { SdkConfig } from './config/types';
import type { StatefulContext } from './context/stateful-context';
import type { StatelessContext } from './context/stateless-context';
import type { ApiKeyResolvingStrategy } from './enums';
import type { ScheduledLambdaEvent, StreamLambdaEvent, Task } from './lambdas/interfaces';
import type { CorvaLogger } from './logger/corva-logger';

export type TaskEventHandler<TProperties, TPayload = unknown> = (
  event: Task<TProperties, TPayload>,
  context: StatelessContext,
) => Promise<TPayload>;

export type StreamEventHandler<TRecord, TResult> = (
  event: StreamLambdaEvent<TRecord>,
  context: StatefulContext,
) => Promise<TResult>;

export type ScheduledEventHandler<TProperties, TResult> = (
  event: ScheduledLambdaEvent<TProperties>,
  context: StatefulContext,
) => Promise<TResult>;

export type LocalEventHandler<TEvent, TResult> = (event: TEvent, context: StatelessContext) => Promise<TResult>;

export interface HandlerContext {
  api: CorvaApi;
  logger: CorvaLogger;
  config: AppConfig;
  /**
   * In case there are some stored secrets inside Corva for the app it is possible to access that values.
   *
   * ⚠️ Will be `undefined` in case there are no secrets, need to check in code if there are any
   * @example
   * ```ts
   * [[include:secrets.ts]]
   * ```
   */
  secrets?: void | Record<string, string>;
  cache?: State;
}

/**
 * @internal
 */
export interface ContextCreationOpts<TEvent, TRawEvent> {
  config: SdkConfig;
  logger: CorvaLogger;
  context: Context;
  event: TEvent;
  apiKeyResolver?: ApiKeyResolvingStrategy;
  rawEvent?: TRawEvent;
}

export interface AppConfig {
  key: string;
  name: string;
  provider: string;
  env: string;
}

export interface ClientHandler<TContext extends HandlerContext, TEvent = unknown, TResult = unknown> {
  (event?: TEvent, context?: TContext): Promise<TResult>;
}
export type LambdaHandler<TResult = unknown> = (event: unknown, context: Context) => Promise<TResult[]>;

export type { GetDatasetOpts } from './api/interfaces';
