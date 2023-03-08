import { Corva } from '@corva/node-sdk';

export const handler = new Corva().stream(async (event, context) => {
  const entry = context.api.provider('some-provider').dataset('some-collection').entry('some-id');

  context.logger.info(entry.instance); // undefined

  await entry.get();

  context.logger.info(entry.instance); // JSON
});
