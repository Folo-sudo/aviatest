import type * as ThreeNamespace from 'three';

export type ShapeId =
  | 'tower'
  | 'cactus'
  | 'rock'
  | 'barrel'
  | 'pyramid'
  | 'cone_marker'
  | 'L_polycube'
  | 'T_polycube'
  | 'crate'
  | 'antenna';

export interface ShapeDef {
  id: ShapeId;
  label: string;
  color: string;
  createMesh: (THREE: typeof ThreeNamespace) => ThreeNamespace.Object3D;
}

function phongMat(
  THREE: typeof ThreeNamespace,
  color: number | string,
): ThreeNamespace.MeshPhongMaterial {
  return new THREE.MeshPhongMaterial({ color });
}

function addBox(
  THREE: typeof ThreeNamespace,
  group: ThreeNamespace.Group,
  w: number,
  h: number,
  d: number,
  color: number | string,
  x: number,
  y: number,
  z: number,
): void {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), phongMat(THREE, color));
  mesh.position.set(x, y, z);
  group.add(mesh);
}

const SHAPE_DEFS: ShapeDef[] = [
  {
    id: 'tower',
    label: 'Tour relais',
    color: '#e07030',
    createMesh(THREE) {
      const group = new THREE.Group();
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.5, 2.2, 8),
        phongMat(THREE, 0xe07030),
      );
      base.position.y = 1.1;
      const top = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.6, 0.5),
        phongMat(THREE, 0xf5f5f5),
      );
      top.position.y = 2.5;
      const mast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 1.0, 6),
        phongMat(THREE, 0x888888),
      );
      mast.position.y = 3.3;
      group.add(base, top, mast);
      return group;
    },
  },
  {
    id: 'cactus',
    label: 'Cactus',
    color: '#2d9a4a',
    createMesh(THREE) {
      const group = new THREE.Group();
      const mat = phongMat(THREE, 0x2d9a4a);
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.5, 8), mat);
      body.position.y = 0.75;
      const mid = new THREE.Mesh(new THREE.ConeGeometry(0.26, 1.0, 8), mat);
      mid.position.y = 1.55;
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.55, 8), mat);
      tip.position.y = 2.15;
      const arm = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.75, 8), mat);
      arm.position.set(0.38, 1.2, 0);
      arm.rotation.z = -Math.PI / 3;
      group.add(body, mid, tip, arm);
      return group;
    },
  },
  {
    id: 'rock',
    label: 'Rocher',
    color: '#6e6e6e',
    createMesh(THREE) {
      const mesh = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.55, 0),
        phongMat(THREE, 0x6e6e6e),
      );
      mesh.scale.set(1.25, 0.72, 0.95);
      mesh.position.y = 0.28;
      return mesh;
    },
  },
  {
    id: 'barrel',
    label: 'Baril',
    color: '#2563c4',
    createMesh(THREE) {
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.42, 0.95, 12),
        phongMat(THREE, 0x2563c4),
      );
      mesh.position.y = 0.48;
      return mesh;
    },
  },
  {
    id: 'pyramid',
    label: 'Pyramide',
    color: '#d4a017',
    createMesh(THREE) {
      const mesh = new THREE.Mesh(
        new THREE.ConeGeometry(0.65, 1.1, 4),
        phongMat(THREE, 0xd4a017),
      );
      mesh.position.y = 0.55;
      mesh.rotation.y = Math.PI / 4;
      return mesh;
    },
  },
  {
    id: 'cone_marker',
    label: 'Cone repere',
    color: '#dc2626',
    createMesh(THREE) {
      const mesh = new THREE.Mesh(
        new THREE.ConeGeometry(0.32, 0.75, 6),
        phongMat(THREE, 0xdc2626),
      );
      mesh.position.y = 0.38;
      return mesh;
    },
  },
  {
    id: 'L_polycube',
    label: 'Polycube L',
    color: '#7c3aed',
    createMesh(THREE) {
      const group = new THREE.Group();
      const c = 0x7c3aed;
      addBox(THREE, group, 0.5, 0.5, 0.5, c, 0, 0.25, 0);
      addBox(THREE, group, 0.5, 0.5, 0.5, c, 0, 0.25, 0.5);
      addBox(THREE, group, 0.5, 0.5, 0.5, c, 0, 0.75, 0);
      return group;
    },
  },
  {
    id: 'T_polycube',
    label: 'Polycube T',
    color: '#0891b2',
    createMesh(THREE) {
      const group = new THREE.Group();
      const c = 0x0891b2;
      addBox(THREE, group, 0.5, 0.5, 0.5, c, -0.5, 0.25, 0);
      addBox(THREE, group, 0.5, 0.5, 0.5, c, 0, 0.25, 0);
      addBox(THREE, group, 0.5, 0.5, 0.5, c, 0.5, 0.25, 0);
      addBox(THREE, group, 0.5, 0.5, 0.5, c, 0, 0.75, 0);
      return group;
    },
  },
  {
    id: 'crate',
    label: 'Caisse',
    color: '#a16207',
    createMesh(THREE) {
      const group = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.85, 0.85, 0.85),
        phongMat(THREE, 0xa16207),
      );
      body.position.y = 0.43;
      const bandMat = phongMat(THREE, 0x713f12);
      const bandH = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.9), bandMat);
      bandH.position.y = 0.43;
      const bandV = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.9), bandMat);
      bandV.position.y = 0.43;
      group.add(body, bandH, bandV);
      return group;
    },
  },
  {
    id: 'antenna',
    label: 'Antenne',
    color: '#64748b',
    createMesh(THREE) {
      const group = new THREE.Group();
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.28, 0.35, 8),
        phongMat(THREE, 0x475569),
      );
      base.position.y = 0.18;
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.05, 2.4, 6),
        phongMat(THREE, 0x64748b),
      );
      pole.position.y = 1.55;
      const dish = new THREE.Mesh(
        new THREE.ConeGeometry(0.22, 0.18, 8),
        phongMat(THREE, 0x94a3b8),
      );
      dish.position.y = 2.65;
      dish.rotation.x = Math.PI;
      group.add(base, pole, dish);
      return group;
    },
  },
];

const SHAPE_MAP = new Map<ShapeId, ShapeDef>(
  SHAPE_DEFS.map((def) => [def.id, def]),
);

export const SHAPE_IDS: ShapeId[] = SHAPE_DEFS.map((d) => d.id);

/** High-contrast palette derived from catalog (for SVG / 2D reuse). */
export const CATALOG_COLORS: string[] = SHAPE_DEFS.map((d) => d.color);

export function getShapeDef(id: string): ShapeDef | undefined {
  return SHAPE_MAP.get(id as ShapeId);
}

export function createShapeMesh(
  THREE: typeof ThreeNamespace,
  id: string,
): ThreeNamespace.Object3D {
  const def = getShapeDef(id);
  if (!def) {
    throw new Error(`Unknown shape id: ${id}`);
  }
  return def.createMesh(THREE);
}
