import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3002";

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
