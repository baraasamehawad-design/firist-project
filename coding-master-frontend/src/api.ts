const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export interface ApiResult<T> {
  data: T | null;
  error: string | null;
  status: number;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  token?: string;
}

export async function apiService<T>(
  path: string,
  options: RequestOptions = {}
): Promise<ApiResult<T>> {
  const { method = "GET", body, token } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const resp = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      const message: string = (data as { error?: string }).error ?? "Request failed";
      console.error(`[API] ${method} ${path} → ${resp.status}`, message);
      return { data: null, error: message, status: resp.status };
    }

    return { data: data as T, error: null, status: resp.status };
  } catch (err) {
    console.error(`[API] ${method} ${path} → network error`, err);
    return { data: null, error: "Network error — server unreachable", status: 0 };
  }
}
