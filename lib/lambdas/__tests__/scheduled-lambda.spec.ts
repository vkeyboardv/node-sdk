import { Context } from 'aws-lambda';
import { StatefulContext } from '../../context/stateful-context';
import { SchedulerType } from '../../enums';
import { CorvaLogger } from '../../logger/corva-logger';
import type { ScheduledLambdaEvent } from '../interfaces';
import { DEFAULT_SCHEDULED_CONFIG, ScheduledLambda } from '../scheduled-lambda';

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

const createContext = () => Promise.resolve({} as unknown as StatefulContext);

describe('Scheduled lambda', () => {
  const apiClient: any = {
    request: jest.fn().mockReturnValue(Promise.resolve({ body: {} })),
  };

  describe('event status updates', () => {
    const process = jest.fn();

    beforeEach(() => {
      process.mockReset();
    });

    describe('enabled in config', () => {
      const sl = new ScheduledLambda(
        {
          process,
          logger,
          configuration: { updateStatus: true, swallowErrors: false },
          createContext,
        },
        () => apiClient,
      );

      describe('natural time', () => {
        const event = {
          schedule: 1,
          scheduler_type: SchedulerType.NaturalTime,
        };

        it('updates scheduler status on success', async () => {
          process.mockResolvedValue({ test: 'test' });

          await expect(
            sl.run(event as unknown as ScheduledLambdaEvent<unknown>, {} as unknown as Context),
          ).resolves.toMatchObject([
            {
              test: 'test',
            },
          ]);

          expect(apiClient.request).toHaveBeenCalledWith(`scheduler/${event.schedule}/completed`, {
            json: {},
            method: 'POST',
          });
          expect(logger.error).not.toHaveBeenCalled();
        });

        it('updates scheduler status on error', async () => {
          const err = new Error('process error');

          process.mockRejectedValue(err);

          await expect(
            sl.run(event as unknown as ScheduledLambdaEvent<unknown>, {} as unknown as Context),
          ).rejects.toMatchObject(err);

          expect(apiClient.request).toHaveBeenCalledWith(`scheduler/${event.schedule}/completed`, {
            json: {},
            method: 'POST',
          });
          expect(logger.error).not.toHaveBeenCalled();
        });
      });

      describe('data time', () => {
        const event = {
          schedule: 1,
          scheduler_type: SchedulerType.DataTime,
        };

        it('updates scheduler status on success', async () => {
          process.mockResolvedValue({ test: 'test' });

          await expect(
            sl.run(event as unknown as ScheduledLambdaEvent<unknown>, {} as unknown as Context),
          ).resolves.toMatchObject([
            {
              test: 'test',
            },
          ]);

          expect(apiClient.request).toHaveBeenCalledWith(`scheduler/${event.schedule}/completed`, {
            json: {},
            method: 'POST',
          });
          expect(logger.error).not.toHaveBeenCalled();
        });

        it("doesn't update scheduler status on error", async () => {
          const err = new Error('process error');

          process.mockRejectedValue(err);

          await expect(
            sl.run(event as unknown as ScheduledLambdaEvent<unknown>, {} as unknown as Context),
          ).rejects.toMatchObject(err);

          expect(apiClient.request).not.toHaveBeenCalledWith(`scheduler/${event.schedule}/completed`, {
            body: {},
            method: 'POST',
          });
          expect(logger.error).not.toHaveBeenCalled();
        });
      });

      describe('depth', () => {
        const event = {
          schedule: 1,
          scheduler_type: SchedulerType.Depth,
        };

        it('updates scheduler status on success', async () => {
          process.mockResolvedValue({ test: 'test' });

          await expect(
            sl.run(event as unknown as ScheduledLambdaEvent<unknown>, {} as unknown as Context),
          ).resolves.toMatchObject([
            {
              test: 'test',
            },
          ]);

          expect(apiClient.request).toHaveBeenCalledWith(`scheduler/${event.schedule}/completed`, {
            json: {},
            method: 'POST',
          });
          expect(logger.error).not.toHaveBeenCalled();
        });

        it("doesn't update scheduler status on error", async () => {
          const err = new Error('process error');

          process.mockRejectedValue(err);

          await expect(
            sl.run(event as unknown as ScheduledLambdaEvent<unknown>, {} as unknown as Context),
          ).rejects.toMatchObject(err);

          expect(apiClient.request).not.toHaveBeenCalledWith(`scheduler/${event.schedule}/completed`, {
            body: {},
            method: 'POST',
          });
          expect(logger.error).not.toHaveBeenCalled();
        });
      });
    });

    describe('disabled in config', () => {
      const sl = new ScheduledLambda(
        {
          process,
          logger,
          configuration: DEFAULT_SCHEDULED_CONFIG,
          createContext,
        },
        () => apiClient,
      );

      it("doesn't update scheduler status when disabled in config for natural time", async () => {
        const event = {
          schedule: 1,
          scheduler_type: SchedulerType.NaturalTime,
        };

        await expect(
          sl.run(event as unknown as ScheduledLambdaEvent<unknown>, {} as unknown as Context),
        ).resolves.toEqual([]);

        expect(apiClient.request).not.toHaveBeenCalledWith(`scheduler/${event.schedule}/completed`, {
          body: {},
          method: 'POST',
        });
        expect(logger.error).not.toHaveBeenCalled();
      });

      it("doesn't update scheduler status when disabled in config for data time", async () => {
        const event = {
          schedule: 1,
          scheduler_type: SchedulerType.DataTime,
        };

        await expect(
          sl.run(event as unknown as ScheduledLambdaEvent<unknown>, {} as unknown as Context),
        ).resolves.toEqual([]);

        expect(apiClient.request).not.toHaveBeenCalledWith(`scheduler/${event.schedule}/completed`, {
          body: {},
          method: 'POST',
        });
        expect(logger.error).not.toHaveBeenCalled();
      });

      it("doesn't update scheduler status when disabled in config for depth", async () => {
        const event = {
          schedule: 1,
          scheduler_type: SchedulerType.Depth,
        };

        await expect(
          sl.run(event as unknown as ScheduledLambdaEvent<unknown>, {} as unknown as Context),
        ).resolves.toEqual([]);

        expect(apiClient.request).not.toHaveBeenCalledWith(`scheduler/${event.schedule}/completed`, {
          body: {},
          method: 'POST',
        });
        expect(logger.error).not.toHaveBeenCalled();
      });
    });
  });

  test('updates scheduler status multiple times', async () => {
    const process = jest.fn().mockResolvedValue({ test: 'test' });
    const sl = new ScheduledLambda(
      {
        process,
        logger,
        configuration: { updateStatus: true, swallowErrors: false },
        createContext,
      },
      () => apiClient,
    );
    const event = [
      {
        schedule: 1,
        scheduler_type: SchedulerType.NaturalTime,
      },
      {
        schedule: 2,
        scheduler_type: SchedulerType.NaturalTime,
      },
    ];

    await expect(
      sl.run(event as unknown as ScheduledLambdaEvent<unknown>, {} as unknown as Context),
    ).resolves.toMatchObject([
      {
        test: 'test',
      },
      {
        test: 'test',
      },
    ]);

    expect(apiClient.request).toHaveBeenCalledTimes(2);
    expect(process).toHaveBeenCalledTimes(2);
    expect(logger.error).not.toHaveBeenCalled();
  });

  test('updates scheduler status multiple times with nested events', async () => {
    const process = jest.fn().mockResolvedValue({ test: 'test' });
    const sl = new ScheduledLambda(
      {
        process,
        logger,
        configuration: { updateStatus: true, swallowErrors: false },
        createContext,
      },
      () => apiClient,
    );
    const event = [
      [
        {
          schedule: 1,
          scheduler_type: SchedulerType.NaturalTime,
        },
        {
          schedule: 2,
          scheduler_type: SchedulerType.NaturalTime,
        },
      ],
      [
        {
          schedule: 3,
          scheduler_type: SchedulerType.NaturalTime,
        },
      ],
      [
        {
          schedule: 4,
          scheduler_type: SchedulerType.NaturalTime,
        },
        {
          schedule: 5,
          scheduler_type: SchedulerType.NaturalTime,
        },
        {
          schedule: 6,
          scheduler_type: SchedulerType.NaturalTime,
        },
      ],
    ];

    await expect(
      sl.run(event as unknown as ScheduledLambdaEvent<unknown>, {} as unknown as Context),
    ).resolves.toMatchObject([
      {
        test: 'test',
      },
      {
        test: 'test',
      },
      {
        test: 'test',
      },
      {
        test: 'test',
      },
      {
        test: 'test',
      },
      {
        test: 'test',
      },
    ]);

    expect(apiClient.request).toHaveBeenCalledTimes(6);
    expect(process).toHaveBeenCalledTimes(6);
    expect(logger.error).not.toHaveBeenCalled();
  });
});
