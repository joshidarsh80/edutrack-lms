import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/courses", "/about", "/pricing"].map((path) => ({ url: `https://edutrack.example${path}`, lastModified: new Date(), changeFrequency: "weekly", priority: path ? 0.7 : 1 }));
}
