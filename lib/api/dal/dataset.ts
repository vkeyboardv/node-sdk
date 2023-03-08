/* eslint-disable camelcase */
import { CollectionRecord } from '../../lambdas/interfaces';
import type { ApiHelper } from '../api-helper';
import { Entry } from './entry';
import type {
  GetDatasetOpts,
  InsertToCollectionResponseBody,
  RemoveManyFromCollectionResponseBody,
} from '../interfaces';
import type { EntryMetadata, RecordToCreate } from './types';
import { DatasetMeta } from './dataset-meta';

/**
 * Convenience methods for dataset
 * @typeParam TCollectionRecordData Dataset record's data
 */
export class Dataset<TCollectionRecordData> {
  /**
   * @internal
   */
  constructor(
    private client: ApiHelper,
    private provider: string,
    private appConnection: number,
    private dataset: string,
  ) {}

  /**
   * Create {@link Entry} instance with id or existing object
   */
  entry(idOrRecord?: string | CollectionRecord<TCollectionRecordData>): Entry<TCollectionRecordData> {
    return new Entry<TCollectionRecordData>(this.client, this.provider, this.dataset, idOrRecord);
  }

  /**
   * Create new records and get created {@link Entry | entries}
   * @example
   * ```ts
   * [[include:dal/dataset-create-entries.ts]]
   * ```
   */
  createEntries(
    data: RecordToCreate<TCollectionRecordData> | RecordToCreate<TCollectionRecordData>[],
  ): Promise<Entry<TCollectionRecordData>[]> {
    return this.create(data, false);
  }

  /**
   * Same as {@link Dataset.createEntries} but additionally will call {@link library.CorvaDataSource.produceMessages | message producer } internally
   * @example
   * ```ts
   * [[include:followable/producing-messages-while-inserting-data.ts]]
   * ```
   */
  createEntriesAndProduceMessages(
    data: RecordToCreate<TCollectionRecordData> | RecordToCreate<TCollectionRecordData>[],
  ): Promise<Entry<TCollectionRecordData>[]> {
    return this.create(data, true);
  }

  /**
   * @internal
   */
  async create(
    data: RecordToCreate<TCollectionRecordData> | RecordToCreate<TCollectionRecordData>[],
    shouldProduce: boolean,
  ): Promise<Entry<TCollectionRecordData>[]> {
    const dataToCreate = (Array.isArray(data) ? data : [data]).map((item) => ({
      ...item,
      version: 1,
      provider: this.provider,
      collection: this.dataset,
    }));

    const json = shouldProduce
      ? dataToCreate
      : {
          data: dataToCreate,
          producer: { app_connection_id: this.appConnection },
        };

    const { inserted_ids } = await this.client.unwrappedRequest<InsertToCollectionResponseBody>(
      `api/v1/data/${this.provider}/${this.dataset}/`,
      {
        method: 'POST',
        json,
      },
    );

    return inserted_ids.map((id) => new Entry(this.client, this.provider, this.dataset, id));
  }

  /**
   * Insert new document, returns {@link Entry}
   */
  async createEntry(data: TCollectionRecordData, meta: EntryMetadata): Promise<Entry<TCollectionRecordData>> {
    const json = {
      ...meta,
      version: 1,
      provider: this.provider,
      collection: this.dataset,
      timestamp: meta.timestamp || Math.floor(Date.now() / 1000),
      data,
    };

    const response = await this.client.unwrappedRequest<CollectionRecord<TCollectionRecordData>>(
      `api/v1/data/${this.provider}/${this.dataset}/`,
      {
        method: 'PUT',
        json,
      },
    );

    return new Entry<TCollectionRecordData>(this.client, this.provider, this.dataset, response);
  }

  /**
   * Remove multiple records by [query](https://docs.mongodb.com/manual/tutorial/query-documents/)
   */
  async removeMany(query: Record<string, any>): Promise<RemoveManyFromCollectionResponseBody> {
    return this.client.unwrappedRequest<RemoveManyFromCollectionResponseBody>(
      `api/v1/data/${this.provider}/${this.dataset}/`,
      {
        method: 'DELETE',
        searchParams: { query: JSON.stringify(query) },
      },
    );
  }

  /**
   * Search by documents.
   * @see {@link library.CorvaDataSource.getIteratedDataset}.
   */
  search(
    options: Omit<GetDatasetOpts, 'provider' | 'dataset'>,
  ): AsyncIterable<CollectionRecord<TCollectionRecordData>[]> {
    return this.client.getIteratedDataset<CollectionRecord<TCollectionRecordData>>({
      ...options,
      provider: this.provider,
      dataset: this.dataset,
    });
  }

  async findOne(
    query: Record<string, unknown>,
    sort: Record<string, 1 | -1> = { timestamp: 1 },
    fields: string[] = ['timestamp', 'measured_depth', 'asset_id', 'data'],
  ): Promise<Entry<TCollectionRecordData>> {
    const [record] = await this.client.unwrappedRequest<CollectionRecord<TCollectionRecordData>[]>(
      `api/v1/data/${this.provider}/${this.dataset}/`,
      {
        method: 'GET',
        searchParams: {
          query: JSON.stringify(query),
          limit: 1,
          sort: JSON.stringify(sort),
          fields: fields.join(','),
        },
      },
    );

    if (!record) {
      return;
    }

    return new Entry(this.client, this.provider, this.dataset, record);
  }

  /**
   * Wrapper for aggregate API
   *
   * See [Swagger UI](https://data.corva.ai/docs#/data/aggregate_api_v1_data__provider___dataset__aggregate__get), [MongoDB docs](https://docs.mongodb.com/manual/aggregation/)
   */
  aggregate() {
    throw new Error('Not implemented');
  }

  /**
   * Wrapper for aggregate with pipeline API
   *
   * See [Swagger UI](https://data.corva.ai/docs#/data/aggregate_pipeline_api_v1_data__provider___dataset__aggregate_pipeline__get), [MongoDB docs](https://docs.mongodb.com/manual/core/aggregation-pipeline/)
   */
  aggregatePipeline<P>(stages: unknown[]): Promise<P[]> {
    return this.client.unwrappedRequest<P[]>(`api/v1/data/${this.provider}/${this.dataset}/aggregate/pipeline/`, {
      searchParams: { stages: JSON.stringify(stages) },
    });
  }

  meta(): DatasetMeta {
    return new DatasetMeta(this.client, this.provider, this.dataset);
  }
}
