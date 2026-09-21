/**
 * SALE PAINT — API CLIENT
 * Production authentication: Firebase ID token during the migration window.
 * No localStorage/session-string fallback is permitted.
 */
import { auth } from '../../lib/firebase';
import { ApiResponse } from './types';

const API_BASE = '/api/v1';

export class ApiClient {
  private static async getAuthHeaders(customHeaders: Record<string, string> = {}): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    const currentUser = auth.currentUser;
    if (!currentUser || currentUser.isAnonymous) {
      throw new Error('AUTHENTICATION_REQUIRED');
    }

    const idToken = await currentUser.getIdToken(true);
    if (!idToken) throw new Error('AUTHENTICATION_REQUIRED');
    headers.Authorization = `Bearer ${idToken}`;
    return headers;
  }

  private static async request<T>(endpoint: string, init: RequestInit): Promise<ApiResponse<T>> {
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, { ...init, credentials: 'same-origin' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error?.message || `HTTP ${res.status}: Request failed`);
      }
      return body;
    } catch (err: any) {
      return { success: false, error: { code: 'API_ERROR', message: err?.message || 'API request failed', timestamp: new Date().toISOString() } };
    }
  }

  static async get<T = any>(endpoint: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
    try {
      const url = new URL(`${API_BASE}${endpoint}`, window.location.origin);
      Object.entries(params || {}).forEach(([k, v]) => url.searchParams.append(k, v));
      const headers = await this.getAuthHeaders();
      return await this.request<T>(url.pathname + url.search, { method: 'GET', headers });
    } catch (err: any) {
      return { success: false, error: { code: 'AUTH_ERROR', message: err?.message || 'Authentication required', timestamp: new Date().toISOString() } };
    }
  }

  static async post<T = any>(endpoint: string, payload: any, idempotencyKey?: string): Promise<ApiResponse<T>> {
    try {
      const headers = await this.getAuthHeaders(idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {});
      return await this.request<T>(endpoint, { method: 'POST', headers, body: JSON.stringify(payload) });
    } catch (err: any) {
      return { success: false, error: { code: 'AUTH_ERROR', message: err?.message || 'Authentication required', timestamp: new Date().toISOString() } };
    }
  }

  static async put<T = any>(endpoint: string, payload: any): Promise<ApiResponse<T>> {
    try {
      const headers = await this.getAuthHeaders();
      return await this.request<T>(endpoint, { method: 'PUT', headers, body: JSON.stringify(payload) });
    } catch (err: any) {
      return { success: false, error: { code: 'AUTH_ERROR', message: err?.message || 'Authentication required', timestamp: new Date().toISOString() } };
    }
  }

  static async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const headers = await this.getAuthHeaders();
      return await this.request<T>(endpoint, { method: 'DELETE', headers });
    } catch (err: any) {
      return { success: false, error: { code: 'AUTH_ERROR', message: err?.message || 'Authentication required', timestamp: new Date().toISOString() } };
    }
  }
}
