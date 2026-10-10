/**
 * Public runtime configuration. Only NEXT_PUBLIC_* values are available in the browser.
 *
 * NEXT_PUBLIC_API_MODE   "mock" (default) serves every request from /dummy_data,
 *                        "http" calls the NestJS backend.
 * NEXT_PUBLIC_API_URL    Base URL of the backend, including the version prefix,
 *                        e.g. https://api.lunetbuz.com/api/v1
 */
export const env = {
  apiMode: (process.env.NEXT_PUBLIC_API_MODE ?? "mock") as "mock" | "http",
  apiBaseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1",
  /** Simulated network latency for the mock transport, in ms (0 = instant). Set e.g. 300 to test loading states. */
  mockLatencyMs: Number(process.env.NEXT_PUBLIC_MOCK_LATENCY_MS ?? 0),
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;

export const isMockApi = env.apiMode === "mock";
