// LUMINA GLASS UI — grouped-list geometry.
//
// Rows (GlassListItem and the bespoke rows in the admin panes) render flush
// inside ONE container card rather than as individual floating jewels. The
// container owns the chrome — fill, border, radius, shadow, halo — and tells
// its rows how far to inset themselves so separators line up.
//
// A row with no group above it (e.g. dropped straight into a padded
// GlassCard) reads `null` here and applies no horizontal padding of its own,
// because the card is already padding it.

import { createContext, useContext } from 'react';

export interface GroupGeometry {
  /** Horizontal padding each row applies (the group card itself is unpadded). */
  rowPaddingH: number;
}

export const GroupContext = createContext<GroupGeometry | null>(null);

export function useGroup(): GroupGeometry | null {
  return useContext(GroupContext);
}
