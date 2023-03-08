import { BaseScheduledLambdaEvent } from '../../lambdas/interfaces';
import { SchedulerType } from '../../enums';
import { fromMsToS } from '../validators';
import { ScheduledDataTimeEvent, ScheduledDepthEvent, ScheduledNaturalTimeEvent } from './scheduled';

export class ScheduledEventClassFactory {
  static event<T extends { scheduler_type: SchedulerType.Depth }>(data: T): ScheduledDepthEvent;
  static event<T extends { scheduler_type: SchedulerType.DataTime }>(data: T): ScheduledDataTimeEvent;
  static event<T extends { scheduler_type: SchedulerType.NaturalTime }>(data: T): ScheduledNaturalTimeEvent;
  static event(
    data: BaseScheduledLambdaEvent,
  ): ScheduledDataTimeEvent | ScheduledDepthEvent | ScheduledNaturalTimeEvent {
    if (data.scheduler_type === SchedulerType.DataTime) {
      return new ScheduledDataTimeEvent(
        {
          start_time: fromMsToS(data.schedule_start) - data.interval + 1,
          end_time: fromMsToS(data.schedule_start),

          // common props
          company_id: data.company,
          asset_id: data.asset_id,
          rerun: data.rerun,
        },
        data,
      );
    }

    if (data.scheduler_type === SchedulerType.NaturalTime) {
      return new ScheduledNaturalTimeEvent(
        {
          schedule_start: fromMsToS(data.schedule_start),
          interval: data.interval,

          // common props
          company_id: data.company,
          asset_id: data.asset_id,
          rerun: data.rerun,
        },
        data,
      );
    }

    return new ScheduledDepthEvent(
      {
        top_depth: data.top_depth,
        bottom_depth: data.bottom_depth,
        log_identifier: data.log_identifier,
        interval: data.depth_milestone,

        // common props
        company_id: data.company,
        asset_id: data.asset_id,
        rerun: data.rerun,
      },
      data,
    );
  }
}
