import { StreamLambdaEvent } from '../../lambdas/interfaces';
import { LogType } from '../../enums';
import { StreamDepthEvent, StreamDepthRecord, StreamTimeEvent, StreamTimeRecord } from './stream';

export class StreamEventClassFactory {
  static event<T extends { metadata: { log_type: LogType.Depth } }>(event: T): StreamDepthEvent;
  static event<T extends { metadata: { log_type: LogType.Time } }>(event: T): StreamTimeEvent;
  static event(event: StreamLambdaEvent) {
    if (event.metadata.log_type === LogType.Depth) {
      return new StreamDepthEvent(
        {
          asset_id: event.asset_id,
          company_id: event.company_id,
          records: event.records.map((record) => new StreamDepthRecord(record as any)),
        },
        event,
      );
    }

    return new StreamTimeEvent(
      {
        asset_id: event.asset_id,
        company_id: event.company_id,
        records: event.records.map((record) => new StreamTimeRecord(record)),
      },
      event,
    );
  }
}
