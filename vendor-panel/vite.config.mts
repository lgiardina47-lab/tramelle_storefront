import { createRequire } from "module"
import inject from "@medusajs/admin-vite-plugin"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"
import inspect from "vite-plugin-inspect"

const require = createRequire(import.meta.url)
const { VENDOR: VENDOR_PORT } = require("../deploy/monorepo-default-ports.cjs")

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())

  const BASE = env.VITE_MEDUSA_BASE || "/"
  const BACKEND_URL =
    env.VITE_MEDUSA_BACKEND_URL ||
    (mode === "production" ? "https://api.tramelle.com" : "http://localhost:9000")
  const STOREFRONT_URL =
    env.VITE_MEDUSA_STOREFRONT_URL ||
    (mode === "production" ? "https://tramelle.com" : "http://localhost:3000")
  const PUBLISHABLE_API_KEY = env.VITE_PUBLISHABLE_API_KEY || ""
  const TALK_JS_APP_ID = env.VITE_TALK_JS_APP_ID || ""
  const DISABLE_SELLERS_REGISTRATION =
    env.VITE_DISABLE_SELLERS_REGISTRATION || "false"

  /**
   * Add this to your .env file to specify the project to load admin extensions from.
   */
  const MEDUSA_PROJECT = env.VITE_MEDUSA_PROJECT || null
  const sources = MEDUSA_PROJECT ? [MEDUSA_PROJECT] : []

  const isDocker = process.env.DOCKER === "1"
  const devPort = Number(process.env.PORT) || VENDOR_PORT

  return {
    plugins: [
      inspect(),
      react(),
      inject({
        sources,
      }),
    ],
    define: {
      __BASE__: JSON.stringify(BASE),
      __BACKEND_URL__: JSON.stringify(BACKEND_URL),
      __STOREFRONT_URL__: JSON.stringify(STOREFRONT_URL),
      __PUBLISHABLE_API_KEY__: JSON.stringify(PUBLISHABLE_API_KEY),
      __TALK_JS_APP_ID__: JSON.stringify(TALK_JS_APP_ID),
      __DISABLE_SELLERS_REGISTRATION__: JSON.stringify(
        DISABLE_SELLERS_REGISTRATION
      ),
    },
    server: {
      host: "0.0.0.0",
      port: devPort,
      strictPort: true,
      open: false,
      ...(isDocker
        ? {
            watch: { usePolling: true, interval: 300 },
            hmr: {
              protocol: "ws",
              host: "localhost",
              port: devPort,
              clientPort: devPort,
            },
          }
        : {}),
      allowedHosts: [
        'vendor.tramelle.com',
        'www.vendor.tramelle.com',
        'localhost',
        '.localhost',
      ],
    },
    preview: {
      open: false,
      port: Number(process.env.PORT) || VENDOR_PORT,
      strictPort: true,
      host: "0.0.0.0",
      allowedHosts: [
        'vendor.tramelle.com',
        'www.vendor.tramelle.com',
        'localhost',
        '.localhost',
      ],
    },
    optimizeDeps: {
      entries: [],
      include: ["recharts"],
    },
  }
})
