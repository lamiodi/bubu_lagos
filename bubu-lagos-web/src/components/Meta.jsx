import { useEffect } from 'react';

const DEFAULT_TITLE = 'Bubu Lagos | Modern African Luxury';
const DEFAULT_DESCRIPTION = 'Bubu Lagos creates modern African luxury through elegant Bubu silhouettes designed for comfort, movement, and presence. Hand-finished in our Lagos atelier.';
const DEFAULT_IMAGE = '/og-image.jpg';

/**
 * Per-route SEO helper. Updates document.title and the most common meta tags.
 * Anything not provided falls back to a sensible default so the page never
 * accidentally inherits the previous route's title/description.
 */
export function Meta({ title, description, image }) {
  useEffect(() => {
    const fullTitle = title ? `${title} | Bubu Lagos` : DEFAULT_TITLE;
    document.title = fullTitle;

    setMeta('description', description || DEFAULT_DESCRIPTION);
    setMetaProperty('og:title', fullTitle, true);
    setMetaProperty('og:description', description || DEFAULT_DESCRIPTION, true);
    setMetaProperty('og:image', image || DEFAULT_IMAGE, true);
    setMetaName('twitter:title', fullTitle);
    setMetaName('twitter:description', description || DEFAULT_DESCRIPTION);
    setMetaName('twitter:image', image || DEFAULT_IMAGE);
  }, [title, description, image]);
  return null;
}

function setMeta(name, content) {
  if (!content) return;
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setMetaName(name, content) {
  setMeta(name, content);
}

function setMetaProperty(prop, content, isProperty) {
  if (!content) return;
  const selector = isProperty ? `meta[property="${prop}"]` : `meta[name="${prop}"]`;
  let el = document.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    if (isProperty) el.setAttribute('property', prop);
    else el.setAttribute('name', prop);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export default Meta;
