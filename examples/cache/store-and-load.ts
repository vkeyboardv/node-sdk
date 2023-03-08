import { Corva } from '@corva/node-sdk';

export const handler = new Corva().scheduled(async (event, { cache, logger }) => {
  await cache.store({ key: 'val' });

  const res = await cache.load('key');

  logger.debug(res); // val

  return { status: 'OK' };
});
