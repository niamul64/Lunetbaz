export const siteConfig = {
  name: "Lunetbuz",
  tagline: "Shop everything, delivered everywhere in Bangladesh",
  description:
    "Lunetbuz is Bangladesh's marketplace for genuine products: shop mobiles, fashion, beauty, home and more from trusted sellers, with Cash on Delivery, bKash and Nagad.",
  supportPhone: "16XXX",
  supportEmail: "support@lunetbuz.com",
  currency: "BDT",
  locale: "en-BD",
} as const;

/** Session cookie read by proxy.ts for optimistic route protection. */
export const SESSION_COOKIE = "lb_session";
