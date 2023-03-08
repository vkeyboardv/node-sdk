import { CollectionRecord } from '../../lambdas/interfaces';
import type { ApiHelper } from '../api-helper';
import { RemoveFromCollectionResponseBody } from '../interfaces';
import { DataApiResource } from './data-api-resource';

/**
 * @typeParam TCollectionRecordData Dataset record's data
 */
export class Entry<TCollectionRecordData> extends DataApiResource<CollectionRecord<TCollectionRecordData>> {
  /**
   * @internal
   */
  constructor(
    client: ApiHelper,
    provider: string,
    dataset: string,
    entry: string | CollectionRecord<TCollectionRecordData>,
  ) {
    super(
      client,
      `api/v1/data/${provider}/${dataset}/${typeof entry === 'string' ? entry : entry._id}/`,
      typeof entry === 'string' ? undefined : entry,
    );
  }

  /**
   * Load record from API
   * @example
   * ```ts
   * [[include:dal/entry-get.ts]]
   * ```
   */
  async get(): Promise<CollectionRecord<TCollectionRecordData>> {
    return super.get();
  }

  /**
   * Update current record
   * @example
   * ```ts
   * [[include:dal/entry-update.ts]]
   * ```
   */
  async update(data: Partial<TCollectionRecordData>): Promise<CollectionRecord<TCollectionRecordData>> {
    await this._ensure();

    this.instance = await this.client.unwrappedRequest<CollectionRecord<TCollectionRecordData>>(this.path, {
      method: 'PATCH',
      json: {
        version: this.instance.version + 1,
        company_id: this.instance.company_id,
        data: { ...this.instance.data, ...data },
      },
    });

    return this.instance;
  }

  /**
   * Remove current record
   * @example
   * ```ts
   * [[include:dal/entry-remove.ts]]
   * ```
   */
  async remove(): Promise<RemoveFromCollectionResponseBody> {
    return super.remove();
  }

  /**
   * Fully replace current record
   */
  async replace(data: TCollectionRecordData): Promise<CollectionRecord<TCollectionRecordData>> {
    await this._ensure();

    return this.client.unwrappedRequest<CollectionRecord<TCollectionRecordData>>(this.path, {
      method: 'PUT',
      json: {
        ...this.instance,
        data,
      },
    });
  }
}
