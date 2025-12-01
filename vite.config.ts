import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

async function resolvePwaPlugin() {
  try {
    const mod: any = await import("vite-plugin-pwa");
    const { VitePWA } = mod;
    return VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "masked-icon.svg"],
      manifest: {
        name: "Intake Panel",
        short_name: "Intake",
        start_url: "/?source=pwa",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#0ea5e9",
        icons: [
          { src: "/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "/pwa-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        shortcuts: [
          { name: "餐前打卡", url: "/?quick=pre", icons: [{ src: "/pwa-192.png", sizes: "192x192" }] },
          { name: "记录活动", url: "/?quick=activity", icons: [{ src: "/pwa-192.png", sizes: "192x192" }] },
        ],
      },
    });
  } catch (error) {
    console.warn("vite-plugin-pwa 未安装，已跳过 PWA 配置。");
    return null;
  }
}

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig(async () => {
  const pwaPlugin = await resolvePwaPlugin();
  return {
    plugins: [react(), ...(pwaPlugin ? [pwaPlugin] : [])],
    resolve: {
      alias: {
        "@": path.resolve(rootDir, "src"),
      },
    },
  };
});
