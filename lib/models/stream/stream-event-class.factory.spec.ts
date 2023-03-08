import { LogType, SourceType } from '../../enums';
import { StreamDepthEvent, StreamTimeEvent } from './stream';
import { StreamEventClassFactory } from './stream-event-class.factory';

describe('StreamEventClassFactory', () => {
  describe('event', () => {
    it('should return a StreamDepthEvent', () => {
      const event = StreamEventClassFactory.event({
        records: [
          {
            _id: '_id',
            timestamp: 1,
            collection: 'collection',
            provider: 'corva',
            asset_id: 1,
            company_id: 1,
            log_identifier: 'log_identifier',
            metadata: {
              boo: 'far',
            },
            data: {
              foo: 'bar',
            },
            measured_depth: 1,
          },
        ],
        metadata: {
          source_type: SourceType.Drilling,
          app_stream_id: 1,
          apps: {
            foo: { app_connection_id: 1 },
          },
          log_type: LogType.Depth,
        },
        app_connection: 1,
        app_stream_id: 1,
        is_completed: false,
        asset_id: 1,
        company_id: 1,
      });

      expect(event).toBeInstanceOf(StreamDepthEvent);
      expect(event.records[0].log_identifier).toBe('log_identifier');
      expect((event.records[0].metadata as any).boo).toBe('far');
      expect(event.records.length).toBe(1);
    });
    it('should return a StreamTimeEvent', () => {
      const event = StreamEventClassFactory.event({
        records: [
          {
            _id: '_id',
            timestamp: 1,
            collection: 'collection',
            provider: 'corva',
            asset_id: 1,
            company_id: 1,
            log_identifier: 'foo',
            metadata: {
              boo: 'far',
            },
            data: {
              foo: 'bar',
            },
          },
        ],
        metadata: {
          source_type: SourceType.Drilling,
          app_stream_id: 1,
          apps: {
            foo: { app_connection_id: 1 },
          },
          log_type: LogType.Time,
        },
        app_connection: 1,
        app_stream_id: 1,
        is_completed: false,
        asset_id: 1,
        company_id: 1,
      });

      expect(event).toBeInstanceOf(StreamTimeEvent);
    });
  });
});
