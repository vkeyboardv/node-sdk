import type { CorvaDataSource } from '../api/corva-data-source';
import type { AppConfig, HandlerContext } from '../interfaces';
import type { CorvaLogger } from '../logger/corva-logger';

export class StatelessContext implements HandlerContext {
  /**
   * @internal
   */
  constructor(
    public readonly api: CorvaDataSource,
    public readonly logger: CorvaLogger,
    public readonly config: AppConfig,
    public readonly secrets?: void | Record<string, string>,
  ) {
    //
  }
}
