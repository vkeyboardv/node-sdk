/* eslint-disable camelcase */

import { Context } from 'aws-lambda';
import { Rerun } from '../models/base';
import {
  ApiKeyResolvingStrategy,
  FilteringMode,
  LoggerFormat,
  LogType,
  SchedulerType,
  SourceType,
  TaskState,
} from '../enums';
import type { HandlerContext, LambdaHandler } from '../interfaces';
import { CorvaLogger } from '../logger/corva-logger';
import { LambdaError } from './lambda-error';

export interface GenericLambdaEvent {
  asset_id: number;
}

/**
 * Event processor args
 */
export interface ProcessArgs<TEvent = unknown> {
  /**
   * Lambda event object
   */
  event: TEvent[];
  /**
   * AWS lambda context
   */
  context?: Context;
}
export interface PostProcessArgs<TEvent = unknown, TResult = unknown> extends ProcessArgs<TEvent> {
  error?: LambdaError;
  data?: TResult[];
}

export type ProcessFn<TEvent, TOutput, TContext extends HandlerContext = HandlerContext> = (
  event: TEvent,
  context: TContext,
) => Promise<TOutput>;

export interface GenericLambdaOptions<TProcess, TConfig, TCreateContext> {
  /**
   * Data process function
   */
  process?: TProcess;
  /**
   * Logger instance
   */
  logger: CorvaLogger;
  /**
   * Lambda configuration object
   * @default {}
   */
  configuration: TConfig;
  createContext: TCreateContext;
}

/**
 * @internal
 */
export interface LambdaRunner<TProcessedData> {
  run: LambdaHandler<TProcessedData>;
}

export interface ScheduledLambdaConfig extends LambdaConfig {
  /**
   * Update scheduler status if set to `true`
   * @default true
   */
  updateStatus?: boolean;
  /**
   * @internal
   */
  vacuumDeleteCount: number;
}

export interface BaseScheduledLambdaEvent extends GenericLambdaEvent, WithClientContext {
  // type: string;
  collection: string;
  // batch_size: number;
  cron_string: string;
  environment: 'qa' | 'staging' | 'production' | 'testing';
  app: number;
  app_key: string;
  app_connection: number;
  source_type: SourceType;
  company: number;
  provider: string;
  // api_url: string;
  // api_key: string;
  schedule: number;
  asset_id: number;
  asset_name: string;
  asset_type: string;
  log_type: LogType;

  // time specific
  interval: number;
  schedule_start: number;
  schedule_end: number;

  // depth specific
  log_identifier?: string;
  top_depth?: number;
  bottom_depth?: number;
  depth_milestone?: number;

  timezone: string;
  day_shift_start: string;

  app_stream: number;
  scheduler_type: SchedulerType;
  has_secrets?: boolean;
  followable?: boolean;
  rerun?: Rerun;
}
/**
 * Event with which {@link Corva.scheduled | scheduled handler} gets invoked
 * @typeParam TApplicationConfig Application config set on asset stream level
 */
export type ScheduledLambdaEvent<TApplicationConfig = unknown> = BaseScheduledLambdaEvent & TApplicationConfig;

export interface LambdaConfig {
  /**
   * @internal
   */
  swallowErrors: boolean;
  /**
   * @internal
   */
  apiKeyResolvementStrategy?: ApiKeyResolvingStrategy;
  /**
   * @internal
   */
  logFormat: LoggerFormat;
}

export interface TaskLambdaConfig extends LambdaConfig {
  /**
   *
   * @internal
   */
  throwOnProcessed: boolean;
}

export interface LocalLambdaConfig<TOriginalEvent, TPreProcessedEvent extends LocalLambdaEvent<unknown>>
  extends Omit<LambdaConfig, 'swallowErrors' | 'logFormat'> {
  getEventForHandler: (originalEvent: TOriginalEvent) => Promise<TPreProcessedEvent>;
}

/**
 * @internal
 */
