const { Corva } = require('@corva/node-sdk');

exports.handler = new Corva().scheduled(async (event, { logger, api }) => {
  const { body: records } = await api.request('api/v1/data/my-provider/my-collection/', {
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
});
