import { Context } from 'aws-lambda';
import { CorvaLogger } from '../../logger/corva-logger';
import { HandlerContext } from '../../interfaces';
import { GenericLambda } from '../generic-lambda';
import type { GenericLambdaOptions, PostProcessArgs, ProcessArgs } from '../interfaces';
import { DEFAULT_TASK_CONFIG } from '../task-lambda';

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

const createContext = () => Promise.resolve({} as unknown as HandlerContext);

class TestLambda extends GenericLambda<unknown, unknown, unknown> {
  client(event: unknown): unknown {
    return event;
  }
  protected preProcess(args: ProcessArgs<unknown>): Promise<unknown[]> {
    return Promise.resolve([args.event]);
  }
}

describe('Generic Lambda', () => {
  test('fails when process is not implemented', async () => {
    const gl = new TestLambda({ logger, createContext, configuration: DEFAULT_TASK_CONFIG });

    await expect(gl.run({}, {} as unknown as Context)).rejects.toMatchObject(Error('Process function not implemented'));
  });

  describe('inheritance', () => {
    class SpecificLambda<T = any> extends GenericLambda<T, any, any> {
      client(event: unknown): unknown {
        return event;
      }
      private preProc: any;
      private postProc: any;
      constructor({
        preProc,
        postProc,
        ...options
      }: GenericLambdaOptions<any, any, any> & { preProc: any; postProc: any }) {
        super(options);
        this.preProc = preProc;
        this.postProc = postProc;
      }
      async preProcess(options: ProcessArgs<T>) {
        return this.preProc(options);
      }
      async postProcess(options: PostProcessArgs<T, any>) {
        this.postProc(options);
        await super.postProcess(options);
      }
    }

    test('all steps are called', async () => {
      const preProc = jest.fn((a) => [a.event]);
      const postProc = jest.fn();
      const process = jest.fn();
      const event = { foo: 'bar' };
      const sl = new SpecificLambda({
        preProc,
        postProc,
        logger,
        process,
        createContext,
        configuration: DEFAULT_TASK_CONFIG,
      });

      await expect(sl.run(event, {} as unknown as Context)).resolves.toEqual([]);
      expect(preProc).toHaveBeenCalled();
      expect(postProc).toHaveBeenCalled();
      expect(process).toHaveBeenCalledWith([event], {});
    });

    test('error in preprocess', async () => {
      const preProc = jest.fn().mockImplementation(() => {
        throw Error('Error');
      });
      const postProc = jest.fn();
      const process = jest.fn();
      const sl = new SpecificLambda({
        preProc,
        postProc,
        logger,
        process,
        createContext,
        configuration: DEFAULT_TASK_CONFIG,
      });

      await expect(sl.run({}, {} as unknown as Context)).rejects.toMatchObject(Error('Error'));
      expect(preProc).toHaveBeenCalled();
      expect(postProc).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.objectContaining({ message: 'Error' }) }),
      );
      expect(process).not.toHaveBeenCalled();
    });
  });
});
