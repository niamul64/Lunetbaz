/**
 * Client-side (TanStack Query) cache policy.
 *
 * Every query picks one tier instead of ad-hoc numbers, so freshness is
 * consistent and easy to tune. Rule of thumb: the more money or operational
 * risk depends on the value, the shorter it may be cached.
 */
const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

export const queryPolicy = {
  /** Never changes during a session: locations, demo accounts. */
  static: { staleTime: Infinity, gcTime: 24 * HOUR },

  /** Reference data that rarely changes: categories, staff list, roles. */
  reference: { staleTime: 10 * MINUTE, gcTime: HOUR },

  /** Public catalog reads in the browser: search results, reviews, Q&A, campaigns. */
  catalog: { staleTime: MINUTE, gcTime: 10 * MINUTE },

  /** The signed-in user's own data: orders, addresses, products, settings. */
  private: { staleTime: 30 * SECOND, gcTime: 10 * MINUTE },

  /**
   * Operational work queues watched by staff/sellers: dashboards, order lists,
   * tickets. Refreshed on window focus and polled while the tab is visible.
   */
  live: { staleTime: 10 * SECOND, gcTime: 5 * MINUTE, refetchOnWindowFocus: true, refetchInterval: MINUTE, refetchIntervalInBackground: false },

  /** Money-critical values that must never be served stale: cart quote, checkout totals. */
  transactional: { staleTime: 0, gcTime: MINUTE, refetchOnWindowFocus: true },
} as const;

export type QueryPolicy = keyof typeof queryPolicy;
