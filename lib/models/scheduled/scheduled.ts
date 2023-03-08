/* eslint-disable new-cap */
import { Base, Rerun } from '../base';

export type ScheduledEventProperties = {
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
};

export type ScheduledDataTimeEventProperties = ScheduledEventProperties & {
  /**
   * left bound of the time range, covered by this event. Use inclusively.
   */
  start_time: number;
  /**
   * right bound of the time range, covered by this event. Use inclusively.
   */
  end_time: number;
};

export type ScheduledDepthEventProperties = ScheduledEventProperties & {
  /**
   * start depth in ft., covered by this event.Use exclusively.
   */
  top_depth: number;
  /**
   * end depth in ft., covered by this event.Use inclusively.
   */
  bottom_depth: number;
  /**
   * app stream log identifier.Used to scope data by stream, asset might be connected to multiple depth based logs.
   */
  log_identifier: string;
  /**
   * distance between two schedule triggers.
   */
  interval: number;
};

export type ScheduledNaturalTimeEventProperties = ScheduledEventProperties & {
  /**
   * schedule trigger time.
   */
  schedule_start: number;
  /**
   * time between two schedule triggers.
   */
  interval: number;
};

/**
 * Base class for scheduled event data
 */
export abstract class ScheduledEvent extends Base implements ScheduledEventProperties {
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
}

/**
 * Data time scheduled event data.
 * @remarks
 *  Data time scheduled apps are run when there is a time span worth of new data. The time span is specified by user (e.g., 1 minute, 5 minutes, etc.). The event contains time range (start and end times) that there is a new data for. The app may then fetch and use that data.
 */

export class ScheduledDataTimeEvent extends ScheduledEvent implements ScheduledDataTimeEventProperties {
  constructor(data: ScheduledDataTimeEventProperties);
  constructor(data: ScheduledDataTimeEventProperties, originalEvent: unknown);
  constructor(data: ScheduledDataTimeEventProperties, originalEvent?: unknown) {
    super(data, originalEvent);
  }
  /**
   * left bound of the time range, covered by this event. Use inclusively.
   */
  start_time: number;
  /**
   * right bound of the time range, covered by this event. Use inclusively.
   */
  end_time: number;
}

/**
 * Depth scheduled event data.
 *
 * @remarks
 * Depth scheduled apps are run when there is a distance worth of new data. The distance is specified by user(e.g., 5 ft., 10 ft., etc.). The event contains depth range(top and bottom depths) that there is a new data for. The app may then fetch and use that data.
 */
export class ScheduledDepthEvent extends ScheduledEvent implements ScheduledDepthEventProperties {
  constructor(data: ScheduledDepthEventProperties);
  constructor(data: ScheduledDepthEventProperties, originalEvent: unknown);
  constructor(data: ScheduledDepthEventProperties, originalEvent?: unknown) {
    super(data, originalEvent);
  }
  /**
   * start depth in ft., covered by this event.Use exclusively.
   */
  top_depth: number;
  /**
   * end depth in ft., covered by this event.Use inclusively.
   */
  bottom_depth: number;
  /**
   * app stream log identifier.Used to scope data by stream, asset might be connected to multiple depth based logs.
   */
  log_identifier: string;
  /**
   * distance between two schedule triggers.
   */
  interval: number;
}

/**
 * Natural time scheduled event data.
 *
 * @remarks
 * Natural time scheduled apps are run with time frequency set up by user based on the actual time instead of data time(e.g., every 1 minute, every 5 minutes, etc.).
 */
export class ScheduledNaturalTimeEvent extends ScheduledEvent implements ScheduledNaturalTimeEventProperties {
  constructor(data: ScheduledNaturalTimeEventProperties);
  constructor(data: ScheduledNaturalTimeEventProperties, originalEvent: unknown);
  constructor(data: ScheduledNaturalTimeEventProperties, originalEvent?: unknown) {
    super(data, originalEvent);
  }
  /**
   * schedule trigger time.
   */
  schedule_start: number;
  /**
   * time between two schedule triggers.
   */
  interval: number;
}
