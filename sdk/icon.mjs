// Game icons are small SVGs the app draws natively (react-native-svg) on cards
// and detail pages. Only shapes, gradients and masks are allowed: no scripts,
// links, external references, styles or text (fonts differ between phones).

export const ICON_LIMIT = 12 * 1024;
const ELEMENTS = new Set([
  'svg',
  'g',
  'path',
  'circle',
  'ellipse',
  'rect',
  'line',
  'polyline',
  'polygon',
  'defs',
  'lineargradient',
  'radialgradient',
  'stop',
  'clippath',
  'mask',
]);
const ATTRIBUTES_FORBIDDEN = new Set(['href', 'style', 'class']);

/** Why an icon is unsafe or unsupported, or null when it may be published. */
export function iconProblem(svg) {
  if (typeof svg !== 'string') return 'must be an SVG file';
  if (svg.length > ICON_LIMIT) return `must be at most ${ICON_LIMIT / 1024} KB`;
  const markup = svg.trim();
  if (!/^<svg[\s>]/.test(markup) || !markup.endsWith('</svg>'))
    return 'must be a single <svg> element (remove the XML prolog and comments)';
  if (/<!|<\?|&/.test(markup)) return 'must not contain comments, declarations or entities';
  if (!/\sviewBox="0 0 (\d+(?:\.\d+)?) \1"/.test(markup)) return 'needs a square viewBox="0 0 N N"';
  for (const [, name] of markup.matchAll(/<\/?\s*([A-Za-z][\w:.-]*)/g))
    if (!ELEMENTS.has(name.toLowerCase())) return `<${name}> is not allowed`;
  for (const [, name, value] of markup.matchAll(
    /\s([A-Za-z_:][\w:.-]*)\s*=\s*("[^"]*"|'[^']*')/g,
  )) {
    const lower = name.toLowerCase();
    if (lower.startsWith('on') || ATTRIBUTES_FORBIDDEN.has(lower) || lower.endsWith(':href'))
      return `the ${name} attribute is not allowed`;
    if (/url\(\s*(?!#)/i.test(value)) return 'only url(#id) references are allowed';
  }
  return null;
}
