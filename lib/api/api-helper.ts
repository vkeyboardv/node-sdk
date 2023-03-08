/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable camelcase */
import { ApiClient } from './api-client';
import {
  AggregateOpts,
  GetAssetResponseBody,
  AssetSettings,
  CorvaApiHelper,
  GetDatasetOpts,
  SaveDataResult,
  SaveDataOpts,
  ProduceMessagesPayload,
} from './interfaces';
import { Options } from 'got';
import { RECORDS_TO_FETCH_LIMIT } from '../constants';
import type { SdkConfig } from '../config/types';
import { isScheduledEvent, isStreamEvent } from '../lambdas/guards';
import type { CollectionRecord, HandlerPayload } from '../lambdas/interfaces';
import { Asset } from './dto/asset';
import { Provider } from './dal/provider';
import { DatasetInfo, RecordToCreate } from './dal/types';
import { DatasetMeta } from './dal/dataset-meta';

const stringify = (value: unknown): string | undefined => {
  if (!value) {
    return;
  }

  return JSON.stringify(value);
};

/**
 * @internal
 */
export class ApiHelper implements CorvaApiHelper {
  private appConnection: number;

  constructor(private client: ApiClient, private config: SdkConfig, private event: HandlerPayload<unknown, unknown>) {
    this.appConnection = (isStreamEvent(this.event) || isScheduledEvent(this.event)) && this.event.app_connection;
  }

  async getAppSettings<T = Record<string, unknown>>(): Promise<AssetSettings & T> {
    const url = `v2/assets/${this.event.asset_id}/settings`;
    const options: Options = {
      searchParams: this.appConnection ? { app_connection_id: this.appConnection } : {},
    };

    return this.unwrappedRequest<AssetSettings & T>(url, options);
  }

  async getDataset<T>({
    provider = this.config.app.provider,
    dataset,
    query,
    fields,
    sort,
    limit,
  }: GetDatasetOpts): Promise<T[]> {
    const path = `api/v1/data/${provider}/${dataset}/`;
    const searchParams = {
      query: JSON.stringify(query),
      fields: fields ? fields.join(',') : undefined,
      sort: stringify(sort),
      limit: Math.min(RECORDS_TO_FETCH_LIMIT, limit),
    };

    return this.paginatedRequest<T>(path, searchParams);
  }

  getIteratedDataset<T>({
    provider = this.config.app.provider,
    dataset,
    query,
    fields,
    sort,
    limit,
  }: GetDatasetOpts): AsyncIterable<T[]> {
    const index = query.timestamp ? 'timestamp' : 'measured_depth';

    if (!query[index]) {
      throw new Error('Either [timestamp] or [measured_depth] is required in query');
    }

    // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
    const upperLimit =
      (query[index] && query[index].$lt) ||
      query[index].$lte ||
      (query[index].$gt && query[index].$gt + (limit || RECORDS_TO_FETCH_LIMIT)) ||
      (query[index].$gte && query[index].$gte + (limit || RECORDS_TO_FETCH_LIMIT));

    if (!upperLimit) {
      throw new Error('Timestamp query should have bounds');
    }

    const lowerLimit = query[index].$gt || query[index].$gte;
    const path = `api/v1/data/${provider}/${dataset}/`;
    const searchParams = {
      fields: fields ? fields.join(',') : undefined,
      sort: stringify(sort),
      limit: Math.min(RECORDS_TO_FETCH_LIMIT, limit),
      skip: 0,
    };
    const queue: Promise<T[]>[] = [];
    const QUEUE_SIZE = 10;

    let last = lowerLimit;

    const fillQueue = (): void => {
      while (queue.length < QUEUE_SIZE && last < upperLimit) {
        const prevLte = last;
        // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
        const $lte = prevLte + searchParams.limit > upperLimit ? upperLimit : prevLte + searchParams.limit;

        const indexQuery =
          query[index].$gte === prevLte
            ? {
                $gte: prevLte,
                $lte: $lte - 1,
              }
            : {
                $gt: prevLte,
                $lte,
              };

        const options = {
          searchParams: {
            ...searchParams,
            query: stringify({
              ...query,
              [index]: indexQuery,
            }),
          },
        };

        queue.unshift(this.unwrappedRequest<T[]>(path, options));

        last = indexQuery.$lte;
      }
    };

    return {
      [Symbol.asyncIterator]() {
        return {
          async next() {
            fillQueue();

            if (!queue.length) {
              return {
                value: [],
                done: true,
              };
            }

            return {
              value: await queue.pop(),
              done: false,
            };
          },
        };
      },
    };
  }

