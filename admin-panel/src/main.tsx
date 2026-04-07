import React from "react"
import ReactDOM from "react-dom/client"
import App from "./app.js"

import { patchRelativeAdminFetch } from "./lib/patch-admin-fetch"

patchRelativeAdminFetch()

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
