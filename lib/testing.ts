import { ApiClient } from './api/api-client';
import { ApiHelper } from './api/api-helper';
import { State } from './cache/state';
import { StatefulContext } from './context/stateful-context';
import { StatelessContext } from './context/stateless-context';
import { HandlerContext } from './interfaces';
import { CorvaLogger } from './logger/corva-logger';
import { ScheduledEvent } from './models/scheduled/scheduled';
import { StreamEvent } from './models/stream/stream';
import { TaskEvent } from './models/task';

const notImplemented = () => {
  throw new Error('Not implemented');
};

export const logger = Object.getOwnPropertyNames(CorvaLogger.prototype)
  .filter((name) => name !== 'constructor')
  .reduce((acc, name) => {
    acc[name] = jest.fn();

    return acc;
  }, {} as jest.Mocked<StatelessContext['logger']>);

export const api = Object.getOwnPropertyNames(ApiClient.prototype)
  .concat(Object.getOwnPropertyNames(ApiHelper.prototype))
  .filter((name) => name !== 'constructor')
  .reduce((acc, name) => {
    acc[name] = jest.fn(notImplemented);

    return acc;
  }, {} as jest.Mocked<StatelessContext['api']>);

export const config: StatelessContext['config'] = {
  key: 'test',
  name: 'test',
  provider: 'test',
  env: 'test',
};

const state = Object.getOwnPropertyNames(State.prototype)
  .filter((name) => name !== 'constructor')
  .reduce((acc, name) => {
    acc[name] = jest.fn();

    return acc;
  }, {} as jest.Mocked<StatefulContext['cache']>);

interface AppRunner {
  <TProperties, TResult>(
    handler: (event: TaskEvent<TProperties>, context: StatelessContext) => TResult,
    event: TaskEvent<TProperties>,
    secrets?: HandlerContext['secrets'],
  ): TResult;
  <TEvent extends StreamEvent<any, any>, TResult>(
    handler: (event: TEvent, context: StatefulContext) => TResult,
    event: TEvent,
    secrets?: HandlerContext['secrets'],
  ): TResult;
  <TEvent extends ScheduledEvent, TResult>(
    handler: (event: TEvent, context: StatefulContext) => TResult,
    event: TEvent,
    secrets?: HandlerContext['secrets'],
  ): TResult;
}

/**
 * Unit test helper to run user defined handler
 * @param handler App handler
 * @param event Event to be passed to the handler
 * @param secrets Optional secrets to be passed to the handler
 * @returns Result of the handler call
 */
export const app_runner: AppRunner = <TEvent extends { asset_id: number }, TResult>(
  handler: (event: TEvent, context: any) => TResult,
  event: TEvent,
  secrets?: HandlerContext['secrets'],
): TResult => {
  if (event instanceof TaskEvent) {
    return handler(event, new StatelessContext(api, logger, config, secrets));
  }

  return handler(event, new StatefulContext(api, logger, config, state, secrets));
};
