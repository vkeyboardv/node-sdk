import { CorvaApi } from '../api/interfaces';

export class SecretsManager {
  private timeout: number;

  constructor(private api: CorvaApi, private appKey: string, timeout: number) {
    this.timeout = timeout * 1000;
  }

  async load({ has_secrets }: { has_secrets?: boolean }): Promise<Record<string, string>> {
    if (!has_secrets) {
      return;
    }

    if (!SecretsManager.settledTime || Date.now() - SecretsManager.settledTime > this.timeout) {
      const { body } = await this.api.request<Record<string, string>>('v2/apps/secrets/values', {
        searchParams: { app_key: this.appKey },
      });

      SecretsManager.secrets = body;
      SecretsManager.settledTime = Date.now();
    }

    return SecretsManager.secrets;
  }

  static secrets: Record<string, string>;
  static settledTime: number;
}
