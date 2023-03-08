import { DataType } from '../../enums';
import type { ApiCompanyDto, GetAssetResponseBody } from '../interfaces';

export class Company {
  public readonly type = DataType.Company;

  constructor(public readonly id: string, public readonly attributes: Omit<ApiCompanyDto['attributes'], 'id'>) {}

  static fromCompanyApi(input: ApiCompanyDto): Company {
    return new Company(input.id, input.attributes);
  }

  static fromGetAssetResponseBody(body: GetAssetResponseBody): Company | undefined {
    const id = body.data.relationships.company?.data?.id;

    if (!id) {
      return;
    }

    const dto = body.included?.find((record) => record.type === DataType.Company && record.id === id) as ApiCompanyDto;

    if (!dto) {
      return;
    }

    return Company.fromCompanyApi(dto);
  }
}
