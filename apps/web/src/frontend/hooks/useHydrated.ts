"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const onClient = () => true;
const onServer = () => false;

/**
 * True only after the first client render. The ERP store is persisted in
 * localStorage and its fixtures use relative dates, so any component reading it
 * must wait for mount — otherwise the server HTML and the client tree disagree.
 *
 * `useSyncExternalStore` gives us that without a setState-in-effect cascade.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, onClient, onServer);
}
