import type { ApiHelper } from '../api-helper';
import { DataApiResource } from './data-api-resource';
import { DatasetIndexInfo } from './types';

export class DatasetIndexMeta extends DataApiResource<DatasetIndexInfo> {
  /**
   * @internal
   */
  constructor(client: ApiHelper, provider: string, dataset: string, entry: string | DatasetIndexInfo) {
    super(
      client,
      `api/v1/dataset/${provider}/${dataset}/${typeof entry === 'string' ? entry : entry.name}/`,
      typeof entry === 'string' ? undefined : entry,
    );
  }

  /**
   * Check index
   */
  async check(): Promise<DatasetIndexInfo> {
    this._guardRemoved();

    return this.client.unwrappedRequest<DatasetIndexInfo>(`${this.path}check/`, {
      method: 'POST',
    });
  }

  /**
   * Perform index action
   */
  async action(name: string): Promise<DatasetIndexInfo> {
    await this._ensure();

    return this.client.unwrappedRequest<DatasetIndexInfo>(`${this.path}${name}/`, {
      method: 'POST',
    });
  }
}
