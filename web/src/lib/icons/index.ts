import { lucideIconSvgs, lucideIconNames } from './lucide-generated';
import {
  simpleIconPaths,
  simpleIconColors,
  simpleIconTitles,
  simpleIconSlugs,
} from './simple-icons-generated';

// Featured icons shown when the picker opens (before any search input).
// Curated for the home-dashboard use case: common services, network, media,
// dev tools, etc.
export const FEATURED_ICON_NAMES: string[] = [
  'house', 'link', 'globe', 'folder', 'server', 'database', 'cloud',
  'code', 'terminal', 'github', 'box', 'package', 'monitor', 'cpu',
  'hard-drive', 'wifi', 'shield', 'lock', 'key', 'bell',
  'mail', 'message-square', 'calendar', 'image', 'music', 'film',
  'book', 'star', 'settings', 'user',
];

// Featured brand icons shown alongside the lucide featured set.
export const FEATURED_BRAND_SLUGS: string[] = [
  'anthropic', 'claude', 'openai', 'github', 'google', 'gmail', 'youtube',
  'netflix', 'spotify', 'twitter', 'x', 'discord', 'slack', 'telegram',
  'notion', 'figma', 'docker', 'kubernetes', 'nginx', 'cloudflare',
  'amazonwebservices', 'googlecloud', 'microsoftazure', 'vercel', 'apple',
];

const FALLBACK_ICON = 'link';

export type IconPack = 'lucide' | 'simple';

export interface IconSearchResult {
  name: string;
  pack: IconPack;
  // Raw SVG inner content. For lucide: stroke-based <path/.../>;
  // for simple-icons: a single filled <path d=".." fill="currentColor"/>.
  svg: string;
  // Brand hex (without #) for simple-icons; undefined for lucide.
  brandColor?: string;
  // Display name; for simple-icons this is the official brand title.
  title?: string;
}

const lucideToResult = (name: string): IconSearchResult => ({
  name,
  pack: 'lucide',
  svg: lucideIconSvgs[name] || '',
});

const simpleToResult = (slug: string): IconSearchResult => ({
  name: slug,
  pack: 'simple',
  svg: `<path d="${simpleIconPaths[slug]}" fill="currentColor"/>`,
  brandColor: simpleIconColors[slug],
  title: simpleIconTitles[slug],
});

// Resolve an icon key to its inner SVG markup. Supports:
//   "lucide:link"  -> lucide stroke icon
//   "simple:github" -> simple-icons filled brand icon
//   "link"          -> defaults to lucide
export function getIconSvg(iconKey: string): string {
  if (!iconKey) return lucideIconSvgs[FALLBACK_ICON] || '';

  if (iconKey.startsWith('simple:')) {
    const slug = iconKey.slice(7);
    const path = simpleIconPaths[slug];
    if (path) return `<path d="${path}" fill="currentColor"/>`;
    return lucideIconSvgs[FALLBACK_ICON] || '';
  }

  const name = iconKey.includes(':') ? iconKey.split(':')[1] : iconKey;
  return lucideIconSvgs[name] || lucideIconSvgs[FALLBACK_ICON] || '';
}

// Look up brand color for an icon key. Returns hex without leading "#",
// or undefined for non-brand icons.
export function getIconBrandColor(iconKey: string): string | undefined {
  if (!iconKey?.startsWith('simple:')) return undefined;
  return simpleIconColors[iconKey.slice(7)];
}

// Returns featured icons when query is empty (lucide first, then brands),
// otherwise filters all icons by name (substring match, deduped, capped).
export function searchIcons(query: string, limit = 200): IconSearchResult[] {
  const q = query.toLowerCase().trim();

  if (!q) {
    const lucideFeatured = FEATURED_ICON_NAMES
      .filter(n => lucideIconSvgs[n])
      .map(lucideToResult);
    const brandFeatured = FEATURED_BRAND_SLUGS
      .filter(s => simpleIconPaths[s])
      .map(simpleToResult);
    return [...lucideFeatured, ...brandFeatured];
  }

  const results: IconSearchResult[] = [];

  // Brand icons first when matching a brand name - users searching "anthropic"
  // probably want the brand, not a generic icon.
  for (const slug of simpleIconSlugs) {
    if (slug.includes(q) || simpleIconTitles[slug]?.toLowerCase().includes(q)) {
      results.push(simpleToResult(slug));
      if (results.length >= limit) return results;
    }
  }

  for (const name of lucideIconNames) {
    if (name.includes(q)) {
      results.push(lucideToResult(name));
      if (results.length >= limit) return results;
    }
  }

  return results;
}

export const TOTAL_ICON_COUNT = lucideIconNames.length + simpleIconSlugs.length;
