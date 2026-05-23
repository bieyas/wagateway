export interface WablasResponse<T = any> {
  status: boolean;
  message: string;
  data: T;
}

export function successResponse<T>(data: T, message = 'success'): WablasResponse<T> {
  return { status: true, message, data };
}

export function errorResponse(message: string, data: any = null): WablasResponse {
  return { status: false, message, data };
}