export interface RawTaskLambdaEvent {
  task_id: string;
  version: number;
  has_secrets?: boolean;
  followable?: boolean;
}

/**
 * @internal
 */
export interface WithClientContext {
  client_context?: { env: { API_KEY: string } };
}

/**
 * @internal
 */
export type TaskLambdaEvent = RawTaskLambdaEvent & WithClientContext;

/**
 * @internal
 */
export interface TaskApiBody {
  payload: {
    error?: string | Error;
  };
  fail_reason?: string;
}
/**
 * @internal
 */
export interface TaskResult {
  /**
   * Task error
   */
  error?: Error;
  /**
   * Task output (result)
   */
  data?: unknown;
}

/**
 * Event with which {@link Corva.task | task handler} gets invoked
 * @typeParam TProperties Data with which task was created
 * @typeParam TPayload Handler execution result
 */
export interface Task<TProperties = unknown, TPayload = unknown> extends GenericLambdaEvent {
  id: string;
  /**
   * Current task's state
   */
  state: TaskState;
  /**
   * Error message, in case task execution has failed
   */
  fail_reason: null | string;
  document_bucket: string;
  /**
   * Data with which task was created
   */
  properties: TProperties;
  /**
   * Handler execution result
   */
  payload: TPayload;
  asset_id: number;
  company_id: number;
  app_id: number;
}

/**
 * A generic record in any data collection
 */
export interface CollectionRecord<TData = unknown, TMeta = unknown> {
  _id: string;
  timestamp: number;
  collection: string;
  asset_id: number;
  provider: string;
  company_id: number;
  measured_depth?: number;
  stage_number?: number;
  version?: number;
  log_identifier?: string;
  data: TData;
  metadata?: TMeta;
}

/**
 * Stream config
 */
export interface StreamLambdaConfig extends LambdaConfig {
  /**
   * Set to `timestamp` or `depth` to clear event data with previously processed `timestamp` or `measured_depth` to prevent duplicate records.
   */
  filteringMode?: FilteringMode;
  /**
   * @internal
   */
  vacuumDeleteCount: number;
}

export type AppConnection = {
  app_connection_id: number;
  has_secrets?: boolean;
  followable?: boolean;
};

export type StreamEventMetadata = {
  source_type: string;
  app_stream_id: number;
  log_type: LogType;
  apps: Record<string, AppConnection>;
};

/**
 * Stream event record
 * @internal
 */
export type RawStreamLambdaEvent<TRecord> = GenericLambdaEvent & {
  /**
   * Event records
   */
  records: Array<TRecord>;
  /**
   * Event metadata
   */
  metadata: StreamEventMetadata;
  /**
   * Event asset id
   */
  asset_id: number;
  /**
   * Company id
   */
  company_id: number;
} & WithClientContext;

/**
 * Event with which {@link Corva.stream | stream handler} gets invoked
 * @typeParam TRecord Type of records that come in event
 */
export interface StreamLambdaEvent<TRecord = CollectionRecord> extends RawStreamLambdaEvent<TRecord> {
  /**
   * App connection id for app name provided in stream config
   */
  app_connection: number;

  app_stream_id: number;
  /**
   * Is stream completed
   */
  is_completed: boolean;
  has_secrets?: boolean;
  followable?: boolean;
}

export type RawLocalLambdaEvent<TRecord> = TRecord & GenericLambdaEvent;

export type LocalLambdaEvent<TRecord> = RawLocalLambdaEvent<TRecord> & WithClientContext;

export type HandlerPayload<TRecord, TOptions> =
  | LocalLambdaEvent<TRecord>
  | StreamLambdaEvent<TRecord>
  | Task<TOptions>
  | ScheduledLambdaEvent<TOptions>;

/**
 * @internal
 */
export type LambdaEvent<TRecord, TOptions> =
  | TaskLambdaEvent
  | RawStreamLambdaEvent<TRecord>[]
  | ScheduledLambdaEvent<TOptions>
  | ScheduledLambdaEvent<TOptions>[][];
