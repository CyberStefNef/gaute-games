import { BROWSER_SCENE3D, NATIVE_SCENE3D_PROXY } from './scene3d-runtime.generated';
import { SCENE3D_MARKER } from './scene3d-protocol';
/** Old app binaries use the browser path. A capable native host opts into the proxy. */
export function scene3dDocument(html: string, native = false) {
  if (!html.includes(SCENE3D_MARKER)) return html;
  const start = '<script id="gaute-scene3d-runtime">';
  const index = html.indexOf(start);
  if (index >= 0) {
    const end = html.indexOf('</script>', index);
    if (end >= 0) html = html.slice(0, index) + html.slice(end + 9);
  }
  const code = BROWSER_SCENE3D + (native ? '\n;' + NATIVE_SCENE3D_PROXY : '');
  return html.replace(
    '<body>',
    () => `<body>${start}${code.replace(/<\/(script)/gi, '<\\/$1')}</script>`,
  );
}
