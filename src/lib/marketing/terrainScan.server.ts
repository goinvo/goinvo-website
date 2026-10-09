/**
 * Reading stored terrain scans — nothing else.
 *
 * Kept apart from `terrainRecon.server` (the fetchers, the model calls, the
 * page checks) so the places that only SHOW a scan — Marqueta's answers and
 * the Monday digest — do not load the whole collection stack to read one
 * record.
 */

import { getMarketingWriteClientFor } from './client'
import type { Sitrep } from './sitrep'
import { TERRAIN_SCAN_TYPE, type TerrainScan } from './terrainRecon'

export type StoredTerrainScan = TerrainScan & { sitrep?: Sitrep | null }

/** The most recent scan, by the week it informs. Null when none has run. */
export async function readLatestScan(): Promise<StoredTerrainScan | null> {
  return getMarketingWriteClientFor(TERRAIN_SCAN_TYPE).fetch<StoredTerrainScan | null>(
    `*[_type == $type] | order(week desc)[0]`,
    { type: TERRAIN_SCAN_TYPE },
  )
}
