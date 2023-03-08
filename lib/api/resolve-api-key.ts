import { Context } from 'aws-lambda';
import { ERROR_NO_API_KEY } from '../constants';
import { ApiKeyResolvingStrategy } from '../enums';
import type { WithClientContext } from '../lambdas/interfaces';
import type { SdkConfig } from '../config/types';

export const resolveApiKey = (
  context: Context,
  config: SdkConfig,
  event?: Partial<WithClientContext>,
  strategy: ApiKeyResolvingStrategy = ApiKeyResolvingStrategy.Fallback,
): string => {
  let apiKey: string;

  switch (strategy) {
    case ApiKeyResolvingStrategy.Fallback: {
      apiKey =
        (context.clientContext?.env as unknown as Record<string, string>)?.API_KEY ||
        // eslint-disable-next-line camelcase
        event?.client_context?.env?.API_KEY ||
        config.api.api.apiKey;

      break;
    }
    case ApiKeyResolvingStrategy.Context: {
      apiKey = (context.clientContext?.env as unknown as Record<string, string>)?.API_KEY;

      break;
    }
    case ApiKeyResolvingStrategy.Environment: {
      apiKey = config.api.api.apiKey;

      break;
    }
    case ApiKeyResolvingStrategy.Event: {
      // eslint-disable-next-line camelcase
      apiKey = event?.client_context?.env?.API_KEY;

      break;
    }
    default: {
      throw new Error('Unknown api key resolvement strategy');
    }
  }

  if (apiKey) {
    return apiKey;
  }

  throw new Error(ERROR_NO_API_KEY);
};
