/* eslint-disable camelcase */
import { DataType } from '../../enums';
import type { ApiAssetDto, GetAssetResponseBody } from '../interfaces';
import { Company } from './company';

export class Asset {
  public readonly type = DataType.Asset;

  constructor(
    public readonly id: string,
    public readonly attributes: ApiAssetDto['attributes'],
    public readonly company?: Company,
    public readonly parent_asset?: Asset,
    public readonly active_child?: Asset,
    public readonly children?: ReadonlyArray<Asset>,
  ) {}

  static fromGetAssetResponseBody(body: GetAssetResponseBody): Asset {
    const company = Company.fromGetAssetResponseBody(body);
    const parentAsset = Asset.fromIncluded(body, body.data.relationships.parent_asset?.data?.id);
    const activeChild = Asset.fromIncluded(body, body.data.relationships.active_child?.data?.id);
    const children =
      body.data.relationships.children?.data?.map(({ id }) => Asset.fromIncluded(body, id)).filter(Boolean) || [];

    return new Asset(body.data.id, body.data.attributes, company, parentAsset, activeChild, children);
  }

  static fromIncluded(body: GetAssetResponseBody, id: string): Asset | undefined {
    if (!id) {
      return;
    }

    const dto = body.included.find((record) => record.type === DataType.Asset && record.id === id);

    if (!dto) {
      return;
    }

    return new Asset(dto.id, dto.attributes);
  }
}
