/** Primitives shared by every domain type. Kept framework-free so both the
 *  backend (Prisma mappers) and the frontend (store + components) can import. */

export type ID = string;

/** ISO-8601 string. We never put `Date` objects in the store: they must survive
 *  JSON serialization (localStorage today, HTTP responses tomorrow). */
export type ISODate = string;

export interface Timestamped {
  createdAt: ISODate;
  updatedAt?: ISODate;
}

export interface Entity extends Timestamped {
  id: ID;
}

/** Anything scoped to a branch (multi-tenant row-level filtering). */
export interface BranchScoped {
  branchId: ID;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiError {
  error: string;
  fieldErrors?: Record<string, string>;
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export interface SelectOption {
  value: string;
  label: string;
}

/** Generic media reference used by activities, events, CMS and the gallery. */
export interface MediaRef {
  id: ID;
  url: string;
  kind: "image" | "video" | "audio" | "document";
  caption?: string;
  thumbnailUrl?: string;
  /** Emoji stand-in so demo data renders without real assets. */
  placeholder?: string;
}

export type Money = number; // stored in rupees (integer), formatted at the edge