  async getAsset(assetId: number): Promise<Asset> {
    const path = `v2/assets/${assetId}`;

    return await this.unwrappedRequest<GetAssetResponseBody>(path, {
      searchParams: { fields: 'asset' },
      // eslint-disable-next-line @typescript-eslint/unbound-method
    }).then(Asset.fromGetAssetResponseBody);
  }

  async aggregate<T>({
    provider = this.config.app.provider,
    dataset,
    match,
    group,
    project,
    sort,
    limit,
  }: AggregateOpts): Promise<T[]> {
    const path = `api/v1/data/${provider}/${dataset}/aggregate/`;
    const searchParams = {
      match: JSON.stringify(match),
      group: stringify(group),
      project: stringify(project),
      sort: stringify(sort),
      limit: Math.min(RECORDS_TO_FETCH_LIMIT, limit),
      skip: 0,
    };

    return this.paginatedRequest<T>(path, searchParams);
  }

  /**
   * Post data to the [/api/v1/message_producer/](https://data.corva.ai/docs#/data/produce_api_v1_message_producer__post) endpoint using context.api.produceMessages method. The method will work for both stream and scheduled types of apps.
   * @example
   * [[include:followable/producing-messages-separately.ts]]
   */
  async produceMessages(data: ProduceMessagesPayload): Promise<void> {
    const body = {
      app_connection_id: this.appConnection,
      data,
    };

    await this.unwrappedRequest('api/v1/message_producer/', {
      method: 'POST',
      json: body,
    });
  }

  /**
   * Save or update records to dataset
   */
  async saveData<T extends Record<string, unknown>>({
    provider = this.config.app.provider,
    dataset,
    data,
    produce,
  }: SaveDataOpts<T>): Promise<SaveDataResult> {
    const records = Array.isArray(data) ? data : [data];
    const dataToUpdate = records.filter((record): record is CollectionRecord<T> =>
      Boolean((record as { _id: string })._id),
    );
    const dataToCreate = records.filter((record): record is RecordToCreate<T> => !(record as { _id: string })._id);
    const updated: string[] = dataToUpdate.map(({ _id }) => _id);

    const ds = this.provider(provider).dataset<T>(dataset);

    await Promise.all(
      dataToUpdate.map(async (record) => {
        const entry = ds.entry(record);

        entry.instance.version = (record.version || 1) + 1;

        return entry.replace(record.data);
      }),
    );

    if (!dataToCreate.length) {
      return { created: [], updated };
    }

    const res = await ds.create(dataToCreate, produce);

    return { created: res.map((e) => e.id), updated };
  }

  async unwrappedRequest<T>(path: string, options?: Options): Promise<T> {
    const { body } = await this.client.request<T>(path, options);

    return body;
  }

  private async paginatedRequest<T>(
    path: string,
    searchParams: { [key: string]: string | number; skip?: number },
    options: Options = {},
  ): Promise<T[]> {
    const response: T[] = [];

    searchParams.skip = searchParams.skip || 0;

    options.searchParams = searchParams;

    let res = await this.unwrappedRequest<T[]>(path, options);

    while (res.length === searchParams.limit) {
      response.push(...res);

      searchParams.skip += searchParams.limit;
      options.searchParams = searchParams;

      res = await this.unwrappedRequest<T[]>(path, options);
    }

    response.push(...res);

    return response;
  }

  provider(name: string): Provider {
    return new Provider(this, name, this.appConnection);
  }

  /**
   * Get all datasets
   */
  async getDatasets(search?: string, plottable = false) {
    return this.unwrappedRequest<DatasetInfo[]>('api/v1/datasets/', {
      searchParams: {
        search,
        plottable,
      },
    });
  }

  /**
   * Get datasets by company
   */
  async getDatasetsByCompany(plottable = false) {
    return this.unwrappedRequest<Record<string, DatasetInfo[]>>('api/v1/dataset/company/', {
      searchParams: { plottable },
    });
  }

  async createDataset(data: Partial<DatasetInfo>) {
    const instance = await this.unwrappedRequest<DatasetInfo>(`api/v1/dataset/${data.provider}/${data.name}/`, {
      method: 'POST',
      json: data,
    });

    return new DatasetMeta(this, data.provider, instance);
  }
}
