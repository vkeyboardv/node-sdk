import { DEFAULT_END_OF_LINE, LOGGER_KEYS, MESSAGE_KEY, TIMESTAMP_KEY } from './constants';
import { levels as LEVELS } from 'pino';
import stringifySafe from 'fast-safe-stringify';

import { sep } from 'path';
import { LevelMapping } from 'pino';

export type LogRecord = Record<string, string | number> & {
  timestamp?: number;
  app_connection?: number;
  request_id?: string;
  asset_id?: string;
  stack?: string;
  level?: number;
};

export const formatLevel = ({
  log,
  levels = LEVELS,
}: {
  log: LogRecord;
  levels?: LevelMapping;
}): string | undefined => {
  if ('level' in log === false) {
    return;
  }

  return (levels.labels[log.level] || log.level.toString()).toUpperCase();
};

export const formatAsset = ({ log }: { log: LogRecord }): string | undefined => {
  if (!log.asset_id) {
    return;
  }

  return `ASSET=${log.asset_id}`;
};

export const formatAppConnection = ({ log }: { log: LogRecord }): string | undefined => {
  if (!log.app_connection) {
    return;
  }

  return `AC=${log.app_connection}`;
};

export const formatRequestId = ({ log }: { log: LogRecord }): string | undefined => {
  if (!log.request_id) {
    return;
  }

  return log.request_id;
};

export const formatMessage = ({ log, messageKey = MESSAGE_KEY }: { log: LogRecord; messageKey: string }): string => {
  if (messageKey in log === false) {
    return '';
  }

  if (typeof log[messageKey] !== 'string') {
    return '';
  }

  return log[messageKey] as string;
};

const PWD = new RegExp(process.cwd() + sep, 'g');

export const formatObject = ({
  input,
  eol = DEFAULT_END_OF_LINE,
  skipKeys = [],
  excludeLoggerKeys = true,
}: {
  input: LogRecord;
  eol: string;
  skipKeys?: (keyof LogRecord)[];
  excludeLoggerKeys?: boolean;
}): string => {
  const objectKeys = Object.keys(input);
  const keysToIgnore = [...skipKeys];

  if (excludeLoggerKeys === true) {
    keysToIgnore.push(...LOGGER_KEYS);
  }

  const keys = objectKeys.filter((k) => keysToIgnore.includes(k) === false);

  if (!keys.length) {
    return;
  }

  return (
    stringifySafe(
      keys.reduce((acc, key) => {
        acc[key] = input[key];

        return acc;
      }, {} as LogRecord),
    )
      .replace(/\\n {4}/g, ' ')
      .replace(PWD, '') + eol
  );
};

export const formatTime = ({
  log,
  timestampKey = TIMESTAMP_KEY,
}: {
  log: LogRecord;
  timestampKey: keyof LogRecord;
}): string => {
  let time: number = null;

  if (timestampKey in log) {
    time = log[timestampKey] as number;
  } else if ('timestamp' in log) {
    time = log.timestamp;
  }

  if (time === null) {
    return;
  }

  return new Date(time).toISOString();
};
