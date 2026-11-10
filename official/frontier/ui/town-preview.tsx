import { useEffect, useRef } from 'react';
import { createScene, type SceneController } from '@gaute/games-sdk/scene3d';
import { planet, multiply } from '../planet';
import { MODELS } from './models';
import { surfacePosition, surfaceRotation } from './board-scene';
import { planetModel } from './planet-mesh';
export function TownPreview() {
  const element = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let disposed = false,
      scene: SceneController | undefined;
    void (async () => {
      scene = await createScene(element.current!);
      if (disposed) {
        scene.dispose();
        return;
      }
      const grid = planet(8),
        at = 9,
        other = grid.cells[at].neighbors[0],
        n = grid.cells[at].center;
      await scene.load(
        'planet',
        planetModel(
          {
            size: 8,
            ground: grid.cells.map((_, i) => (i % 7 === 0 ? 3 : 0)),
            visible: new Set(grid.cells.map((_, i) => i)),
          },
          {
            selected: null,
            courierAt: null,
            reach: new Set(),
            gather: new Set(),
            pending: null,
            ready: new Set(),
            siege: new Set(),
          },
        ),
      );
      await Promise.all((['brewery', 'brewer'] as const).map((id) => scene!.load(id, MODELS[id])));
      if (disposed) return;
      await scene.update({
        nodes: [
          { id: 'world', model: 'planet', position: [0, 0, 0] },
          {
            id: 'venue',
            model: 'brewery',
            position: surfacePosition(at, 8),
            rotation: surfaceRotation(at, 8),
          },
          {
            id: 'maker',
            model: 'brewer',
            position: surfacePosition(other, 8),
            rotation: surfaceRotation(other, 8),
          },
        ],
        camera: {
          position: multiply(n, 40),
          target: [0, 0, 0],
          projection: 'orthographic',
          span: 21,
        },
        background: '#d9e4e9',
      });
    })().catch(() => {});
    return () => {
      disposed = true;
      scene?.dispose();
    };
  }, []);
  return (
    <div
      ref={element}
      aria-hidden="true"
      style={{ width: '100%', maxWidth: 320, height: 200, overflow: 'hidden', borderRadius: 16 }}
    />
  );
}
