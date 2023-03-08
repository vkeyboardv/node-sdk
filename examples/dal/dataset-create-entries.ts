import { Corva } from '@corva/node-sdk';

export const handler = new Corva().stream(async (event, context) => {
  const entries = await context.api
    .provider('some-provider')
    .dataset('some-collection')
    .createEntries([
      {
        timestamp: 1645387272,
        data: {
          some: 'data',
        },
      },
      {
        timestamp: 1645387273,
        data: {
          some: 'other-data',
        },
      },
    ]);

  for (const entry of entries) {
    context.logger.info(entry);
  }
});
