import { defineMiddlewares } from "@medusajs/framework/http"
import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

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
      matcher: /.*/,
      middlewares: [xRobotsNoindex],
    },
  ],
})
