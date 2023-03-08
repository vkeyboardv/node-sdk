import { Context } from 'aws-lambda';
import pino from 'pino';
import { LoggerFormat } from '../../enums';
import { CorvaLogger } from '../corva-logger';
import { LoggerFactory } from '../logger-factory';

jest.mock('../corva-logger');
jest.mock('pino');

const options = { level: 'trace', thresholds: { messageCount: 100, messageErrorCount: 100, messageSize: 100 } };
const context = { awsRequestId: 'awsRequestId' } as Context;
const logFormat = LoggerFormat.Text;
const destStream = { write: jest.fn() };

describe('LoggerFactory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create()', () => {
    it('should create logger with default options', () => {
      const logger = LoggerFactory.create(options, context, logFormat);

      expect(pino).toHaveBeenCalledWith({
        base: {},
        enabled: true,
        level: options.level,
        rollbar: {
          levels: ['error', 'fatal'],
        },
        thresholds: options.thresholds,
        transport: {
          options: {
            level: options.level,
            thresholds: options.thresholds,
          },
          target: './cloudwatch-formatter',
        },
      });

      expect(logger).toBeInstanceOf(CorvaLogger);
      expect(CorvaLogger).toHaveBeenCalledWith(undefined, options.thresholds, context.awsRequestId);
    });

    it('should create logger with text formatter specified', () => {
      const logger = LoggerFactory.create(options, context, logFormat);

      expect(pino).toHaveBeenCalledWith({
        base: {},
        enabled: true,
        level: options.level,
        rollbar: {
          levels: ['error', 'fatal'],
        },
        thresholds: options.thresholds,
        transport: {
          options: {
            level: options.level,
            thresholds: options.thresholds,
          },
          target: './cloudwatch-formatter',
        },
      });

      expect(logger).toBeInstanceOf(CorvaLogger);
      expect(CorvaLogger).toHaveBeenCalledWith(undefined, options.thresholds, context.awsRequestId);
    });

    it('should create logger with json formatter specified', () => {
      const logger = LoggerFactory.create(options, context, LoggerFormat.Json);

      expect(pino).toHaveBeenCalledWith({
        formatters: {
          level: expect.any(Function),
          bindings: expect.any(Function),
          log: expect.any(Function),
        },
        messageKey: 'message',
        timestamp: expect.any(Function),
        base: {},
        enabled: true,
        level: options.level,
        rollbar: {
          levels: ['error', 'fatal'],
        },
        thresholds: options.thresholds,
      });

      expect(logger).toBeInstanceOf(CorvaLogger);
      expect(CorvaLogger).toHaveBeenCalledWith(undefined, options.thresholds, context.awsRequestId);
    });

    it('should create logger without transporters if destination stream was specified', () => {
      const logger = LoggerFactory.create(options, context, logFormat, destStream);

      expect(pino).toHaveBeenCalledWith(
        {
          base: {},
          enabled: true,
          level: options.level,
          rollbar: {
            levels: ['error', 'fatal'],
          },
          thresholds: options.thresholds,
        },
        destStream,
      );

      expect(logger).toBeInstanceOf(CorvaLogger);
      expect(CorvaLogger).toHaveBeenCalledWith(undefined, options.thresholds, context.awsRequestId);
    });
  });
});
