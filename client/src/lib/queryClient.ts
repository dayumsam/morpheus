import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest<T = any>(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  
  // For 204 No Content responses, return an empty object rather than trying to parse JSON
  if (res.status === 204) {
    return {} as T;
  }
  
  return await res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Handle multi-part query keys (like ['/api/tags', tagId, 'notes'])
    let url = queryKey[0] as string;

    // If this is a tag-notes query, construct the URL properly
    if (
      queryKey.length > 2 &&
      queryKey[0] === "/api/tags" &&
      queryKey[2] === "notes"
    ) {
      url = `/api/tags/${queryKey[1]}/notes`;
    }

    const startTime = performance.now();
    console.log(
      `[Query][${new Date().toISOString()}] START request for ${url}`,
    );

    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    
    // Handle 204 No Content responses
    let data = {};
    if (res.status !== 204) {
      data = await res.json();
    }

    const endTime = performance.now();
    console.log(
      `[Query][${new Date().toISOString()}] COMPLETED request for ${url} in ${Math.round(endTime - startTime)}ms`,
      url === "/api/tags" ? `(Found ${data.length} tags)` : "",
    );

    return data;
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true,
      staleTime: 60 * 1000, // 1 minute
      gcTime: 5 * 60 * 1000, // 5 minutes
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
