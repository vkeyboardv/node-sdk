import { DatasetType } from '../../enums';
import { CollectionRecord } from '../../lambdas/interfaces';

/* eslint-disable camelcase */
export type EntryMetadata = Pick<CollectionRecord<unknown>, 'stage_number' | 'measured_depth' | 'timestamp'>;

type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

export type RecordToCreate<T> = Optional<
  Omit<CollectionRecord<T>, '_id' | 'version' | 'provider' | 'collection'>,
  'asset_id' | 'company_id'
>;

export type DatasetInfo = {
  company_id: number;
  provider: string;
  name: string;
  description?: string;
  schema: Record<string, unknown>;
  data_type: DatasetType;
  settings: Record<string, unknown>;
  permission_workflow: {
    read: 'request';
    write: 'request';
    delete: 'request';
  };
  plottable: boolean;
  id: number;
  friendly_name: string;
  indexes: DatasetIndexInfo[];
  statistics: {
    size: number;
    count: number;
    storage_size: number;
    index_size: number;
  };
};

export type DatasetIndexInfo = {
  name: string;
  fields: Record<string, number>[];
  unique: boolean;
  required: boolean;
  status: 'active';
  statistics: {
    size: number;
    usage: number;
  };
};
