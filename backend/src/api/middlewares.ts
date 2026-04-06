import {
  defineMiddlewares,
  validateAndTransformQuery,
} from "@medusajs/framework/http"
import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { VendorGetAttributesParams } from "@mercurjs/b2c-core/api/vendor/attributes/validators"
import { retrieveAttributeQueryConfig } from "@mercurjs/b2c-core/api/vendor/attributes/query-config"

const xRobotsNoindex = (
  _req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  res.setHeader("X-Robots-Tag", "noindex, nofollow")
  next()
}

export default defineMiddlewares({
  routes: [
    {
      method: ["GET"],
      matcher: "/vendor/products/:id/applicable-attributes",
      middlewares: [
        validateAndTransformQuery(
          VendorGetAttributesParams,
          retrieveAttributeQueryConfig
        ),
      ],
    },
    {
      matcher: /.*/,
      middlewares: [xRobotsNoindex],
    },
  ],
})
