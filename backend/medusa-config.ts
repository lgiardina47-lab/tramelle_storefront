import { defineConfig, loadEnv } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

const isSupabaseHost = Boolean(process.env.DATABASE_URL?.includes("supabase"))
const isNeonHost = Boolean(process.env.DATABASE_URL?.includes("neon.tech"))

/** Pool lato app: con Neon/Supabase in cloud usa l’URL con pooler; qui si limita il numero di conn per processo Medusa. */
const databasePool = (() => {
  if (!isSupabaseHost && !isNeonHost) {
    return undefined
  }
  const maxRaw = Number.parseInt(process.env.DATABASE_POOL_MAX || "10", 10)
  const minRaw = Number.parseInt(process.env.DATABASE_POOL_MIN || "2", 10)
  const max = Math.min(32, Math.max(1, Number.isFinite(maxRaw) ? maxRaw : 10))
  const min = Math.min(max, Math.max(0, Number.isFinite(minRaw) ? minRaw : 2))
  return { min, max, idleTimeoutMillis: 30_000, reapIntervalMillis: 1_000 }
})()

const databaseDriverOptions = databasePool
  ? {
      ...(isSupabaseHost
        ? { connection: { ssl: { rejectUnauthorized: false } } }
        : {}),
      pool: databasePool,
    }
  : undefined

const algoliaAppId = process.env.ALGOLIA_APP_ID?.trim()
const algoliaApiKey = process.env.ALGOLIA_API_KEY?.trim()
const algoliaEnabled = Boolean(
  algoliaAppId &&
    algoliaApiKey &&
    algoliaAppId !== "placeholder" &&
    algoliaApiKey !== "placeholder"
)

const sendcloudKey = process.env.SENDCLOUD_API_KEY?.trim()
const sendcloudSecret = process.env.SENDCLOUD_API_SECRET?.trim()
const sendcloudEnabled = Boolean(sendcloudKey && sendcloudSecret)

const fulfillmentProviders: {
  resolve: string
  id: string
  options: Record<string, unknown>
}[] = [
  {
    resolve: "@medusajs/fulfillment-manual",
    id: "manual",
    options: {},
  },
  ...(sendcloudEnabled
    ? [
        {
          resolve:
            "@medita/medusa-sendcloud-plugin/providers/sendcloud-fulfillment",
          id: "sendcloud-fulfillment",
          options: {
            apiKey: sendcloudKey,
            apiSecret: sendcloudSecret,
            baseUrl:
              process.env.SENDCLOUD_BASE_URL?.trim() ||
              "https://panel.sendcloud.sc/api/v2",
            partnerId: process.env.SENDCLOUD_PARTNER_ID?.trim(),
            defaultCountry:
              process.env.SENDCLOUD_DEFAULT_COUNTRY?.trim() || "it",
          },
        },
      ]
    : []),
]

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    ...(databaseDriverOptions ? { databaseDriverOptions } : {}),
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      // @ts-expect-error Mercur vendor panel CORS
      vendorCors: process.env.VENDOR_CORS,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
  },
  admin: {
    disable: true,
  },
  plugins: [
    {
      resolve: "@mercurjs/b2c-core",
      options: {},
    },
    {
      resolve: "@mercurjs/commission",
      options: {},
    },
    ...(algoliaEnabled
      ? [
          {
            resolve: "@mercurjs/algolia",
            options: {
              apiKey: algoliaApiKey,
              appId: algoliaAppId,
            },
          },
        ]
      : []),
    {
      resolve: "@mercurjs/reviews",
      options: {},
    },
    {
      resolve: "@mercurjs/requests",
      options: {},
    },
    {
      resolve: "@mercurjs/resend",
      options: {},
    },
    {
      resolve: "medusa-blog-management",
      options: {},
    },
    ...(sendcloudEnabled
      ? [
          {
            resolve: "@medita/medusa-sendcloud-plugin" as const,
            options: {
              apiKey: sendcloudKey,
              apiSecret: sendcloudSecret,
              baseUrl:
                process.env.SENDCLOUD_BASE_URL?.trim() ||
                "https://panel.sendcloud.sc/api/v2",
              partnerId: process.env.SENDCLOUD_PARTNER_ID?.trim(),
              defaultCountry:
                process.env.SENDCLOUD_DEFAULT_COUNTRY?.trim() || "it",
            },
          },
        ]
      : []),
  ],
  modules: [
    {
      resolve: "./src/modules/seller-listing-profile",
    },
    {
      resolve: "@medusajs/medusa/fulfillment" as const,
      options: {
        providers: fulfillmentProviders,
      },
    },
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve:
              "@mercurjs/payment-stripe-connect/providers/stripe-connect",
            id: "stripe-connect",
            options: {
              apiKey: process.env.STRIPE_SECRET_API_KEY,
            },
          },
        ],
      },
    },
    {
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: [
          {
            resolve: "@mercurjs/resend/providers/resend",
            id: "resend",
            options: {
              channels: ["email"],
              api_key: process.env.RESEND_API_KEY,
              from: process.env.RESEND_FROM_EMAIL,
            },
          },
          {
            resolve: "@medusajs/medusa/notification-local",
            id: "local",
            options: {
              channels: ["feed", "seller_feed"],
            },
          },
        ],
      },
    },
  ],
})
