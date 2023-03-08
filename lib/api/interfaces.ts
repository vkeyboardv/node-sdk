/* eslint-disable camelcase */
import { CollectionRecord } from '../lambdas/interfaces';
import type { ApiClient } from './api-client';
import type { Provider } from './dal/provider';
import { Asset } from './dto/asset';

interface AssetRelationLink {
  id: string;
  type: DataType.Asset;
}

export interface ApiAssetDtoAttributes {
  asset_type: AssetType;
  parent_asset_name: string;
  name: string;
  type: AttributeType;
  stats: AssetStats;
  last_active_at: string;
  status: AssetStatus;
  created_at: Date;
  settings: AssetSettings;
  visibility: AssetVisibility;
  county: string;
  basin: string;
  api_number: string;
  string: string;
  top_hole: TopHole;
  bottom_hole: BottomHole;
  contractor_name: string;
  directional_driller: string;
  mud_company: string;
  company_id: number;
  root_asset_name: string;
  parent_asset_id: number;
  custom_properties: BottomHole;
  string_design: string;
  target_formation: string;
  area: string;
  visible_rerun_id: string;
  day_shift_start_time: string;
  lon_lat: {
    longitude: number;
    latitude: number;
  };
  qc_by: string;
  qc_at: string;
  rig_classification: string;
  company_name: string;
  timezone: string;
}

export type BottomHole = Record<string, any>;
export interface TopHole {
  raw: string;
  coordinates: [number, number];
}

export interface AssetStats {
  spud_at?: number | string;
  well_end: number;
  total_cost: number;
  total_time: number;
  well_start: number;
  total_depth: number;
  first_active_at?: number | string;
  witsml_data_frequency?: number | string;
}

export interface ApiAssetDto {
  id: string;
  type: 'asset';
  attributes: Partial<ApiAssetDtoAttributes>;
  relationships: {
    company?: {
      data: {
        id: string;
        type: 'company';
      } | null;
    };
    parent_asset?: {
      data: AssetRelationLink | null;
    };
    active_child?: {
      data: AssetRelationLink | null;
    };
    children?: {
      data: AssetRelationLink[] | null;
    };
  };
}

export interface ApiCompanyDto {
  id: string;
  type: DataType.Company;
  attributes: {
    id: number;
    name: string;
    time_zone: string;
    language: string;
    provider: string;
    unit_system: UnitSystem;
    dev_center_enabled: boolean;
  };
}

export interface UnitSystem {
  yp: string;
  oil: string;
  area: string;
  mass: string;
  time: string;
  angle: string;
  force: string;
  power: string;
  speed: string;
  length: string;
  system: string;
  torque: string;
  volume: string;
  current: string;
  density: string;
  gravity: string;
  voltage: string;
  pressure: string;
  velocity: string;
  gravityRMS: string;
  msePressure: string;
  oilFlowRate: string;
  shortLength: string;
  temperature: string;
  massFlowRate: string;
  fluidVelocity: string;
  massPerLength: string;
  anglePerLength: string;
  lengthPerAngle: string;
  volumeFlowRate: string;
  inversePressure: string;
  gasConcentration: string;
  pressureGradient: string;
  massConcentration: string;
  revolutionPerVolume: string;
  chemMassConcentration: string;
  chemVolumeConcentration: string;
}

export interface GetAssetResponseBody {
  data: ApiAssetDto;
  included: Array<ApiAssetDto | ApiCompanyDto>;
}

export interface AssetSettings {
  timezone: string;
  completion_day_shift_start_time?: string;
  day_shift_start_time?: string;
  drilling_afe_number?: string;
  top_hole: {
    raw: string;
    coordinates: [number, number];
  };
  shard_mode: string;
  bottom_hole: BottomHole;
  spud_release: any[];
  last_mongo_refresh: string;
  rig_classification?: RigClassification;
  assetId?: number;
  appConnection?: number;
  requestId?: string;
  frac_fleet_id?: string;
  associations_last_active_at_updated_at?: string;
  app_version?: string;
}

export interface GetDatasetOpts {
  provider?: string;
  dataset: string;
  /**
   * See [MongoDb documentation](https://docs.mongodb.com/manual/tutorial/query-documents/)
   */
  query: Record<string, any>;
  /**
   * A set of fields need to be returned inside the records
   */
  fields?: string[];
  /**
   * See [MongoDb documentation](https://docs.mongodb.com/manual/reference/method/cursor.sort/)
   */
  sort: Record<string, number>;
  /**
   * Max amount of records returned
   */
  limit: number;
}

