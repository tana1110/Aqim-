import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// No incremental cache: Aqim uses no ISR/revalidate/"use cache", so static
// pages are served straight from the build's assets and everything else is
// rendered per request.
export default defineCloudflareConfig({});
