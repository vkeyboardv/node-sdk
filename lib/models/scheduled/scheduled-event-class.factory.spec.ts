import { SchedulerType } from '../../enums';
import { ScheduledDataTimeEvent, ScheduledDepthEvent, ScheduledNaturalTimeEvent } from './scheduled';
import { ScheduledEventClassFactory } from './scheduled-event-class.factory';

describe('ScheduledEventClassFactory', () => {
  describe('event', () => {
    it('should return a ScheduledDataTimeEvent', () => {
      const result = ScheduledEventClassFactory.event({
        scheduler_type: SchedulerType.DataTime,
        schedule_start: 1674826998000,
        interval: 180,
        company: 42,
        asset_id: 1,
        rerun: false,
      });

      expect(result).toBeInstanceOf(ScheduledDataTimeEvent);
      expect(result.company_id).toBe(42);
      expect(result.start_time).toBe(1674826819); // schedule_start / 1000 - interval + 1
      expect(result.end_time).toBe(1674826998);
    });

    it('should return a ScheduledNaturalTimeEvent', () => {
      const result = ScheduledEventClassFactory.event({
        scheduler_type: SchedulerType.NaturalTime,
        schedule_start: 1674826998000,
        interval: 1,
        company: 42,
        asset_id: 1,
        rerun: false,
      });

      expect(result).toBeInstanceOf(ScheduledNaturalTimeEvent);
      expect(result.company_id).toBe(42);
      expect(result.schedule_start).toBe(1674826998);
    });

    it('should return a ScheduledDepthEvent', () => {
      const result = ScheduledEventClassFactory.event({
        scheduler_type: SchedulerType.Depth,
        top_depth: 1,
        bottom_depth: 2,
        log_identifier: 'log_identifier',
        depth_milestone: 123,
        company: 42,
        asset_id: 1,
        rerun: false,
      });

      expect(result).toBeInstanceOf(ScheduledDepthEvent);
      expect(result.log_identifier).toBe('log_identifier');
      expect(result.top_depth).toBe(1);
      expect(result.bottom_depth).toBe(2);
      expect(result.interval).toBe(123);
      expect(result.company_id).toBe(42);
    });
  });
});
