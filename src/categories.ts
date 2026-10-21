// Colour per nuScenes category family. The full category name is kept on each box;
// this only decides how it is drawn and grouped in the legend.
export interface CategoryStyle { key: string; label: string; color: number }

const STYLES: { prefix: string; style: CategoryStyle }[] = [
  { prefix: 'vehicle.bicycle', style: { key: 'cycle', label: 'Bicycle / motorcycle', color: 0xf2c94c } },
  { prefix: 'vehicle.motorcycle', style: { key: 'cycle', label: 'Bicycle / motorcycle', color: 0xf2c94c } },
  { prefix: 'vehicle', style: { key: 'vehicle', label: 'Vehicle', color: 0x56ccf2 } },
  { prefix: 'human.pedestrian', style: { key: 'pedestrian', label: 'Pedestrian', color: 0xeb5757 } },
  { prefix: 'movable_object', style: { key: 'movable', label: 'Barrier / cone / debris', color: 0xf2994a } },
  { prefix: 'static_object', style: { key: 'static', label: 'Static object', color: 0xbb6bd9 } },
  { prefix: 'animal', style: { key: 'animal', label: 'Animal', color: 0x6fcf97 } },
]
const OTHER: CategoryStyle = { key: 'other', label: 'Other', color: 0xbdbdbd }

export function categoryStyle(category: string): CategoryStyle {
  return STYLES.find((s) => category.startsWith(s.prefix))?.style ?? OTHER
}

export function legendEntries(): CategoryStyle[] {
  const seen = new Map<string, CategoryStyle>()
  for (const { style } of STYLES) seen.set(style.key, style)
  seen.set(OTHER.key, OTHER)
  return [...seen.values()]
}

export const hex = (c: number) => `#${c.toString(16).padStart(6, '0')}`
