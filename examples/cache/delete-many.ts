import { Corva } from '@corva/node-sdk';

export const handler = new Corva().scheduled(async (event, { cache }) => {
  await cache.store({ key1: 'value1', key2: 'value2', key3: 'value3' });
  // cache: { key1: 'value1', key2: 'value2', key3: 'value3' }

  await cache.deleteMany(['key1', 'key2']);
  // cache: { key3: 'value3' }

  return { status: 'OK' };
});
