import { CorvaDataSource } from '../api/corva-data-source';
import { SecretsManager } from '../secrets/secrets-manager';
import { StatelessContext } from './stateless-context';

import type { ContextCreationOpts } from '../interfaces';
import type { HandlerPayload } from '../lambdas/interfaces';

export class StatelessContextFactory {
  /**
   * @internal
   */
  public static async create<TOriginalEvent = unknown, TPreProcessedEvent = unknown>(
    opts: ContextCreationOpts<HandlerPayload<TPreProcessedEvent, unknown>, TOriginalEvent>,
  ): Promise<StatelessContext> {
    opts.logger.setAssetId(opts.event.asset_id);

    const api = CorvaDataSource.setup(opts);
    const secrets = await new SecretsManager(api, opts.config.app.key, opts.config.secrets.expiry).load(opts.rawEvent);

    return new StatelessContext(api, opts.logger, opts.config.app, secrets);
  }
}
