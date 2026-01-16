import { getToken } from "./auth";

const BASE_URL = process.env.REACT_APP_BASE_URL || "";

interface FetchClientOptions extends RequestInit {
  token?: string | null;
}

export const fetchClient = async (
  endpoint: string,
  { token, headers, ...customConfig }: FetchClientOptions = {}
) => {
  // 1. Resolve Token: Use provided token or fallback to storage
  const accessToken = token !== undefined ? token : getToken();

  // 2. Default Headers
  const defaultHeaders: HeadersInit = {};
  
  // Only set Content-Type if body is NOT FormData
  if (!(customConfig.body instanceof FormData)) {
    defaultHeaders["Content-Type"] = "application/json";
  }

  if (accessToken) {
    defaultHeaders["Authorization"] = `Bearer ${accessToken}`;
  }

  // 3. Merge Headers
  const config: RequestInit = {
    ...customConfig,
    headers: {
      ...defaultHeaders,
      ...headers,
    },
  };

  // 4. Handle leading slash in endpoint to avoid double slashes
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  // 5. Execute Fetch
  const response = await fetch(`${BASE_URL}${cleanEndpoint}`, config);
  return response;
};
