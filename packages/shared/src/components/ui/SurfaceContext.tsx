// LUMINA GLASS UI — surface context. Tells text and content which ground it
// sits on: 'gradient' (the dark mesh — white text with shadows) or 'light'
// (white/grey cards and buttons — dark ink, no shadows). Components that
// paint a light surface (GlassCard, GlassModal's sheet, GlassListItem's
// jewel, light-fill NeuButtons) provide 'light' to their children.

import { createContext, useContext } from 'react';

export type Surface = 'gradient' | 'light';

export const SurfaceContext = createContext<Surface>('gradient');

export function useSurface(): Surface {
  return useContext(SurfaceContext);
}

export const SurfaceProvider = SurfaceContext.Provider;
