import type { NextConfig } from "next";

const config: NextConfig = {
  // Read with fs at request time, so serverless bundles must carry it.
  outputFileTracingIncludes: {
    "/study": ["./data/policy.frozen.json"],
    "/api/participants": ["./data/policy.frozen.json"],
    "/eval": ["./data/policy.frozen.json"],
  },
};

export default config;
