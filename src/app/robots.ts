import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

const siteUrl = SITE_URL;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard",
          "/strategy",
          "/decisions",
          "/risks",
          "/settings",
          "/onboarding",
          "/automation",
          "/inbox",
          "/team",
          "/projects",
          "/meetings",
          "/comms",
          "/calendar",
          "/contacts",
          "/documents",
          "/biz-dev",
          "/brand",
          "/invite",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
