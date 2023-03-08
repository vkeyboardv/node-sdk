import { KEY_SEPARATOR } from '../constants';
import { clone } from '../util/clone';
import { runtimeConfig } from './runtime-config';

import type { ValidateFunction } from 'ajv';
import type { SdkConfig } from './types';

/**
 * @internal
 */
export class SdkConfigFactory {
  static lambda(validate: ValidateFunction<SdkConfig>, cnf?: SdkConfig): SdkConfig {
    const result = SdkConfigFactory.runtime(cnf);

    this.fillDefaults(result);

    if (!validate(result)) {
      throw new Error(JSON.stringify(validate.errors));
    }

    return result;
  }

  private static fillDefaults(cnf: SdkConfig): void {
    this.setupAppName(cnf);
    this.setupAppProvider(cnf);
  }

  static runtime(cnf?: SdkConfig): SdkConfig {
    if (cnf) {
      return clone(cnf);
    }

    return clone(runtimeConfig);
  }

  private static setupAppName(cnf: SdkConfig): void {
    if (cnf.app.name) {
      return;
    }

    const [company, name] = cnf.app.key.split(KEY_SEPARATOR);

    cnf.app.name = (name || company).replace(/[-_]/g, ' ');
  }

  private static setupAppProvider(cnf: SdkConfig): void {
    if (cnf.app.provider) {
      return;
    }

    cnf.app.provider = cnf.app.key.split(KEY_SEPARATOR)[0];
  }
}
