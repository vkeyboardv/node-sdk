import { Context } from 'aws-lambda';
import type { Redis } from 'ioredis';
import { getCacheKey } from '../cache/get-cache-key';
import { StatefulContext } from '../context/stateful-context';
import { ApiKeyResolvingStrategy, FilteringMode, LoggerFormat, LogType } from '../enums';
import { ClientHandler } from '../interfaces';
import { StreamDepthEvent, StreamDepthRecord, StreamTimeEvent, StreamTimeRecord } from '../models/stream/stream';
import { StreamEventClassFactory } from '../models/stream/stream-event-class.factory';
import type { SdkConfig } from '../config/types';
import {
  COMPLETED_COLLECTION,
  ERROR_MISSING_APP_KEY,
  ERRROR_NO_APP_CONNECTION,
  MAX_PROCESSED_DEPTH_FIELD,
  MAX_PROCESSED_TIMESTAMP_FIELD,
} from './constants';
import { GenericLambda } from './generic-lambda';
import {
  AppConnection,
  CollectionRecord,
  GenericLambdaOptions,
  PostProcessArgs,
  ProcessArgs,
  RawStreamLambdaEvent,
  StreamLambdaConfig,
  StreamLambdaEvent,
} from './interfaces';
import { LambdaError } from './lambda-error';

export const DEFAULT_STREAM_CONFIG: StreamLambdaConfig = {
  swallowErrors: false,
  apiKeyResolvementStrategy: ApiKeyResolvingStrategy.Fallback,
  vacuumDeleteCount: 3,
  logFormat: LoggerFormat.Text,
};

export class StreamLambda<TRecord extends CollectionRecord, TResult> extends GenericLambda<
  RawStreamLambdaEvent<TRecord>[],
  StreamLambdaEvent<TRecord>,
  TResult,
  StreamLambdaConfig,
  StatefulContext
