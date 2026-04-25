/**
 * Il Remote Query su `product_variant` spesso non popola `inventory_quantity`;
 * la giacenza vendibile è su `inventory_items.inventory.location_levels`.
 */
export function inventoryQuantityFromVariantRaw(
  raw: Record<string, unknown>
): number {
  const direct = raw.inventory_quantity
  if (typeof direct === "number" && Number.isFinite(direct)) {
    return Math.max(0, Math.floor(direct))
  }
  const items = raw.inventory_items
  if (!Array.isArray(items)) {
    return 0
  }
  let sum = 0
  for (const link of items) {
    if (!link || typeof link !== "object") {
      continue
    }
    const inv = (link as { inventory?: { location_levels?: unknown } })
      .inventory
    const levels = inv?.location_levels
    if (!Array.isArray(levels)) {
      continue
    }
    for (const lv of levels) {
      if (!lv || typeof lv !== "object") {
        continue
      }
      const l = lv as {
        available_quantity?: number
        stocked_quantity?: number
      }
      const q =
        typeof l.available_quantity === "number"
          ? l.available_quantity
          : typeof l.stocked_quantity === "number"
            ? l.stocked_quantity
            : 0
      sum += q
    }
  }
  return Math.max(0, Math.floor(sum))
}
