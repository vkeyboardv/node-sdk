import { Base } from './base';

/**
 * Task event data.
 */
export class TaskEvent<T = unknown> extends Base {
  constructor(data: { asset_id: number; company_id: number; properties: T }) {
    super(data);
  }
  /**
   * asset id.
   */
  asset_id: number;
  /**
   * company id.
   */
  company_id: number;
  /**
   * custom task data.
   */
  properties: T;
}
