/* eslint-disable @typescript-eslint/unbound-method */
import { Context } from 'aws-lambda';
import { ApiClient } from '../../api/api-client';
import { CorvaLogger } from '../../';
import { StatelessContext } from '../../context/stateless-context';
import { DEFAULT_TASK_CONFIG, TaskLambda } from '../task-lambda';
import { ERROR_TASK_API_VERSION } from '../../constants';
import { TaskState } from '../../enums';

const logger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn(),
  trace: jest.fn(),
  once: jest.fn(),
} as unknown as CorvaLogger;

beforeEach(() => {
  jest.clearAllMocks();
});

const createContext = () => Promise.resolve({} as unknown as StatelessContext);

describe('Task lambda', () => {
  const apiClient = {
    request: jest.fn().mockResolvedValue({ body: { id: 1, state: TaskState.Running } }),
  } as unknown as ApiClient;

  test('process with no result', async () => {
    const process = jest.fn();
    const tl = new TaskLambda({ process, logger, createContext, configuration: DEFAULT_TASK_CONFIG }, () => apiClient);
    const event = { task_id: '1', version: 2 };

    await expect(tl.run(event, {} as unknown as Context)).resolves.toEqual([]);
    expect(logger.error).not.toHaveBeenCalled();
    expect(apiClient.request).toHaveBeenCalledWith(`v2/tasks/${event.task_id}`, { method: 'GET' });
    expect(apiClient.request).toHaveBeenCalledWith(`v2/tasks/${event.task_id}/success`, {
      json: { payload: {} },
      method: 'PUT',
    });
  });

  test('process with result', async () => {
    const process = jest.fn().mockResolvedValue({ data: { foo: 'bar' }, state: TaskState.Running });
    const tl = new TaskLambda({ process, logger, createContext, configuration: DEFAULT_TASK_CONFIG }, () => apiClient);
    const event = { task_id: '1', version: 2 };

    await expect(tl.run(event, {} as unknown as Context)).resolves.toEqual([
      {
        state: TaskState.Running,
        data: { foo: 'bar' },
      },
    ]);
    expect(logger.error).not.toHaveBeenCalled();
    expect(apiClient.request).toHaveBeenCalledWith(`v2/tasks/${event.task_id}`, { method: 'GET' });
    expect(apiClient.request).toHaveBeenCalledWith(`v2/tasks/${event.task_id}/success`, {
      json: {
        payload: {
          data: {
            foo: 'bar',
          },
          state: TaskState.Running,
        },
      },
      method: 'PUT',
    });
  });

  test('fail with v1 tasks', async () => {
    const process = jest.fn();
    const tl = new TaskLambda({ process, logger, createContext, configuration: DEFAULT_TASK_CONFIG }, () => apiClient);
    const event = { task_id: '1', version: 1 };

    await expect(tl.run(event, {} as unknown as Context)).rejects.toMatchObject(Error(ERROR_TASK_API_VERSION));

    // expect(apiClient.request).toBeCalledWith(`v2/tasks/${event.task_id}`, { method: 'GET' });
    expect(apiClient.request).toHaveBeenCalledWith(`v2/tasks/${event.task_id}/fail`, {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      json: expect.objectContaining({ fail_reason: ERROR_TASK_API_VERSION }),
      method: 'PUT',
    });
  });
});
