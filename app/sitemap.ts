import type { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  // Auth-gated app with no public indexable routes.
  return []
}
