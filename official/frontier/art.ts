import { frontierAtlas } from './assets/atlas-data';
import { frontierLayout } from './art/atlas-layout';

export { frontierAtlas, frontierLayout };
export type FrontierSprite = keyof typeof frontierLayout.sprites;

/** Position inside a relative wrapper whose origin is the tile's ground center. */
export function frontierSpriteStyle(name: FrontierSprite, tileWidth = 72) {
  const [x, y] = frontierLayout.sprites[name];
  const scale = tileWidth / frontierLayout.groundWidth;
  return {
    position: 'absolute' as const,
    pointerEvents: 'none' as const,
    width: frontierLayout.cell * scale,
    height: frontierLayout.cell * scale,
    left: -frontierLayout.anchor[0] * scale,
    top: -frontierLayout.anchor[1] * scale,
    backgroundImage: `url("${frontierAtlas}")`,
    backgroundSize: `${frontierLayout.width * scale}px ${frontierLayout.height * scale}px`,
    backgroundPosition: `${-x * scale}px ${-y * scale}px`,
    backgroundRepeat: 'no-repeat',
  };
}

/** Odd-column hex layout, measured at the ground plane above the wooden rim. */
export function frontierHexCenter(column: number, row: number, tileWidth = 72) {
  const height = (tileWidth * frontierLayout.groundHeight) / frontierLayout.groundWidth;
  return { x: column * tileWidth * 0.75, y: (row + (column % 2) * 0.5) * height };
}
