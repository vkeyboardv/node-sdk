import { Corva, CollectionRecord, ScheduledDataTimeEvent } from '@corva/node-sdk';

export const handler = new Corva().scheduled(
  async (event: ScheduledDataTimeEvent, { api, logger }) => {
    const { body: records } = await api.request<CollectionRecord<unknown>>('api/v1/data/my-provider/my-collection/', {
      method: 'GET',
      searchParams: {
        query: JSON.stringify({
          asset_id: event.asset_id,
          timestamp: {
            $gte: event.start_time,
            $lte: event.end_time,
          },
        }),
        sort: JSON.stringify({ timestamp: 1 }),
        limit: 100,
        skip: 0,
      },
    });

    logger.info(records);

    return { status: 'OK' };
  },
  {
    updateStatus: true,
    swallowErrors: true,
  },
);
