import { Context } from 'aws-lambda';
import { ApiClient } from '../api/api-client';
import { StatefulContext } from '../context/stateful-context';
import { ApiKeyResolvingStrategy, LoggerFormat, SchedulerType } from '../enums';
import { ScheduledDataTimeEvent, ScheduledDepthEvent, ScheduledNaturalTimeEvent } from '../models/scheduled/scheduled';
import { ScheduledEventClassFactory } from '../models/scheduled/scheduled-event-class.factory';
import { GenericLambda } from './generic-lambda';
import type {
  GenericLambdaOptions,
  PostProcessArgs,
  ProcessArgs,
  ProcessFn,
  ScheduledLambdaConfig,
  ScheduledLambdaEvent,
} from './interfaces';

export const DEFAULT_SCHEDULED_CONFIG: ScheduledLambdaConfig = {
  updateStatus: true,
  swallowErrors: false,
  apiKeyResolvementStrategy: ApiKeyResolvingStrategy.Fallback,
  vacuumDeleteCount: 3,
  logFormat: LoggerFormat.Text,
};

export class ScheduledLambda<TProperties, TResult> extends GenericLambda<
  ScheduledLambdaEvent<TProperties> | ScheduledLambdaEvent<TProperties>[][],
  ScheduledLambdaEvent<TProperties>,
  TResult,
  ScheduledLambdaConfig,
  StatefulContext
> {
  client(
    event: ScheduledLambdaEvent<TProperties>,
  ): ScheduledDataTimeEvent | ScheduledDepthEvent | ScheduledNaturalTimeEvent {
    return ScheduledEventClassFactory.event(event as any);
  }

  constructor(
    options: GenericLambdaOptions<
      ProcessFn<ScheduledLambdaEvent<TProperties>, TResult, StatefulContext>,
      Partial<ScheduledLambdaConfig>,
      (event: ScheduledLambdaEvent<TProperties>, context: Context) => Promise<StatefulContext>
    >,
    private getApiClient: (context: Context) => ApiClient,
  ) {
    super({
      ...options,
      configuration: { ...DEFAULT_SCHEDULED_CONFIG, ...options.configuration },
    });
  }

  preProcess({ event }: ProcessArgs): Promise<ScheduledLambdaEvent<TProperties>[]> {
    if (Array.isArray(event)) {
      return Promise.resolve<ScheduledLambdaEvent<TProperties>[]>(event.flat());
    }

    return Promise.resolve([event as ScheduledLambdaEvent<TProperties>]);
  }

  /**
   * Updates schedule status
   * @param schedule Event schedule id
   * @param status='completed' Schedule status
   */
  async updateScheduleStatus(apiClient: ApiClient, schedule: number, status = 'completed'): Promise<{ status: 'OK' }> {
    const body = {};

    const resp = await apiClient.request<{ status: 'OK' }>(`scheduler/${schedule}/${status}`, {
      method: 'POST',
      json: body,
    });

    return resp.body;
  }

  async postProcess({
    error,
    event,
    context,
    data,
  }: PostProcessArgs<ScheduledLambdaEvent<TProperties>, TResult>): Promise<void> {
    const normalized = Array.isArray(event) ? event : [event];

    if (this.configuration.updateStatus) {
      const apiClient = this.getApiClient(context);
      const eventsToUpdate = error
        ? normalized.filter((event) => event.scheduler_type === SchedulerType.NaturalTime)
        : normalized;

      await Promise.all(eventsToUpdate.map((event) => this.updateScheduleStatus(apiClient, event.schedule)));
    }

    await super.postProcess({ event: normalized, context, data, error });
  }
}
