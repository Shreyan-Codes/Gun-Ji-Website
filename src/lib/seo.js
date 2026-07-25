// Lightweight per-route SEO — no react-helmet, just direct DOM updates.
// Google renders JS, so titles/descriptions set here are what gets indexed.
// usePageMeta keeps <title>, meta description, canonical, robots and the
// og:/twitter: tags in sync per page; useJsonLd injects structured data.

import { useEffect } from "react";

export const SITE_URL = "https://www.gunji.live";
export const SITE_NAME = "GUN-जी™";

const DEFAULT_TITLE = "Premium T-Shirts at Affordable Prices in Nepal | GUN-जी™";
const DEFAULT_DESC =
  "Buy premium normal-fit t-shirts in Nepal at affordable prices. Shop GUN-जी tees in white or black, or make your own custom print, with nationwide delivery.";
const DEFAULT_IMAGE = `${SITE_URL}/assets/gunji_duo_wide.jpg`;

const absolute = (url) => (url && url.startsWith("/") ? `${SITE_URL}${url}` : url || DEFAULT_IMAGE);

function upsertMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/**
 * usePageMeta({ title, description, path, image, noindex })
 *  - title: page title WITHOUT the brand suffix (appended automatically)
 *  - path:  canonical path, e.g. "/tees" (falls back to current location)
 *  - noindex: true for cart/checkout/account — pages Google shouldn't list
 */
export function usePageMeta({ title, description, path, image, noindex = false } = {}) {
  useEffect(() => {
    const fullTitle = title ? `${title} · ${SITE_NAME} Nepal` : DEFAULT_TITLE;
    const desc = description || DEFAULT_DESC;
    const canonical = `${SITE_URL}${path ?? window.location.pathname}`;
    const img = absolute(image);

    document.title = fullTitle;
    upsertMeta("name", "description", desc);
    upsertMeta("name", "robots", noindex ? "noindex, nofollow" : "index, follow");
    upsertLink("canonical", canonical);

    upsertMeta("property", "og:title", fullTitle);
    upsertMeta("property", "og:description", desc);
    upsertMeta("property", "og:url", canonical);
    upsertMeta("property", "og:image", img);
    upsertMeta("name", "twitter:title", fullTitle);
    upsertMeta("name", "twitter:description", desc);
    upsertMeta("name", "twitter:image", img);
  }, [title, description, path, image, noindex]);
}

/**
 * useJsonLd(id, data) — injects <script type="application/ld+json"> while the
 * page is mounted (pass null/undefined data to skip, e.g. while loading).
 */
export function useJsonLd(id, data) {
  useEffect(() => {
    if (!data) return undefined;
    const el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = `jsonld-${id}`;
    el.textContent = JSON.stringify(data);
    document.head.appendChild(el);
    return () => el.remove();
  }, [id, data && JSON.stringify(data)]);
}
