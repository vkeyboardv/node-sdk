import { ApiClient } from '../api/api-client';
import { ApiKeyResolvingStrategy } from '../enums';
import { ApiHelper } from './api-helper';
import { resolveApiKey } from './resolve-api-key';

import type { Options, RequestError } from 'got/dist/source';
import type { Context } from 'aws-lambda';
import type { CorvaApi, Logger } from './interfaces';
import type { ContextCreationOpts } from '../interfaces';
import type { HandlerPayload, WithClientContext } from '../lambdas/interfaces';
import type { CorvaLogger } from '../logger/corva-logger';
import type { SdkConfig } from '../config/types';

/**
Apps might need to communicate with the [Corva Platform API](https://api.corva.ai/documentation/index.html) and [Corva Data API](https://data.corva.ai/docs#/).

This SDK provides an {@link CorvaDataSource} class, which is [node-api-client](https://www.npmjs.com/package/@corva/node-api-client) and based on [got](https://www.npmjs.com/package/got)
 */
export class CorvaDataSource implements CorvaApi {
  /**
   * Make a request to any Corva URL.
   *
   * For options' details see [got documentation](https://github.com/sindresorhus/got)
   * @example
   * ```ts
   * [[include:corva-data-source.ts]]
   * ```
   */
  public readonly request: ApiClient['request'];
  /**
   * Make a request to any URL.
   *
   * For options' details see [got documentation](https://github.com/sindresorhus/got)
   * @example
   * ```ts
   * [[include:corva-data-source-raw.ts]]
   * ```
   */
  public readonly raw: ApiClient['raw'];
  /**
   * Get settings for the app
   */
  public readonly getAppSettings: ApiHelper['getAppSettings'];
  /**
   * Search records in provided dataset
   *
   * This method is good for getting a small amount of records from dataset
   */
  public readonly getDataset: ApiHelper['getDataset'];
  /**
   * Search records in provided dataset
   *
   * This method is designed for obtaining a huge amount of records from dataset (10000+)
   */
  public readonly getIteratedDataset: ApiHelper['getIteratedDataset'];
  /**
   * Wrapper for aggregate API
   *
   * See [Swagger UI](https://data.qa.corva.ai/docs#/data/aggregate_api_v1_data__provider___dataset__aggregate__get), [MongoDB docs](https://docs.mongodb.com/manual/aggregation/)
   *
   */
  public readonly aggregate: ApiHelper['aggregate'];
  /**
   * Get asset info
   */
  public readonly getAsset: ApiHelper['getAsset'];
  /**
   * Save one or multiple records.
   *
   * This method will update existing records or create new ones.
   */
  public readonly saveData: ApiHelper['saveData'];
  /**
   * User-friendly interface for interaction with Corva API
   */
  public readonly provider: ApiHelper['provider'];

  public readonly produceMessages: ApiHelper['produceMessages'];

  /**
   * @internal
   */
  constructor(client: ApiClient, helper: ApiHelper, logger: CorvaLogger) {
    const request = client.request.bind(client) as ApiClient['request'];

    client.request = <T>(path: string, options?: Options) =>
      request<T>(path, options).catch((err: RequestError) => {
        err.options &&
          logger.error(err.message, {
            headers: err.options.headers,
            protocol: err.options.https ? 'https' : 'http',
            url: err.options.url,
            method: err.options.method,
            body: {
              request: err.options.body || err.options.json,
              response: err.response && err.response.body,
            },
          });

        throw err;
      });

    return new Proxy<CorvaApi>({} as unknown as CorvaApi, {
      get(target, prop, receiver) {
        if (Reflect.has(client, prop)) {
          return Reflect.get(client, prop, receiver) as unknown;
        }

        return Reflect.get(helper, prop, receiver) as unknown;
      },
    });
  }

  /**
   * @internal
   */
  static setup(opts: ContextCreationOpts<HandlerPayload<unknown, unknown>, unknown>): CorvaApi {
    const apiClient = CorvaDataSource.getApiClient(
      opts.config,
      opts.context,
      opts.logger,
      opts.apiKeyResolver,
      opts.rawEvent || opts.event,
    );
    const helper = new ApiHelper(apiClient, opts.config, opts.event);

    return new CorvaDataSource(apiClient, helper, opts.logger);
  }
  /**
   * @internal
   */
  public static getApiClient(
    config: SdkConfig,
    context: Context,
    logger: CorvaLogger,
    apiKeyResolvementStrategy?: ApiKeyResolvingStrategy,
    event?: Partial<WithClientContext>,
  ): ApiClient {
    return CorvaDataSource.setupApiClient(config, context, logger, event, apiKeyResolvementStrategy);
  }

  private static setupApiClient(
    config: SdkConfig,
    context: Context,
    logger: CorvaLogger,
    event?: Partial<WithClientContext>,
    apiKeyResolvementStrategy?: ApiKeyResolvingStrategy,
  ): ApiClient {
    const apiConfig = {
      ...config.api,
      api: {
        ...config.api.api,
        apiKey: resolveApiKey(context, config, event, apiKeyResolvementStrategy),
      },
      logger: logger as unknown as Logger,
    };

    return new ApiClient(apiConfig);
  }
}
