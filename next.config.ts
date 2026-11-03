import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/*": ["./db/schema.sql"],
  },
};

export default nextConfig;
