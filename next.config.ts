import type { NextConfig } from "next";

// Sicherheits-Header für alle Seiten (siehe docs/production/security-headers.md).
// Content-Security-Policy ist bewusst noch nicht gesetzt: Sie kann die App brechen
// und braucht eigene Tests (zuerst im Modus «Report-Only»).
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
