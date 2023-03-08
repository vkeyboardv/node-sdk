/* eslint-disable new-cap */
import { StreamEventMetadata } from '../../lambdas/interfaces';
import { Base, Rerun } from '../base';

export type DataRecord<TData, TMeta> = {
  /**
   * record data.
   */
  data: TData;
  /**
   * record metadata.
   */
  metadata?: TMeta;
};

export type StreamTimeRecordProperties<TData, TMeta> = DataRecord<TData, TMeta> & {
  timestamp: number;
};

export type StreamDepthRecordProperties<TData, TMeta> = DataRecord<TData, TMeta> & {
  measured_depth: number;
  log_identifier: string;
};

/**
 * Stream time record data.
 */
export class StreamTimeRecord<TData = unknown, TMeta = unknown>
  extends Base
  implements StreamTimeRecordProperties<TData, TMeta>
{
  constructor(data: StreamTimeRecordProperties<TData, TMeta>) {
    super(data);
  }
  /**
   * Unix timestamp.
   */
  timestamp: number;
  /**
   * record data.
   */
  data: TData;
  /**
   * record metadata.
   */
  metadata?: TMeta;
}

/**
 * Stream depth record data.
 */
export class StreamDepthRecord<TData = unknown, TMeta = unknown>
  extends Base
  implements StreamDepthRecordProperties<TData, TMeta>
{
  constructor(data: StreamDepthRecordProperties<TData, TMeta>) {
    super(data);
  }
  /**
   * measured depth (ft).
   */
  measured_depth: number;

  log_identifier: string;
  /**
   * record data.
   */
  data: TData;
  /**
   * record metadata.
   */
  metadata?: TMeta;
}

export type RecordsTime<TData, TMeta> = StreamTimeRecord<TData, TMeta>[];
export type RecordsDepth<TData, TMeta> = StreamDepthRecord<TData, TMeta>[];

type StreamEventProperties = {
  asset_id: number;
  /**
   * company id.
   */
  company_id: number;
  /**
   * rerun metadata.
   */
  rerun?: Rerun;
};

type StreamTimeEventProperties<TData, TMeta> = StreamEventProperties & {
  /**
   * data records.
   */
  records: RecordsTime<TData, TMeta>;
};

type StreamDepthEventProperties<TData, TMeta> = StreamEventProperties & {
  /**
   * data records.
   */
  records: RecordsDepth<TData, TMeta>;
};

/**
 * Base stream event data.
 */
export abstract class StreamEvent<TData, TMeta> extends Base implements StreamEventProperties {
  /**
   * asset id.
   */
  asset_id: number;
  /**
   * company id.
   */
  company_id: number;
  /**
   * rerun metadata.
   */
  rerun?: Rerun;

  /**
   * Event metadata
   */
  metadata: StreamEventMetadata;

  /**
   * data records.
   */
  records: DataRecord<TData, TMeta>[];
}

/**
 * Stream time event data.
 */
export class StreamTimeEvent<TData = unknown, TMeta = unknown>
  extends StreamEvent<TData, TMeta>
  implements StreamTimeEventProperties<TData, TMeta>
{
  constructor(data: StreamTimeEventProperties<TData, TMeta>);
  constructor(data: StreamTimeEventProperties<TData, TMeta>, originalEvent: unknown);
  constructor(data: StreamTimeEventProperties<TData, TMeta>, originalEvent?: unknown) {
    super(data, originalEvent);
  }
  /**
   * data records.
   */
  records: RecordsTime<TData, TMeta>;
}

/**
 * Stream depth event data.
 */
export class StreamDepthEvent<TData = unknown, TMeta = unknown>
  extends StreamEvent<TData, TMeta>
  implements StreamDepthEventProperties<TData, TMeta>
{
  constructor(data: StreamDepthEventProperties<TData, TMeta>);
  constructor(data: StreamDepthEventProperties<TData, TMeta>, originalEvent: unknown);
  constructor(data: StreamDepthEventProperties<TData, TMeta>, originalEvent?: unknown) {
    super(data, originalEvent);
  }
  /**
   * data records.
   */
  records: RecordsDepth<TData, TMeta>;
}
