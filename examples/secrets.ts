import { Corva } from '@corva/node-sdk';

export const handler = new Corva().task((event, context) => {
  // in case app has secrets in Corva DC they will be injected into context
  if (context.secrets) {
    // some object
    context.logger.info(`App secrets: ${JSON.stringify(context.secrets)}`);
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions,@typescript-eslint/no-unsafe-member-access
    context.logger.info(`APP_SUPER_SECRET: ${context.secrets['APP_SUPER_SECRET']}`);
  } else {
    // undefined
    context.logger.warn('No secrets for app!');
  }

  return Promise.resolve();
});