export interface AggregateOpts {
  provider?: string;
  dataset: string;
  /**
   * See [MongoDb documentation](https://docs.mongodb.com/manual/reference/operator/aggregation/match/)
   */
  match: Record<string, any>;
  /**
   * See [MongoDb documentation](https://docs.mongodb.com/manual/reference/operator/aggregation/group/)
   */
  group?: Record<string, any>;
  /**
   * See [MongoDb documentation](https://docs.mongodb.com/manual/reference/operator/aggregation/project/)
   */
  project?: Record<string, any>;
  /**
   * See [MongoDb documentation](https://docs.mongodb.com/manual/reference/operator/aggregation/sort/)
   */
  sort: Record<string, number>;
  limit: number;
}

export type ProduceMessagesPayload =
  | Array<{ timestamp: number; collection?: string }>
  | Array<{ measured_depth: number; timestamp?: number; collection?: string }>;

/**
 * @internal
 */
export interface CorvaApiHelper {
  getAppSettings: <T>() => Promise<AssetSettings & T>;
  getDataset: <T>(opts: GetDatasetOpts) => Promise<T[]>;
  getIteratedDataset: <T>(opts: GetDatasetOpts) => AsyncIterable<T[]>;
  aggregate: <T>(opts: AggregateOpts) => Promise<T[]>;
  getAsset(assetId: number): Promise<Asset>;
  saveData<T extends Record<string, unknown>>(opts: SaveDataOpts<T>): Promise<SaveDataResult>;
  provider: (name: string) => Provider;
  produceMessages: (data: ProduceMessagesPayload) => Promise<void>;
}

/**
 * @internal
 */
export interface CorvaApi extends CorvaApiHelper {
  request: ApiClient['request'];
  raw: ApiClient['raw'];
}

export interface InsertToCollectionResponseBody {
  inserted_ids: string[];
  failed_count: number;
  messages: string[];
}

export interface RemoveFromCollectionResponseBody {
  deleted_docs: string[];
  failed_count: number;
}

export interface RemoveManyFromCollectionResponseBody {
  deleted_count: number;
}

export interface SaveDataResult {
  created: string[];
  updated: string[];
}

export interface SaveDataOpts<T> {
  provider: string;
  dataset: string;
  data: CollectionRecord<T> | RecordToCreate<T> | (CollectionRecord<T> | RecordToCreate<T>)[];
  produce?: boolean;
}

import bottleneck from 'bottleneck';
import { Options as GotOptions } from 'got';
import { AssetStatus, AssetType, AssetVisibility, AttributeType, DataType, RigClassification } from '../enums';
import { RecordToCreate } from './dal/types';

export interface ApiOptions {
  /**
   * API base url
   */
  prefixUrl: string;
  /**
   * Data API base url
   */
  prefixDataUrl: string;
  /**
   * Application name
   */
  appKey?: string;
  /**
   * Api key
   */
  apiKey?: string;
}

type logFn = (...args: any) => void;
export interface Logger {
  log: logFn;
  debug: logFn;
  info: logFn;
  warn: logFn;
  error: logFn;
  fatal: logFn;
}

export interface StatsOptions {
  /**
   * Enables logs for requests that may worth paying attention
   */
  tracking?: {
    /**
     * Tracks large requests if true
     */
    largeRequest?: boolean;
    /**
     * Tracks slow requests if true
     */
    slowRequest?: boolean;
    /**
     * Tracks retried requests if true
     */
    retries?: boolean;
  };
  /**
   * Max amount of retries after request will be logged
   * @default 3
   */
  retryCount?: number;
  /**
   * Max time (ms) after request will be logged
   * @default 5000
   */
  slowRequest?: number;
  /**
   * Max amount bytes after request will be logged
   * @default 5kb
   */
  largeRequest?: number;
}

export interface ApiClientOptions {
  /**
   * Api options
   */
  api: ApiOptions;
  /**
   * Bottleneck rate limiter options
   * @see https://www.npmjs.com/package/bottleneck
   * Set to `false` to disable rate limiting
   */
  limits?: bottleneck.ConstructorOptions;
  /**
   * Logger instance
   * Set to `false` to disable logs completely
   */
  logger: Logger;
  /**
   * Got request options
   * @see https://www.npmjs.com/package/got
   */
  requestOptions?: GotOptions;
  /**
   * Logs some statistics if logger enabled
   */
  stats?: StatsOptions;
}
