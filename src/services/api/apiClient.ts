/**
 * SALE PAINT — API CLIENT
 * Secure HTTP communication layer between UI and Cloudflare/Supabase Gateway.
 * Attaches Firebase ID tokens for authorization without leaking secrets.
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

    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const idToken = await currentUser.getIdToken();
        headers['Authorization'] = `Bearer ${idToken}`;
      } else {
        // Transitional session bearer for offline or pre-authenticated kiosk mode
        const cachedEmail = localStorage.getItem('nippon_user_email') || 'kiosk@nipponpaint.co.th';
        headers['Authorization'] = `Bearer ${cachedEmail}`;
      }
    } catch {
      headers['Authorization'] = `Bearer kiosk-session`;
    }

    return headers;
  }

  static async get<T = any>(endpoint: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
    try {
      const url = new URL(`${API_BASE}${endpoint}`, window.location.origin);
      if (params) {
        Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
      }

      const headers = await this.getAuthHeaders();
      const res = await fetch(url.toString(), { credentials: 'same-origin', headers, method: 'GET' });
      const body = await res.json();

      if (!res.ok) {
        throw new Error(body?.error?.message || `HTTP ${res.status}: Failed to fetch ${endpoint}`);
      }

      return body;
    } catch (err: any) {
      console.warn(`[ApiClient] GET ${endpoint} error:`, err.message);
      return {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: err.message,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  static async post<T = any>(
    endpoint: string,
    payload: any,
    idempotencyKey?: string
  ): Promise<ApiResponse<T>> {
    try {
      const customHeaders: Record<string, string> = {};
      if (idempotencyKey) {
        customHeaders['X-Idempotency-Key'] = idempotencyKey;
      }

      const headers = await this.getAuthHeaders(customHeaders);
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error?.message || `HTTP ${res.status}: Failed to POST ${endpoint}`);
      }

      return body;
    } catch (err: any) {
      console.warn(`[ApiClient] POST ${endpoint} error:`, err.message);
      return {
        success: false,
        error: {
          code: 'POST_ERROR',
          message: err.message,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  static async put<T = any>(endpoint: string, payload: any): Promise<ApiResponse<T>> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error?.message || `HTTP ${res.status}: Failed to PUT ${endpoint}`);
      }

      return body;
    } catch (err: any) {
      console.warn(`[ApiClient] PUT ${endpoint} error:`, err.message);
      return {
        success: false,
        error: {
          code: 'PUT_ERROR',
          message: err.message,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  static async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'DELETE',
        headers,
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error?.message || `HTTP ${res.status}: Failed to DELETE ${endpoint}`);
      }

      return body;
    } catch (err: any) {
      console.warn(`[ApiClient] DELETE ${endpoint} error:`, err.message);
      return {
        success: false,
        error: {
          code: 'DELETE_ERROR',
          message: err.message,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }
}
