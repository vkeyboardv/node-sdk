import { Corva } from '@corva/node-sdk';

export const handler = new Corva().scheduled(async (event, { cache }) => {
  await cache.store({ key1: 'val1', key2: 'val2', key3: 'val3' });
  // cache: { key1: 'val1', key2: 'val2', key3: 'val3' }

  await cache.delete('key1');
  // cache: { key2: 'val2', key3: 'val3' }

  return { status: 'OK' };
});
