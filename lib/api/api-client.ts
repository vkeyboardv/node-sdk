import Bottleneck from 'bottleneck';
import got, { CancelableRequest, Got, GotStream, Options, OptionsOfJSONResponseBody, Response } from 'got';
import merge from 'merge-options';
import type { ApiClientOptions, Logger } from './interfaces';

const DEFAULTS: Omit<ApiClientOptions, 'logger'> = {
  limits: {
    maxConcurrent: 5,
    minTime: 10,
    reservoir: 250,
    reservoirRefreshAmount: 250,
    reservoirRefreshInterval: 1000,
  },
  api: {
    prefixUrl: '',
    prefixDataUrl: '',
    appKey: '',
    apiKey: '',
  },
  requestOptions: {
    method: 'GET',
    retry: 10,
    responseType: 'json',
  },
  stats: {
    tracking: {
      largeRequest: false,
      slowRequest: true,
      retries: true,
    },
    retryCount: 3,
    slowRequest: 5 * 1000, // 2s
    largeRequest: 5 * 1024, // 5kB
  },
};

/**
 * Nodejs Corva API client with throttling.
 * 
```
 */
export class ApiClient {
  private options: ApiClientOptions;
  private _raw: Got = got;
  private instance: Got;
  private _stream: GotStream;
  private rateLimiter?: Bottleneck;
  private _request: Got;
  private logger: Logger;

  constructor(options: Partial<ApiClientOptions> = DEFAULTS) {
    if (!options.logger) {
      throw new Error('Please provide logger instance');
    }

    this.options = merge(DEFAULTS, options) as ApiClientOptions;
    this.instance = got.extend(
      merge(
        {
          headers: {
            Authorization: `API ${this.options.api.apiKey}`,
            'X-Corva-App': this.options.api.appKey,
          },
        },
        this.options.requestOptions,
      ) as OptionsOfJSONResponseBody,
    );
    this._stream = this.instance.stream;

    if (this.options.limits) {
      this.rateLimiter = new Bottleneck(this.options.limits);
      this._request = this.rateLimiter.wrap(this.instance) as unknown as Got;
    } else {
      this._request = this.instance;
    }

    this.logger = options.logger;
  }

  async request<T = any>(path: string, options: Options = {}): Promise<CancelableRequest<Response<T>>> {
    const response = await this._request<T>(
      path,
      merge(
        {
          prefixUrl: this.prefixUrl(path),
        },
        options,
      ) as OptionsOfJSONResponseBody,
    );

    this.logger.debug(
      `Request timing | ${path} | ${JSON.stringify(options.searchParams)} | ${response.timings.phases.total}ms`,
    );

    if (this.options.stats.tracking.largeRequest) {
      const dataSize = Buffer.isBuffer(response.body)
        ? response.body.byteLength
        : typeof response.body === 'string'
        ? Buffer.from(response.body).byteLength
        : Buffer.from(JSON.stringify(response.body)).byteLength;

      if (dataSize > this.options.stats.largeRequest) {
        this.logger.info(`Large request | ${path} | ${dataSize}b | ${JSON.stringify(options)}`);
      }
    }

    if (this.options.stats.tracking.slowRequest) {
      if (response.timings.phases.total > this.options.stats.slowRequest) {
        this.logger.info(`Slow request | ${path} | ${response.timings.phases.total}ms | ${JSON.stringify(options)}`);
      }
    }

    if (this.options.stats.tracking.retries) {
      if (response.retryCount > this.options.stats.retryCount) {
        this.logger.info(`Retried request | ${path} | ${response.retryCount} | ${JSON.stringify(options)}`);
      }
    }

    return response;
  }

  stream(path: string, options: Options = {}) {
    return this._stream(path, { ...options, isStream: true });
  }

  get raw() {
    return this._raw;
  }

  async shutdown(options?: Bottleneck.StopOptions): Promise<void> {
    if (!this.rateLimiter) {
      return;
    }

    await this.rateLimiter.stop(options);
  }

  private prefixUrl(path: string) {
    if (/api\/v\d\/(data|message_producer|subscriptions|dataset)/.test(path)) {
      return this.options.api.prefixDataUrl;
    }

    return this.options.api.prefixUrl;
  }
}
