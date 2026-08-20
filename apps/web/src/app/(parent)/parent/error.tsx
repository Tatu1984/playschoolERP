"use client";

import { RouteError } from "@/frontend/components/layout/RouteFallbacks";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError error={error} reset={reset} surface="your portal" homeHref="/parent" />;
}
