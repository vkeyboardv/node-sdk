import { LogDescriptor } from 'pino';
import pretty, { PrettyOptions } from 'pino-pretty';
import * as bourne from '@hapi/bourne';

import { ERROR_LIKE_KEYS, MESSAGE_KEY, TIMESTAMP_KEY } from './constants';
import {
  formatLevel,
  formatMessage,
  formatObject,
  formatTime,
  formatRequestId,
  formatAsset,
  formatAppConnection,
  LogRecord,
} from './utils';
import type { LoggingConfiguration } from './interfaces';

interface ParseError {
  err: Error;
}

interface Parsed<V> {
  value: V;
}

const jsonParser = <V>(input: string): Parsed<V> | ParseError => {
  try {
    return { value: bourne.parse<V>(input, { protoAction: 'remove' }) };
  } catch (err) {
    return { err: err as Error };
  }
};

const hasError = (input: unknown): input is ParseError => !!(input as ParseError).err;

export default function cloudwatchFormatter(opts: PrettyOptions & LoggingConfiguration) {
  const EOL = opts.crlf ? '\r\n' : '\n';
  const multilineDelimiter = '\r';
  const timestampKey = TIMESTAMP_KEY;
  const ignoreKeys = opts.ignore ? new Set(opts.ignore.split(',')) : undefined;
  const multilineRegex = new RegExp(EOL, 'g');
  const endOfLogRegex = new RegExp(`${multilineDelimiter}?${multilineDelimiter}$`);

  return pretty({
    crlf: false,
    errorLikeObjectKeys: ERROR_LIKE_KEYS,
    errorProps: 'context,data',
    levelFirst: false,
    messageKey: MESSAGE_KEY,
    timestampKey: TIMESTAMP_KEY,
    singleLine: true,
    hideObject: true,
    colorize: false,
    ...opts,
    customPrettifiers: {
      time: () => '',
      level: () => '',
    },
    messageFormat: (inputData, messageKey) => {
      let log: LogDescriptor;
      let messageSize = opts.thresholds.messageSize;

      const sliceToLimit = (str: string): string => {
        if (!str || !str.length) {
          return str;
        }

        if (!messageSize) {
          return '';
        }

        if (messageSize >= str.length) {
          messageSize -= str.length;

          return str;
        }

        const result = str.slice(0, messageSize);

        messageSize -= result.length;

        return `${result}...`;
      };

      if (typeof inputData === 'string') {
        const parsed = jsonParser<LogRecord>(inputData);

        if (hasError(parsed)) {
          return `${inputData as string}${EOL}`;
        }

        log = parsed.value;
      } else {
        log = inputData;
      }

      if ([null, true, false].includes(log as unknown as null | boolean) || Number.isFinite(log)) {
        return `${log as unknown as string}${EOL}`;
      }

      if (ignoreKeys) {
        log = Object.keys(log)
          .filter((key) => !ignoreKeys.has(key))
          .reduce((res, key) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            res[key] = log[key];

            return res;
          }, {} as Record<string, any>);
      }

      const formattedLevel = formatLevel({
        log,
      });
      const formattedMessage = sliceToLimit(formatMessage({ log, messageKey }));
      const formattedTime = formatTime({ log, timestampKey });

      const parts = [];

      if (formattedTime) {
        parts.push(formattedTime);
      }

      const requestId = formatRequestId({ log });

      if (requestId) {
        parts.push(requestId);
      }

      if (formattedLevel) {
        parts.push(formattedLevel);
      }

      const assetId = formatAsset({ log });

      if (assetId) {
        parts.push(assetId);
      }

      const appConnection = formatAppConnection({ log });

      if (appConnection) {
        parts.push(appConnection);
      }

      if (formattedMessage) {
        parts.push('|');
        parts.push(formattedMessage);
      }

      const skipKeys = ['asset_id', 'request_id', 'app_connection'];

      if (typeof log[messageKey] === 'string') {
        skipKeys.push(messageKey);
      }

      const formattedObject = sliceToLimit(
        formatObject({
          input: log,
          skipKeys,
          eol: EOL,
        }),
      );

      if (formattedObject) {
        parts.push('|', formattedObject);
      }

      const line = parts.join(' ') + EOL;

      // Cloudwatch specific hacks
      return line.replace(multilineRegex, multilineDelimiter).replace(endOfLogRegex, '\n');
    },
  });
}
