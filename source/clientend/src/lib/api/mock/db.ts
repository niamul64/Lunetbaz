/**
 * In-memory database for the mock transport, seeded from /dummy_data.
 *
 * In the browser, mutations are persisted to localStorage so the demo behaves
 * like a real backend across reloads (e.g. a seller edits a price, then the
 * admin sees it). On the server (SSR of public pages) the pristine seed is used.
 */
import authJson from "@data/auth.json";
import shopsJson from "@data/shops.json";
import categoriesJson from "@data/categories.json";
import productsJson from "@data/products.json";
import campaignsJson from "@data/campaigns.json";
import verificationJson from "@data/verification.json";
import ordersJson from "@data/orders.json";
import reviewsJson from "@data/reviews.json";
import cmsJson from "@data/cms.json";
import ticketsJson from "@data/tickets.json";
import financeJson from "@data/finance.json";
import locationsJson from "@data/locations.json";
import vouchersJson from "@data/vouchers.json";
import customersJson from "@data/customers.json";
import auditJson from "@data/audit_logs.json";
import type {
  Address,
  AuditLog,
  BadgeEvent,
  Banner,
  Campaign,
  CampaignApplication,
  Category,
  ChangeRequest,
  CustomerRisk,
  LocationDivision,
  Order,
  Payout,
  Product,
  Question,
  Review,
  Role,
  SeriesPoint,
  ShippingZone,
  Shop,
  Ticket,
  User,
  VerificationRequest,
  Voucher,
} from "@/types";

/** Bump when the dummy data changes shape so stale browser copies are discarded. */
const SEED_VERSION = 1;
const STORAGE_KEY = `lunetbuz.mockdb.v${SEED_VERSION}`;

export interface MockUser extends User {
  /** Only for accounts registered during the demo; seeded users use the demo password. */
  password?: string;
}

export interface MockDb {
  demoPassword: string;
  roles: Role[];
  users: MockUser[];
  shops: Shop[];
  categories: Category[];
  products: Product[];
  campaigns: Campaign[];
  applications: CampaignApplication[];
  vouchers: Voucher[];
  verificationRequests: VerificationRequest[];
  badgeEvents: BadgeEvent[];
  changeRequests: ChangeRequest[];
  orders: Order[];
  reviews: Review[];
  questions: Question[];
  banners: Banner[];
  pages: { id: string; slug: string; title: string; status: string; updatedAt: string }[];
  tickets: Ticket[];
  payouts: Payout[];
  salesSeries: Record<string, SeriesPoint[]>;
  divisions: LocationDivision[];
  shippingZones: ShippingZone[];
  addresses: Address[];
  wishlists: { userId: string; productIds: string[] }[];
  riskProfiles: CustomerRisk[];
  auditLogs: AuditLog[];
}

function seed(): MockDb {
  return structuredClone({
    demoPassword: authJson.demoPassword,
    roles: authJson.roles as Role[],
    users: authJson.users as MockUser[],
    shops: shopsJson as Shop[],
    categories: categoriesJson as Category[],
    products: productsJson as Product[],
    campaigns: campaignsJson.campaigns as Campaign[],
    applications: campaignsJson.applications as CampaignApplication[],
    vouchers: vouchersJson as Voucher[],
    verificationRequests: verificationJson.requests as VerificationRequest[],
    badgeEvents: verificationJson.badgeEvents as BadgeEvent[],
    changeRequests: verificationJson.changeRequests as ChangeRequest[],
    orders: ordersJson as Order[],
    reviews: reviewsJson.reviews as Review[],
    questions: reviewsJson.questions as Question[],
    banners: cmsJson.banners as Banner[],
    pages: cmsJson.pages,
    tickets: ticketsJson as Ticket[],
    payouts: financeJson.payouts as Payout[],
    salesSeries: financeJson.salesSeries as Record<string, SeriesPoint[]>,
    divisions: locationsJson.divisions as LocationDivision[],
    shippingZones: locationsJson.shippingZones as ShippingZone[],
    addresses: customersJson.addresses as Address[],
    wishlists: customersJson.wishlists,
    riskProfiles: customersJson.riskProfiles as CustomerRisk[],
    auditLogs: auditJson as AuditLog[],
  });
}

const isBrowser = typeof window !== "undefined";
let db: MockDb | null = null;

export function getDb(): MockDb {
  if (db) return db;
  if (isBrowser) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) db = JSON.parse(raw) as MockDb;
    } catch {
      // Storage unavailable or corrupted – fall back to the seed.
    }
  }
  db ??= seed();
  return db;
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;

export function persistDb() {
  if (!isBrowser || !db) return;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch {
      // Quota exceeded or storage blocked – the demo keeps working in memory.
    }
  }, 50);
}

/** Restore the original dummy data (used by the "Reset demo data" action). */
export function resetDb() {
  db = seed();
  if (isBrowser) {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
}
