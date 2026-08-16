import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/prospeccao"],
        disallow: [
          "/",
          "/admin",
          "/membro",
          "/login",
          "/cadastro",
          "/esqueci-senha",
          "/redefinir-senha",
          "/api",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
