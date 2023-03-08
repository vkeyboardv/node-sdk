export abstract class Base {
  /**
   * @internal
   */
  constructor(data: unknown, originalEvent = {}) {
    Object.assign(this, originalEvent, data);
  }
}

export type Rerun = {
  id: number;
  range: { start: number; end: number };
  invoke: number;
  total: number;
};
