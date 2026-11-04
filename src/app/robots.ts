import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/dashboard", "/api/private"] }, sitemap: "https://edutrack.example/sitemap.xml" };
}
