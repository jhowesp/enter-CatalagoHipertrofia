import { useEffect } from "react";

type SeoInput = {
  title: string;
  description?: string;
  image?: string;
  path?: string;
  noindex?: boolean;
  jsonLd?: Record<string, unknown> | null;
};

const MANAGED_META = [
  "description",
  "og:title",
  "og:description",
  "og:image",
  "og:url",
  "og:type",
  "twitter:card",
  "robots",
];

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(
    `meta[${attr}="${key}"]`,
  );
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attr, key);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

function upsertCanonical(href: string) {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", href);
}

/**
 * Aplica título, meta description, Open Graph, canonical e JSON-LD da rota atual.
 * Tudo é recalculado a cada mudança e o JSON-LD é removido ao sair da página.
 */
export function useSeo({
  title,
  description,
  image,
  path,
  noindex = false,
  jsonLd = null,
}: SeoInput) {
  useEffect(() => {
    document.title = title;
    upsertMeta("property", "og:title", title);

    if (description) {
      upsertMeta("name", "description", description);
      upsertMeta("property", "og:description", description);
    }

    if (image) {
      upsertMeta("property", "og:image", image);
    }

    upsertMeta("property", "og:type", jsonLd ? "product" : "website");
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "robots", noindex ? "noindex, nofollow" : "index, follow");

    const canonicalPath = path ?? window.location.pathname;
    upsertCanonical(`${window.location.origin}${canonicalPath}`);
    upsertMeta("property", "og:url", `${window.location.origin}${canonicalPath}`);
  }, [title, description, image, path, jsonLd, noindex]);

  useEffect(() => {
    if (!jsonLd) return;

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.dataset.seoJsonLd = "true";
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [jsonLd]);
}

export const MANAGED_META_KEYS = MANAGED_META;
