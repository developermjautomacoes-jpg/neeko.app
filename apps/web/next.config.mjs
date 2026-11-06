import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "../..");
/** @type {import('next').NextConfig} */
export default {
  output: "standalone",
  outputFileTracingRoot: raiz,
  transpilePackages: ["@neeko/ui"],
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Frame-Options", value: "DENY" }, { key: "X-Content-Type-Options", value: "nosniff" }, { key: "Referrer-Policy", value: "same-origin" },
      { key: "Strict-Transport-Security", value: "max-age=31536000" },
    ] }];
  },
};
