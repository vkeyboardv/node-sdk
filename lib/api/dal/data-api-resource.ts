import type { ApiHelper } from '../api-helper';
import { RemoveFromCollectionResponseBody } from '../interfaces';

export abstract class DataApiResource<TData, TRemoveResponse = RemoveFromCollectionResponseBody> {
  /**
   * @internal
   */
  protected removed = false;
  /**
   * @internal
   */
  readonly id: string;

  /**
   * @internal
   */
  constructor(protected client: ApiHelper, protected path: string, protected _instance: TData = null) {
    this.id = path.split('/').filter(Boolean).pop();
  }

  protected set instance(instance: TData) {
    this._instance = instance;
  }

  get instance() {
    return this._instance;
  }

  /**
   * Load API resource
   */
  async get(): Promise<TData> {
    this._guardRemoved();

    this.instance = await this.client.unwrappedRequest<TData>(this.path);

    return this.instance;
  }

  /**
   * Remove API resource
   */
  async remove() {
    this._guardRemoved();

    const result = await this.client.unwrappedRequest<TRemoveResponse>(this.path, {
      method: 'DELETE',
    });

    this.removed = true;

    return result;
  }

  /**
   * @internal
   */
  protected identity() {
    return `${this.constructor.name}#${this.id}`;
  }

  /**
   * @internal
   */
  protected _guardRemoved() {
    if (!this.removed) {
      return;
    }

    throw new Error(`${this.identity()} already removed`);
  }

  /**
   * @internal
   */
  protected async _preload() {
    if (!this.instance) {
      await this.get();
    }
  }

  /**
   * @internal
   */
  protected async _ensure() {
    this._guardRemoved();

    await this._preload();
  }
}
