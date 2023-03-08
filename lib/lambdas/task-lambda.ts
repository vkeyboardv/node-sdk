import { Context } from 'aws-lambda';
import { RequestError } from 'got/dist/source';
import { ApiClient } from '../api/api-client';
import { ERROR_TASK_API_VERSION } from '../constants';
import { ApiKeyResolvingStrategy, LoggerFormat, TaskState, TaskStatus } from '../enums';
import { TaskEvent } from '../models/task';
import { StatelessContext } from '../context/stateless-context';
import { GenericLambda } from './generic-lambda';
import { isTask } from './guards';
import {
  GenericLambdaOptions,
  PostProcessArgs,
  ProcessArgs,
  ProcessFn,
  Task,
  TaskApiBody,
  TaskLambdaConfig,
  TaskLambdaEvent,
  TaskResult,
} from './interfaces';
import { LambdaError } from './lambda-error';

export const DEFAULT_TASK_CONFIG: TaskLambdaConfig = {
  apiKeyResolvementStrategy: ApiKeyResolvingStrategy.Fallback,
  swallowErrors: false,
  throwOnProcessed: true,
  logFormat: LoggerFormat.Text,
};

const isRequestError = (err: unknown): err is RequestError => !!(err as RequestError).options;

export class TaskLambda<TProperties = unknown, TPayload = unknown> extends GenericLambda<
  TaskLambdaEvent,
  Task<TProperties, TPayload>,
  TPayload,
  TaskLambdaConfig
> {
  client(event: Task<TProperties, TPayload>): TaskEvent<TProperties> {
    return new TaskEvent<TProperties>(event);
  }

  constructor(
    opts: GenericLambdaOptions<
      ProcessFn<Task<TProperties, TPayload>, TPayload, StatelessContext>,
      Partial<TaskLambdaConfig>,
      (event: Task<TProperties, TPayload>, context: Context) => Promise<StatelessContext>
    >,
    private getApiClient: (context: Context) => ApiClient,
  ) {
    super({
      ...opts,
      configuration: {
        ...DEFAULT_TASK_CONFIG,
        ...opts.configuration,
      },
    });
  }

  /**
   * Get task info by id
   * @param apiClient
   * @param taskId Corva task id
   */
  async getTaskInfo(apiClient: ApiClient, taskId: string): Promise<Task<TProperties, TPayload>> {
    const resp = await apiClient.request<Task<TProperties, TPayload>>(`v2/tasks/${taskId}`, {
      method: 'GET',
    });

    return resp.body;
  }

  /**
   * Updates task status
   * @param apiClient
   * @param taskId Corva task id
   * @param status Task status
   * @param result Task result object contains data or error
   */
  async updateTaskInfo(
    apiClient: ApiClient,
    taskId: string,
    status: TaskStatus,
    { data, error }: TaskResult,
  ): Promise<Task> {
    this.logger.debug('Update task info', { taskId, status });

    const body: TaskApiBody = {
      payload: {},
    };

    if (data) {
      Object.assign(body.payload, data);
    }

    if (error) {
      body.payload.error = error;
      body.fail_reason = error.message || 'Unknown error';
    }

    const resp = await apiClient.request<Task>(`v2/tasks/${taskId}/${status}`, {
      method: 'PUT',
      json: body,
    });

    return resp.body;
  }

  async preProcess({ event, context }: ProcessArgs<TaskLambdaEvent>): Promise<Task<TProperties, TPayload>[]> {
    this.logger.debug('Task pre process', { event });

    const [{ task_id: taskId, version }] = event;

    if (version !== 2) {
      throw new LambdaError(ERROR_TASK_API_VERSION, { event });
    }

    try {
      const task = await this.getTaskInfo(this.getApiClient(context), taskId);

      this.logger.debug('Got task info', { task });

      if (this.configuration.throwOnProcessed && task.state !== TaskState.Running) {
        throw new Error(`Can't process task with state: ${task.state}`);
      }

      return [task];
    } catch (err) {
      if (!isRequestError(err)) {
        this.logger.error(err as Error);
      }

      throw err;
    }
  }

  async postProcess({
    event: events,
    context,
    data: res,
    error,
  }: PostProcessArgs<Task<TProperties, TPayload> | TaskLambdaEvent, TPayload>): Promise<void> {
    const [event] = events;

    this.logger.debug('Post process', { event, error });

    const state = error ? TaskStatus.Fail : TaskStatus.Success;

    try {
      let id: string;
      let data: unknown;

      if (isTask(event)) {
        id = event.id;
        data = res ? res[0] : undefined;
      } else {
        id = event.task_id;
        data = res;
      }

      const result = await this.updateTaskInfo(this.getApiClient(context), id, state, {
        data,
        error,
      });

      this.logger.debug('Post process succeeded', { event, result });
    } catch (err) {
      if (!isRequestError(err)) {
        this.logger.error(err as Error);
      }
    } finally {
      await super.postProcess({ event: events, context, data: res, error });
    }
  }
}
