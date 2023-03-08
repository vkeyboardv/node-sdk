import { Context } from 'aws-lambda';
import { format } from 'node:util';
import { ERROR_LOG_MESSAGE_ERROR_COUNT_EXCEEDED_EVENT } from '../../lambdas/constants';
import { CorvaLogger } from '../corva-logger';
import { LoggerFormat } from '../../enums';
import { LoggerFactory } from '../logger-factory';

const options = { level: 'trace', thresholds: { messageCount: 100, messageErrorCount: 100, messageSize: 100 } };
const context = { awsRequestId: 'awsRequestId' } as Context;
const logFormat = LoggerFormat.Text; // ! All logs will be printed in json format, pino doesn't support both transports and destination streams
const destStream = { write: jest.fn() };

describe('CorvaLogger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should write message with different log levels', () => {
    const logger = LoggerFactory.create(options, context, logFormat, destStream);

    const message = 'warning message';

    logger.trace(message);
    logger.debug(message);
    logger.info(message);
    logger.warn(message);
    logger.fatal(message);
    logger.error(message);

    expect(destStream.write).toHaveBeenCalledTimes(6);

    const actualLevels = destStream.write.mock.calls.map(([callArg]) => JSON.parse(callArg).level);
    const expectedLevels = [10, 20, 30, 40, 60, 50];

    expect(actualLevels).toEqual(expectedLevels);
  });

  it('should limit messages with log levels', () => {
    const _options = { ...options, level: 'warn' };
    const logger = LoggerFactory.create(_options, context, logFormat, destStream);

    const message = 'warning message';

    logger.trace(message);
    logger.debug(message);
    logger.info(message);
    logger.warn(message);
    logger.error(message);

    expect(destStream.write).toHaveBeenCalledTimes(2);

    const actualLevels = destStream.write.mock.calls.map(([callArg]) => JSON.parse(callArg).level);
    const expectedLevels = [40, 50];

    expect(actualLevels).toEqual(expectedLevels);

    const actualMessages = destStream.write.mock.calls.map(([callArg]) => JSON.parse(callArg).msg);

    expect(actualMessages.every((actualMessage) => actualMessage === message)).toBeTruthy();
  });

  it('should add asset id to messages', () => {
    const logger = LoggerFactory.create(options, context, logFormat, destStream);

    const message = 'warning message';
    const assetId = 123;

    logger.setAssetId(assetId);
    logger.warn(message);

    expect(destStream.write).toHaveBeenCalledTimes(1);

    const {
      level: actualLevel,
      msg: actualMessage,
      asset_id: actualAssetId,
    } = JSON.parse(destStream.write.mock.calls[0]);

    expect(actualLevel).toEqual(40);
    expect(actualMessage).toEqual(message);
    expect(actualAssetId).toEqual(assetId);
  });

  it('should add app connection id to messages', () => {
    const logger = LoggerFactory.create(options, context, logFormat, destStream);

    const message = 'warning message';
    const appConnection = 42;

    logger.setAppConnection(appConnection);
    logger.warn(message);

    expect(destStream.write).toHaveBeenCalledTimes(1);

    const {
      level: actualLevel,
      msg: actualMessage,
      app_connection: actualAppConnection,
    } = JSON.parse(destStream.write.mock.calls[0]);

    expect(actualLevel).toEqual(40);
    expect(actualMessage).toEqual(message);
    expect(actualAppConnection).toEqual(appConnection);
  });

  it('should add some meta as object to the end', () => {
    const logger = LoggerFactory.create(options, context, logFormat, destStream);

    const message = 'warning message';
    const metadataKey = 'metadata';
    const metadata = { [metadataKey]: { test: [1, 2, 3] } };

    logger.warn(message, metadata);

    expect(destStream.write).toHaveBeenCalledTimes(1);

    const {
      level: actualLevel,
      msg: actualMessage,
      [metadataKey]: actualMetadata,
    } = JSON.parse(destStream.write.mock.calls[0]);

    expect(actualLevel).toEqual(40);
    expect(actualMessage).toEqual(message);
    expect(actualMetadata).toEqual(metadata[metadataKey]);
  });

  it('should accept object', () => {
    const logger = LoggerFactory.create(options, context, logFormat, destStream);

    const messageKey = 'test';
    const message = { [messageKey]: 'warning message' };

    logger.warn(message);

    expect(destStream.write).toHaveBeenCalledTimes(1);

    const { level: actualLevel, [messageKey]: actualMessage } = JSON.parse(destStream.write.mock.calls[0]);

    expect(actualLevel).toEqual(40);
    expect(actualMessage).toEqual(message[messageKey]);
  });

  it('should add some meta as string to the end', () => {
    const logger = LoggerFactory.create(options, context, logFormat, destStream);

    const message = 'warning message';
    const metadata = 'some meta';

    logger.warn(message, metadata);

    expect(destStream.write).toHaveBeenCalledTimes(1);

    const actualResult = JSON.parse(destStream.write.mock.calls[0]);
    const { level: actualLevel, msg: actualMessage } = actualResult;

    const symbolIndexes = metadata.split('').map((symbol) => metadata.indexOf(symbol));

    const actualMetadataStr = symbolIndexes.reduce((acc, idx) => {
      // eslint-disable-next-line no-param-reassign
      acc = acc + actualResult[idx];

      return acc;
    }, '');

    // Message example:
    // {
    //   '0': 's',
    //   '1': 'o',
    //   '2': 'm',
    //   '3': 'e',
    //   '4': ' ',
    //   '5': 'm',
    //   '6': 'e',
    //   '7': 't',
    //   '8': 'a',
    //   level: 40,
    //   time: 1673831331353,
    //   request_id: 'awsRequestId',
    //   msg: 'warning message'
    // }

    expect(actualLevel).toEqual(40);
    expect(actualMessage).toEqual(message);
    expect(actualMetadataStr).toEqual(metadata);
  });

  it('should format messages', () => {
    const logger = LoggerFactory.create(options, context, logFormat, destStream);

    const message = 'warning %d message %s';
    const assetId = 123;
    const appConnection = 42;
    const firstArg = 123;
    const secondArg = 'test';

    logger.setAssetId(assetId);
    logger.setAppConnection(appConnection);
    logger.warn(message, firstArg, secondArg);

    expect(destStream.write).toHaveBeenCalledTimes(1);

    const {
      level: actualLevel,
      msg: actualMessage,
      asset_id: actualAssetId,
      app_connection: actualAppConnection,
    } = JSON.parse(destStream.write.mock.calls[0]);

    expect(actualLevel).toEqual(40);

    const expectedMessage = format(message, firstArg, secondArg);

    expect(actualMessage).toEqual(expectedMessage);

    expect(actualAssetId).toEqual(assetId);
    expect(actualAppConnection).toEqual(appConnection);
  });

  describe('thresholds', () => {
    // * for now it works only for cloudwatch-formatter (unable to test)
    // eslint-disable-next-line jest/no-disabled-tests
    describe.skip('messageLength', () => {
      it('should cut meta from the end', () => {
        const _options = { ...options, thresholds: { ...options.thresholds, messageSize: 5 } };
        const logger = LoggerFactory.create(_options, context, logFormat, destStream);

        const message = 'warning message';

        logger.warn(message);

        expect(destStream.write).toHaveBeenCalledTimes(1);
      });
    });

    describe('messageCount', () => {
      it('should make a warning message on threshold exceed', () => {
        const _options = { ...options, thresholds: { ...options.thresholds, messageCount: 1 } };
        const logger = LoggerFactory.create(_options, context, logFormat, destStream);

        const message = 'warning message';

        logger.warn(message);

        expect(destStream.write).toHaveBeenCalledTimes(2);

        const actualResults = destStream.write.mock.calls.map((call) => JSON.parse(call));

        expect(actualResults[0].msg).toEqual(message);

        const expectedWarnMessage = 'Exceeded logging threshold per invoke';

        expect(actualResults[1].msg).toEqual(expectedWarnMessage);
      });

      it('should not call logger after threshold exceeded', () => {
        const _options = { ...options, thresholds: { ...options.thresholds, messageCount: 1 } };
        const logger = LoggerFactory.create(_options, context, logFormat, destStream);

        const message = 'warning message';

        logger.warn(message);
        logger.warn(message);
        logger.warn(message);
        logger.warn(message);

        expect(destStream.write).toHaveBeenCalledTimes(2);
      });
    });

    describe('messageErrorCount', () => {
      it('should make a warning message on threshold exceed', () => {
        const _options = { ...options, thresholds: { ...options.thresholds, messageErrorCount: 1 } };
        const logger = LoggerFactory.create(_options, context, logFormat, destStream);

        const message = 'error message';

        logger.error(message);

        expect(destStream.write).toHaveBeenCalledTimes(2);

        const actualResults = destStream.write.mock.calls.map((call) => JSON.parse(call));

        expect(actualResults[0].msg).toEqual(message);

        const expectedWarnMessage = 'Exceeded logging threshold per invoke';

        expect(actualResults[1].msg).toEqual(expectedWarnMessage);
      });

      it('should not call logger after threshold exceeded', () => {
        const _options = { ...options, thresholds: { ...options.thresholds, messageErrorCount: 1 } };
        const logger = LoggerFactory.create(_options, context, logFormat, destStream);

        const message = 'error message';

        logger.error(message);
        logger.error(message);
        logger.error(message);
        logger.error(message);

        expect(destStream.write).toHaveBeenCalledTimes(2);
      });

      it(`should emit ${ERROR_LOG_MESSAGE_ERROR_COUNT_EXCEEDED_EVENT} event after threshold exceeded`, () => {
        jest.spyOn(CorvaLogger.prototype, 'emit');

        const _options = { ...options, thresholds: { ...options.thresholds, messageErrorCount: 1 } };
        const logger = LoggerFactory.create(_options, context, logFormat, destStream);

        const message = 'error message';

        logger.error(message);
        logger.error(message);

        expect(CorvaLogger.prototype.emit).toHaveBeenCalledTimes(1);
        expect(CorvaLogger.prototype.emit).toHaveBeenCalledWith(ERROR_LOG_MESSAGE_ERROR_COUNT_EXCEEDED_EVENT);
      });
    });
  });
});
