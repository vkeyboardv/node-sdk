import { Corva } from '@corva/node-sdk';

export const handler = new Corva().stream(async (event, context) => {
  const entry = await context.api.provider('some-provider').dataset('some-collection').findOne({});

  context.logger.info(entry.instance); // JSON

  await entry.remove();

  context.logger.info(entry.instance); // JSON, still there

  await entry.update({ any: 'data' }); // will throw an error
});