> {
  client(event: StreamLambdaEvent<TRecord>) {
    return StreamEventClassFactory.event(event as any);
  }

  constructor(
    opts: GenericLambdaOptions<
      ClientHandler<StatefulContext, StreamDepthEvent | StreamTimeEvent, TResult>,
      Partial<StreamLambdaConfig>,
      (event: StreamLambdaEvent<TRecord>, context: Context) => Promise<StatefulContext>
    >,
    private redis: Redis,
    private config: SdkConfig['app'],
  ) {
    super({
      ...opts,
      configuration: {
        ...DEFAULT_STREAM_CONFIG,
        ...opts.configuration,
      },
    });
  }
  maxProcessedTimestamp: number;
  maxProcessedDepth: number;

  async preProcess({
    event,
    context,
  }: ProcessArgs<RawStreamLambdaEvent<TRecord>>): Promise<StreamLambdaEvent<TRecord>[]> {
    const flat = event.flat();
    const result: StreamLambdaEvent<TRecord>[] = [];

    for (const data of flat) {
      const { records, metadata } = data;
      const appConnection = this.resolveAppConnection(data, context);
      const base = records[0];
      const assetId = base.asset_id;
      const appStreamId = metadata.app_stream_id;
      const sourceType = metadata.source_type;

      let isCompleted = false;
      const lastRec = records[records.length - 1];

      if (lastRec && lastRec.collection === COMPLETED_COLLECTION) {
        isCompleted = true;

        records.pop(); // remove "completed" record
      }

      const key = getCacheKey({
        provider: this.config.provider,
        sourceType,
        appStreamId,
        appKey: this.config.key,
        assetId,
        appConnectionId: appConnection.app_connection_id,
      });

      this.maxProcessedTimestamp = await this.getMaxProcessedTimestamp(key);
      this.maxProcessedDepth = await this.getMaxProcessedDepth(key);

      const filteredRecords = this.applyFiltering(key, records);

      if (!filteredRecords.length) {
        // Don't pass events with empty records to user
        continue;
      }

      result.push({
        records: filteredRecords,
        app_connection: appConnection.app_connection_id,
        has_secrets: Boolean(appConnection.has_secrets),
        followable: Boolean(appConnection.followable),
        app_stream_id: appStreamId,
        asset_id: assetId,
        metadata,
        is_completed: isCompleted,
        company_id: lastRec.company_id,
      });
    }

    return result;
  }

  private async getMaxProcessedTimestamp(key: string): Promise<number | null> {
    const maxProcessedTimestamp = await this.redis.hget(key, MAX_PROCESSED_TIMESTAMP_FIELD);

    if (maxProcessedTimestamp) {
      return Number(maxProcessedTimestamp);
    }
  }

  private async getMaxProcessedDepth(key: string): Promise<number | null> {
    const maxProcessedDepth = await this.redis.hget(key, MAX_PROCESSED_DEPTH_FIELD);

    if (maxProcessedDepth) {
      return Number(maxProcessedDepth);
    }
  }

  private applyFiltering(key: string, records: TRecord[]): TRecord[] {
    const { filteringMode } = this.configuration;

    if (!filteringMode) {
      return records;
    }

    if (filteringMode === FilteringMode.Timestamp && this.maxProcessedTimestamp) {
      return (records as unknown as StreamTimeRecord[]).filter(
        (rec) => rec.timestamp > this.maxProcessedTimestamp,
      ) as unknown as TRecord[];
    } else if (filteringMode === FilteringMode.Depth && this.maxProcessedDepth) {
      return (records as unknown as StreamDepthRecord[]).filter(
        (rec) => rec.measured_depth > this.maxProcessedDepth,
      ) as unknown as TRecord[];
    }

    this.logger.warn(`Unsupported filteringMode provided: ${filteringMode}`);

    return records;
  }

  async postProcess({
    event,
    context,
    data,
    error,
  }: PostProcessArgs<RawStreamLambdaEvent<TRecord>, TResult>): Promise<void> {
    if (error) {
      await super.postProcess({ event, context, data, error });

      return;
    }

    for (const eventRecord of event) {
      if (eventRecord.metadata.log_type === LogType.Time) {
        await this.updateMaxProcessedValue(
          eventRecord,
          context,
          'timestamp',
          this.maxProcessedTimestamp,
          MAX_PROCESSED_TIMESTAMP_FIELD,
        );
      }

      if (eventRecord.metadata.log_type === LogType.Depth) {
        await this.updateMaxProcessedValue(
          eventRecord,
          context,
          'measured_depth',
          this.maxProcessedDepth,
          MAX_PROCESSED_DEPTH_FIELD,
        );
      }
    }
  }

  private async updateMaxProcessedValue(
    eventRecord: RawStreamLambdaEvent<TRecord>,
    context: Context,
    field: keyof Pick<TRecord, 'measured_depth' | 'timestamp'>,
    actualMax: number,
    cacheField: string,
  ): Promise<void> {
    if (!eventRecord.records.length) {
      return;
    }

    const appConnection = this.resolveAppConnection(eventRecord, context);
    const cacheKey = getCacheKey({
      provider: this.config.provider,
      sourceType: eventRecord.metadata.source_type,
      appStreamId: eventRecord.metadata.app_stream_id,
      appKey: this.config.key,
      assetId: eventRecord.asset_id,
      appConnectionId: appConnection.app_connection_id,
    });

    const currentMax = eventRecord.records.reduce<number>((acc, { [field]: value }) => {
      if (typeof value === 'number') {
        return Math.max(acc, value);
      }

      return acc;
    }, -Infinity);

    if ((actualMax === undefined && Number.isFinite(currentMax)) || currentMax > actualMax) {
      await this.redis.hset(cacheKey, cacheField, currentMax);
    }
  }

  private resolveAppConnection(record: RawStreamLambdaEvent<TRecord>, context: Context): AppConnection {
    const { metadata } = record;
    const appConnectionKey = this.config.key;

    if (!appConnectionKey) {
      throw new LambdaError(ERROR_MISSING_APP_KEY, context);
    }

    const appConnection = metadata.apps[appConnectionKey];

    if (!appConnection) {
      throw new LambdaError(ERRROR_NO_APP_CONNECTION, { event: record, context });
    }

    return appConnection;
  }
}
