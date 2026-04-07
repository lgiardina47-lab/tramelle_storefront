import { backendUrl, getAuthToken } from "./client/client";

/**
 * medusa-blog-management (and similar plugin UIs) call `fetch("/admin/...")`.
 * This admin runs on a separate origin from the API; route those calls to
 * `backendUrl` and attach the same Bearer token as @medusajs/js-sdk.
 */
export function patchRelativeAdminFetch(): void {
  if (typeof window === "undefined") {
    return;
  }
  const w = window as Window & { __tramelleAdminFetchPatched?: boolean };
  if (w.__tramelleAdminFetchPatched) {
    return;
  }
  w.__tramelleAdminFetchPatched = true;

  const base = backendUrl.replace(/\/$/, "");
  const orig = window.fetch.bind(window);

  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    let path: string | null = null;
    if (typeof input === "string") {
      if (input.startsWith("/admin") || input.startsWith("/store")) {
        path = input;
      }
    } else if (input instanceof URL && input.origin === window.location.origin) {
      const p = input.pathname;
      if (p.startsWith("/admin") || p.startsWith("/store")) {
        path = p + input.search;
      }
    }

    if (!path) {
      return orig(input, init);
    }

    const token = getAuthToken();
    const headers = new Headers(init?.headers);
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    return orig(`${base}${path}`, {
      ...init,
      headers,
    });
  };
}
