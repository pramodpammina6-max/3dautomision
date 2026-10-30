import type { Material } from '@/common/types';

type Preset = Omit<Material, 'id'>;

const p = (name: string, kind: Material['kind'], color: string, roughness: number, metalness = 0, textureScale = 1, opacity = 1): Preset => ({
  name,
  kind,
  color,
  roughness,
  metalness,
  textureScale,
  opacity,
});

/** Coohom-style material library grouped by category. */
export const MATERIAL_LIBRARY: { category: string; items: Preset[] }[] = [
  {
    category: 'Paint',
    items: [
      p('Warm White', 'paint', '#f1ede4', 0.9),
      p('Greige', 'paint', '#cfc6b8', 0.9),
      p('Sage Green', 'paint', '#a3b5a0', 0.9),
      p('Dusty Blue', 'paint', '#8fa6bd', 0.9),
      p('Terracotta', 'paint', '#c0735a', 0.9),
      p('Charcoal', 'paint', '#3d3f44', 0.85),
      p('Blush', 'paint', '#e8c4bb', 0.9),
      p('Mustard', 'paint', '#d6a94a', 0.9),
    ],
  },
  {
    category: 'Wood',
    items: [
      p('Natural Oak', 'wood', '#b98a5a', 0.6, 0, 1.2),
      p('Light Ash', 'wood', '#d8bf98', 0.55, 0, 1.2),
      p('Walnut', 'wood', '#6b4a2f', 0.5, 0, 1.2),
      p('Ebony', 'wood', '#2e221b', 0.45, 0, 1.2),
      p('Teak', 'wood', '#9a6a3c', 0.55, 0, 1.2),
    ],
  },
  {
    category: 'Tile & Stone',
    items: [
      p('White Ceramic', 'tile', '#ecebe7', 0.3, 0, 0.6),
      p('Grey Porcelain', 'tile', '#9b9c9a', 0.35, 0, 0.8),
      p('Terrazzo', 'tile', '#e1dbd2', 0.4, 0, 0.6),
      p('Carrara Marble', 'marble', '#eeeeec', 0.15, 0, 2),
      p('Nero Marquina', 'marble', '#1e1e20', 0.15, 0, 2),
      p('Polished Concrete', 'concrete', '#a6a5a1', 0.65, 0, 2),
    ],
  },
  {
    category: 'Fabric & Leather',
    items: [
      p('Grey Linen', 'fabric', '#8a8f99', 0.95, 0, 0.4),
      p('Navy Velvet', 'fabric', '#28335a', 0.9, 0, 0.4),
      p('Emerald Velvet', 'fabric', '#1f5c48', 0.9, 0, 0.4),
      p('Oatmeal Boucle', 'fabric', '#d9cfbf', 1, 0, 0.3),
      p('Cognac Leather', 'leather', '#8a4b26', 0.45, 0, 0.5),
      p('Beige Carpet', 'carpet', '#cbbfa8', 1, 0, 0.5),
    ],
  },
  {
    category: 'Metal & Glass',
    items: [
      p('Brushed Steel', 'metal', '#c7cbd1', 0.3, 1),
      p('Brass', 'metal', '#c9a24b', 0.3, 1),
      p('Matte Black Metal', 'metal', '#222225', 0.5, 0.8),
      p('Clear Glass', 'glass', '#cfe6f2', 0.05, 0, 1, 0.3),
      p('Frosted Glass', 'glass', '#e8eef0', 0.4, 0, 1, 0.6),
    ],
  },
];
