import Ajv from 'ajv';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { SdkConfig } from './types';

export const sdkConfigValidator = new Ajv().compile<SdkConfig>(
  JSON.parse(readFileSync(join(__dirname, 'schema.json'), 'utf8')),
);
