import type { ApiHelper } from '../api-helper';
import { Dataset } from './dataset';

/**
 * Convenience methods for dataset
 */
export class Provider {
  /**
   * @internal
   */
  constructor(private client: ApiHelper, private provider: string, private appConnection: number) {}

  /**
   * @typeParam TCollectionRecordData Dataset record's data
   */
  dataset<TCollectionRecordData>(name: string): Dataset<TCollectionRecordData> {
    return new Dataset<TCollectionRecordData>(this.client, this.provider, this.appConnection, name);
  }
}
