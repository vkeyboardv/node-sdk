import type { AppConfig } from '../interfaces';
import type { State } from '../cache/state';
import type { CorvaDataSource } from '../api/corva-data-source';
import type { CorvaLogger } from '../logger/corva-logger';
import { StatelessContext } from './stateless-context';

export class StatefulContext extends StatelessContext {
  /**
   * @internal
   */
  constructor(
    public readonly api: CorvaDataSource,
    public readonly logger: CorvaLogger,
    public readonly config: AppConfig,
    public readonly cache: State,
    public readonly secrets?: void | Record<string, string>,
  ) {
    super(api, logger, config, secrets);
  }
}
