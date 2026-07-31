import type { OperationOptions } from "./uiTypes";

type Offering = OperationOptions["offerings"][number];

export function resolveWalkInOffering(
  offerings: Offering[],
  tableIds: string[],
  guestCount: number,
) {
  if (tableIds.length === 0 || !Number.isInteger(guestCount) || guestCount < 1) return null;

  return offerings.find((offering) => (
    guestCount >= offering.minGuests
    && guestCount <= offering.maxGuests
    && (
      offering.compatibleTableIds === null
      || offering.compatibleTableIds === undefined
      || tableIds.every((tableId) => offering.compatibleTableIds?.includes(tableId))
    )
  )) ?? null;
}

export function canSelectWalkInTable(
  offerings: Offering[],
  selectedTableIds: string[],
  tableId: string,
  guestCount: number,
) {
  const nextTableIds = selectedTableIds.includes(tableId)
    ? selectedTableIds
    : [...selectedTableIds, tableId];
  return resolveWalkInOffering(offerings, nextTableIds, guestCount) !== null;
}
