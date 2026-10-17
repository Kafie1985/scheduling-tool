import type { NextConfig } from "next";

// Netlify injects environment variables before the build. Next's file tracer
// would copy a generated .env into the server bundle, where secrets scanning
// treats the copy as a committed secret. Leave .env* files out of the trace so
// the values stay in the runtime environment.
const envFiles = [".env", ".env.*", "**/.env", "**/.env.*"];

const nextConfig: NextConfig = {
  outputFileTracingExcludes: {
    "*": envFiles,
  },
};

export default nextConfig;
