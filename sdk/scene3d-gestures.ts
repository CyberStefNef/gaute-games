// Shared pointer/touch interpretation for browser and native canvas hosts.
import type { SceneGesture } from './scene3d-protocol';
export type SceneTouch = { x: number; y: number };
export function sceneGestures(send: (gesture: SceneGesture) => void) {
  let previous: readonly SceneTouch[] = [],
    origin: SceneTouch | undefined,
    moved = false;
  const center = (points: readonly SceneTouch[]) => ({
    x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
    y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
  });
  const distance = (points: readonly SceneTouch[]) =>
    points.length < 2 ? 0 : Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
  return {
    start(points: readonly SceneTouch[]) {
      if (!previous.length) {
        moved = false;
        origin = points[0];
      }
      if (points.length > 1) moved = true;
      previous = points;
    },
    move(points: readonly SceneTouch[], width: number, height: number) {
      if (!points.length || !previous.length || points.length !== previous.length) {
        previous = points;
        return;
      }
      const a = center(previous),
        b = center(points);
      if (origin && Math.hypot(b.x - origin.x, b.y - origin.y) > 7) moved = true;
      if (moved) {
        send({
          type: 'pan',
          dx: Math.max(-2, Math.min(2, (b.x - a.x) / Math.max(1, width))),
          dy: Math.max(-2, Math.min(2, (b.y - a.y) / Math.max(1, height))),
        });
        const before = distance(previous),
          after = distance(points);
        if (before > 2 && after > 2)
          send({ type: 'zoom', factor: Math.max(0.1, Math.min(10, after / before)) });
      }
      previous = points;
    },
    end(points: readonly SceneTouch[]) {
      const tap = !moved && previous.length === 1 && !points.length;
      previous = points;
      if (points.length) moved = true;
      return tap;
    },
  };
}
