import { Corva } from '@corva/node-sdk';

export const handler = new Corva().stream(async (event, context) => {
  const entry = await context.api.provider('some-provider').dataset('some-collection').findOne({});

  context.logger.info(entry.instance); // JSON

  await entry.update({ some: 'data' });

  context.logger.info(entry.instance); // JSON, { data: { some: 'data' } }
});
