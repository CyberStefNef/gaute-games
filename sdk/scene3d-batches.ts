// Group static draw calls by material without simplifying source geometry.
import { Matrix4, type Object3D, type BufferGeometry, type Material } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
export type StaticPart = {
  geometry: BufferGeometry;
  material: Material | Material[];
  transform: Matrix4;
};
export function prepareStaticModel(root: Object3D) {
  const groups = new Map<string, StaticPart[]>(),
    parts: StaticPart[] = [],
    owned: BufferGeometry[] = [];
  root.updateMatrixWorld(true);
  root.traverse((object) => {
    const mesh = object as Object3D & {
      geometry?: BufferGeometry;
      material?: Material | Material[];
    };
    if (!mesh.geometry || !mesh.material) return;
    const part = {
      geometry: mesh.geometry,
      material: mesh.material,
      transform: mesh.matrixWorld.clone(),
    };
    if (Array.isArray(mesh.material)) {
      parts.push(part);
      return;
    }
    const signature = Object.entries(mesh.geometry.attributes)
      .map(([name, a]) => `${name}:${a.itemSize}:${a.normalized}:${a.array.constructor.name}`)
      .sort()
      .join('|');
    const key = `${mesh.material.uuid}:${mesh.geometry.index !== null}:${signature}`;
    const group = groups.get(key) ?? [];
    group.push(part);
    groups.set(key, group);
  });
  for (const group of groups.values()) {
    if (group.length === 1) {
      parts.push(group[0]);
      continue;
    }
    const geometry = group.map((part) => {
      const clone = part.geometry.clone().applyMatrix4(part.transform);
      // Baking a reflection must retain the original front-face winding.
      if (part.transform.determinant() < 0) {
        if (!clone.index)
          clone.setIndex(Array.from({ length: clone.getAttribute('position').count }, (_, i) => i));
        const index = clone.index!;
        for (let i = 0; i < index.count; i += 3) {
          const second = index.getX(i + 1);
          index.setX(i + 1, index.getX(i + 2));
          index.setX(i + 2, second);
        }
      }
      return clone;
    });
    const merged = mergeGeometries(geometry, false);
    geometry.forEach((g) => g.dispose());
    if (!merged) throw Error('Could not batch static model geometry');
    owned.push(merged);
    parts.push({ geometry: merged, material: group[0].material, transform: new Matrix4() });
  }
  return { parts, owned };
}
