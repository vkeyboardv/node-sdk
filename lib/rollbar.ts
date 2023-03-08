import { SdkConfigFactory } from './config/sdk-config';
import { has, get } from 'lodash/fp';
import type { SQSRecord } from 'aws-lambda';
import Rollbar from 'rollbar';

const config = SdkConfigFactory.runtime();

/**
 * @internal
 */
export const rollbar: Rollbar | undefined = config.rollbar.enabled
  ? new Rollbar(
      Object.assign(config.rollbar, {
        transform: (payload: unknown) => {
          if (!has('custom.originalEvent.Records', payload)) return;

          const records = get('custom.originalEvent.Records', payload) as SQSRecord[] | Record<string, SQSRecord>;

          (Array.isArray(records) ? records : Object.values(records)).forEach((record) => {
            // api key is 48 symbols in general, but let's assume it can have variable length
            const matches = record.body.match(/(API_KEY|api_key)":"([a-z\d]{32,})"/g);

            if (!matches) {
              return;
            }

            const key = matches[0].match(/[a-z\d]{32,}/)[0];

            record.body = record.body.replace(new RegExp(key, 'g'), key.slice(0, 3) + '***' + key.slice(-3));
          });
        },
      }),
    )
  : undefined;
