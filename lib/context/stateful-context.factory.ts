import type { StreamLambdaEvent, ScheduledLambdaEvent, RawStreamLambdaEvent } from '../lambdas/interfaces';
import type { ContextCreationOpts } from '../interfaces';
import { CorvaDataSource } from '../api/corva-data-source';
import { SecretsManager } from '../secrets/secrets-manager';
import { StatefulContext } from './stateful-context';
import { StateFactory } from '../cache/state.factory';

export class StatefulContextFactory {
  /**
   * @internal
   */
  public static async create(
    opts: ContextCreationOpts<
      ScheduledLambdaEvent<unknown> | StreamLambdaEvent<unknown>,
      RawStreamLambdaEvent<unknown> | ScheduledLambdaEvent<unknown>
    >,
  ): Promise<StatefulContext> {
    opts.logger.setAssetId(opts.event.asset_id);
    opts.logger.setAppConnection(opts.event.app_connection);

    const api = CorvaDataSource.setup(opts);
    const cache = StateFactory.setup(opts);
    const secrets = await new SecretsManager(api, opts.config.app.key, opts.config.secrets.expiry).load(opts.event);

    return new StatefulContext(api, opts.logger, opts.config.app, cache, secrets);
  }
}
