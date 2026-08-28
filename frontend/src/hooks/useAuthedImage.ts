import { useEffect, useState } from "react";
import { api } from "../api/client";

/** <img src="..."> can't send an Authorization header -- the browser loads it as a
 * plain, unauthenticated GET. Now that /documents/{id}/file enforces organization
 * ownership, a raw URL 404s (broken image) for any logged-in user's own documents.
 * This fetches the image through the same authenticated axios instance the rest of
 * the app uses and exposes it as a local blob: URL instead. */
export function useAuthedImage(url: string): string | null {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let currentUrl: string | null = null;
    setBlobUrl(null);

    api.get(url, { baseURL: "", responseType: "blob" }).then((res) => {
      if (cancelled) return;
      currentUrl = URL.createObjectURL(res.data);
      setBlobUrl(currentUrl);
    }).catch(() => { if (!cancelled) setBlobUrl(null); });

    return () => {
      cancelled = true;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [url]);

  return blobUrl;
}
