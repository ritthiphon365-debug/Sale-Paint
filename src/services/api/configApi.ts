/**
 * SALE PAINT — SYSTEM CONFIG API
 * Manages central cloud configurations (Google Sheets, AutoSync, etc.) via API Gateway.
 */

import { ApiClient } from './apiClient';

export class ConfigApi {
  static async getConfig<T = any>(key: string): Promise<T | null> {
    const res = await ApiClient.get<any>(`/config/${key}`);
    if (res.success && res.config?.value) {
      return res.config.value as T;
    }
    return null;
  }

  static async setConfig(key: string, value: any) {
    return ApiClient.put(`/config/${key}`, { value });
  }
}
