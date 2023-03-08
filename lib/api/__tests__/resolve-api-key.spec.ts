import { Context } from 'aws-lambda';
import { ERROR_NO_API_KEY } from '../../constants';
import type { SdkConfig } from '../../config/types';
import { resolveApiKey } from '../resolve-api-key';

describe('resolveApiKey', () => {
  it('should return api key from context (event preset)', () => {
    const context = {
      clientContext: { env: { API_KEY: 'apiKeyFromContext' } },
    } as unknown as Context;
    const config = { api: { api: { apiKey: 'apiKeyFromConfig' } } } as unknown as SdkConfig;
    const event = { client_context: { env: { API_KEY: 'apiKeyFromEvent' } } };

    expect(resolveApiKey(context, config, event)).toBe('apiKeyFromContext');
  });

  it('should return api key from context (event has no context)', () => {
    const context = {
      clientContext: { env: { API_KEY: 'apiKeyFromContext' } },
    } as unknown as Context;
    const config = { api: { api: { apiKey: 'apiKeyFromConfig' } } } as unknown as SdkConfig;
    const event = {};

    expect(resolveApiKey(context, config, event)).toBe('apiKeyFromContext');
  });

  it('should return api key from context (no event passed)', () => {
    const context = {
      clientContext: { env: { API_KEY: 'apiKeyFromContext' } },
    } as unknown as Context;
    const config = { api: { api: { apiKey: 'apiKeyFromConfig' } } } as unknown as SdkConfig;

    expect(resolveApiKey(context, config, undefined)).toBe('apiKeyFromContext');
  });

  it('should return api key from event (no context)', () => {
    const context = {} as unknown as Context;
    const config = { api: { api: { apiKey: 'apiKeyFromConfig' } } } as unknown as SdkConfig;
    const event = { client_context: { env: { API_KEY: 'apiKeyFromEvent' } } };

    expect(resolveApiKey(context, config, event)).toBe('apiKeyFromEvent');
  });

  it('should fallback to config', () => {
    const context = {} as unknown as Context;
    const config = { api: { api: { apiKey: 'apiKeyFromConfig' } } } as unknown as SdkConfig;
    const event = {};

    expect(resolveApiKey(context, config, event)).toBe('apiKeyFromConfig');
  });
  it('should throw error', () => {
    const context = {} as unknown as Context;
    const config = { api: { api: {} } } as unknown as SdkConfig;
    const event = {};

    expect(() => resolveApiKey(context, config, event)).toThrow(ERROR_NO_API_KEY);
  });
});
