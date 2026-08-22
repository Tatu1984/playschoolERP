import type { MetadataRoute } from "next";
import { SITE } from "@/shared/constants/site";

/**
 * Everything behind a login is disallowed — not as a security measure (the proxy
 * and service layer do that) but so children's data and the parent portal never
 * end up in a search index.
 */
export default function robots(): MetadataRoute.Robots {
  const base = SITE.url.replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/teacher", "/parent", "/kids", "/gms", "/api", "/login", "/register", "/forgot-password", "/reset-password"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
