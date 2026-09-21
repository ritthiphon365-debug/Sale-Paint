export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    status: number;
    details?: any;
    timestamp: string;
  };
}

export function createErrorResponse(
  message: string,
  status: number = 500,
  code: string = 'INTERNAL_ERROR',
  details?: any
): Response {
  const payload: ApiErrorResponse = {
    success: false,
    error: {
      message,
      code,
      status,
      details,
      timestamp: new Date().toISOString(),
    },
  };

  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
