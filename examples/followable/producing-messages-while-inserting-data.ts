/* eslint-disable @typescript-eslint/require-await */
import { CollectionRecord, Corva, ScheduledDataTimeEvent, StreamTimeEvent } from '@corva/node-sdk';

export const producer = new Corva().stream(async (event, { api }) => {
  return api
    .provider('my-provider')
    .dataset('quiz-answers')
    .createEntriesAndProduceMessages([
      {
        timestamp: 1,
        company_id: 42,
        asset_id: event.asset_id,
        data: { answer: 10 },
      },
      {
        timestamp: 2,
        company_id: 42,
        asset_id: event.asset_id,
        data: { answer: 11 },
      },
    ]);
});

export const streamConsumer = new Corva().stream(async (event: StreamTimeEvent) => {
  // data from the producer - same that was published
  expect(event.records.map((record) => record.data)).toEqual([{ answer: 10 }, { answer: 11 }]);
});

export const scheduledConsumer = new Corva().scheduled(async (event: ScheduledDataTimeEvent, context) => {
  const searchParams = {
    query: { timestamp: { $gte: event.start_time, $lte: event.end_time } },
    limit: 10,
    sort: { timestamp: 1 },
  };
  const records: CollectionRecord<{ answer: number }>[] = [];

  for await (const record of context.api
    .provider('my-provider')
    .dataset<{ answer: number }>('quiz-answers')
    .search(searchParams)) {
    records.concat(record);
  }

  // data from the producer - same that was published
  expect(records.map((record) => record.data)).toEqual([{ answer: 10 }, { answer: 11 }]);
});
