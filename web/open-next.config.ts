import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// 시연용 정적 화면이라 R2 캐시 등 추가 Cloudflare 자원은 쓰지 않는다 (필요해지면 승인 후 추가)
export default defineCloudflareConfig({});
