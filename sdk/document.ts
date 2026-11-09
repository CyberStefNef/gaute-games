import { themeVariables, type Theme } from './protocol';
import { RUNTIME_PRELUDE } from './runtime';

// Builds the pages games run in. The app writes each document itself and
// places the Content-Security-Policy first, so a game's own code can neither load
// nor send anything over the network, open frames or navigate.
const POLICY = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  'img-src data: blob:',
  'font-src data:',
  'media-src data: blob:',
  "connect-src 'none'",
  "frame-src 'none'",
  "child-src 'none'",
  "worker-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
].join('; ');

// A closing tag inside a game's code must not end the element that holds it.
const inert = (code: string, tag: 'script' | 'style') =>
  code.replace(new RegExp(`</(${tag})`, 'gi'), '<\\/$1');

// Native feel before any game CSS: the app's background, text colour and font
// stack (React Native Web's, so iOS shows SF and Android Roboto, as in the app), no
// tap flashes, callouts, text inflation or overscroll. Games override freely;
// `--font-sans` matches Tailwind's and shadcn/ui's font variable.
const BASE = [
  ':root{--font-sans:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}',
  'html,body{margin:0;min-height:100%;background:var(--background);color:var(--foreground);',
  'font-family:var(--font-sans);',
  '-webkit-text-size-adjust:100%;text-size-adjust:100%;-webkit-tap-highlight-color:transparent;',
  '-webkit-touch-callout:none;overscroll-behavior:none}',
].join('');

const escapeAttribute = (value: string) => value.replace(/[&"<>]/g, (c) => `&#${c.charCodeAt(0)};`);

// Runs before the game's code: the first uncaught error (a crash while loading or
// drawing) is reported, so the app can offer to try again instead of waiting.
const REPORT_FAILURE = `(() => {
  const native = globalThis.ReactNativeWebView;
  addEventListener('error', (event) => {
    const message = { gaute: 1, type: 'failed', reason: String(event.message || 'error').slice(0, 200) };
    if (native) native.postMessage(JSON.stringify(message));
    else parent.postMessage(message, '*');
  }, { once: true });
})();`;

/**
 * A game's page. The app's tokens are inline on <html> from the first paint, with
 * shadcn/ui names, so games using stock shadcn/ui or Tailwind match the app.
 */
export function gameDocument(
  client: { script: string; style: string },
  lang: string,
  theme: Theme,
) {
  const tokens = Object.entries(themeVariables(theme))
    .map(([name, value]) => `${name}:${value}`)
    .join(';');
  return [
    '<!doctype html>',
    `<html lang="${lang === 'nb' ? 'nb' : 'en'}"${theme.dark ? ' class="dark"' : ''}`,
    ` style="color-scheme:${theme.dark ? 'dark' : 'light'};${escapeAttribute(tokens)}">`,
    '<head>',
    `<meta http-equiv="Content-Security-Policy" content="${POLICY}">`,
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">',
    '<meta name="referrer" content="no-referrer">',
    '<meta name="format-detection" content="telephone=no,email=no,address=no">',
    `<style>${BASE}</style>`,
    `<style>${inert(client.style, 'style')}</style>`,
    '</head>',
    '<body><div id="app"></div>',
    `<script>${REPORT_FAILURE}</script>`,
    `<script>${inert(client.script, 'script')}</script>`,
    '</body></html>',
  ].join('');
}

/**
 * The hidden page that runs a game's rules on this device (pass-the-phone and
 * shared-phone play). It answers `run` messages with the runtime's outcome.
 */
export function gameRulesDocument(logic: string) {
  const bridge = `
(() => {
  const native = globalThis.ReactNativeWebView;
  const post = (message) => native ? native.postMessage(JSON.stringify(message)) : parent.postMessage(message, '*');
  addEventListener('message', (event) => {
    if (!native && event.source !== parent) return;
    let message = event.data;
    if (typeof message === 'string') { try { message = JSON.parse(message); } catch { return; } }
    if (!message || message.gaute !== 1 || message.type !== 'run' || typeof message.request !== 'string') return;
    try {
      post({ gaute: 1, type: 'ran', id: message.id, outcome: __dispatch(message.request) });
    } catch (error) {
      post({ gaute: 1, type: 'ran', id: message.id, failed: String(error && error.message || error).slice(0, 300) });
    }
  });
  post({ gaute: 1, type: 'ready' });
})();`;
  return [
    '<!doctype html><html><head>',
    `<meta http-equiv="Content-Security-Policy" content="${POLICY}">`,
    '<meta charset="utf-8"></head><body>',
    `<script>${inert(RUNTIME_PRELUDE + '\n;' + logic + '\n;' + bridge, 'script')}</script>`,
    '</body></html>',
  ].join('');
}
