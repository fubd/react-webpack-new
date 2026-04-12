import {notification} from 'antd';

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

export async function request<T>(url: string, init?: RequestInit): Promise<ApiResponse<T>> {
  let result: ApiResponse<T>;

  try {
    const response = await fetch(url, {
      method: 'POST',
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });

    if (!response.ok) {
      let message = `Request failed (${response.status})`;
      try {
        const body = await response.json() as ApiResponse<unknown>;
        if (body.message) message = body.message;
      } catch {/* ignore */}
      result = {success: false, message};
    } else {
      result = await response.json() as ApiResponse<T>;
    }
  } catch {
    result = {success: false, message: 'Network error'};
  }

  if (!result.success) {
    notification.error({message: 'Request Error', description: result.message});
  }

  return result;
}
