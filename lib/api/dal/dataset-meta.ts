import type { ApiHelper } from '../api-helper';
import { DatasetIndexMeta } from './dataset-index-meta';
import { DatasetIndexInfo, DatasetInfo } from './types';
import { DataApiResource } from './data-api-resource';

export class DatasetMeta extends DataApiResource<DatasetInfo> {
  private name: string;
  /**
   * @internal
   */
  constructor(client: ApiHelper, private provider: string, entry: string | DatasetInfo) {
    super(
      client,
      `api/v1/dataset/${provider}/${typeof entry === 'string' ? entry : entry.name}/`,
      typeof entry === 'string' ? undefined : entry,
    );

    this.name = typeof entry === 'string' ? entry : entry.name;
  }

  index(indexName: string): DatasetIndexMeta {
    return new DatasetIndexMeta(this.client, this.provider, this.name, indexName);
  }

  /**
   * Update dataset info
   */
  async update(data: Partial<DatasetInfo>) {
    await this._ensure();

    this.instance = await this.client.unwrappedRequest<DatasetInfo>(this.path, {
      method: 'PATCH',
      json: data,
    });

    return this.instance;
  }

  /**
   * Create new index for dataset
   */
  async createIndex(data: Pick<DatasetIndexInfo, 'name' | 'fields' | 'unique' | 'required'>) {
    await this._ensure();

    const result = await this.client.unwrappedRequest<DatasetIndexInfo>(`${this.path}index/`, {
      method: 'POST',
      json: data,
    });

    this.instance.indexes.push(result);

    return new DatasetIndexMeta(this.client, this.provider, this.name, result);
  }
}
