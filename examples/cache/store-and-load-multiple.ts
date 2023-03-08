import { Corva } from '@corva/node-sdk';

export const handler = new Corva().scheduled(async (event, { cache, logger }) => {
  await cache.store({ key1: 'val1', key2: 'val2', key3: 'val3' });

  const res = await cache.loadAll();

  logger.debug(res); // { key1: 'val1', key2: 'val2' }

  return { status: 'OK' };
});
