import assert from "node:assert/strict";
import test from "node:test";

import {
  canSelectWalkInTable,
  resolveWalkInOffering,
} from "../../src/components/admin/vip-floor-v2/contract/walkInOffering.ts";

const offerings = [
  {
    id: "small",
    name: "Small",
    minGuests: 1,
    maxGuests: 4,
    minSpendYen: 0,
    compatibleTableIds: ["vip-1", "vip-2"],
  },
  {
    id: "large",
    name: "Large",
    minGuests: 3,
    maxGuests: 12,
    minSpendYen: 0,
    compatibleTableIds: ["vip-2", "vip-3"],
  },
];

test("Walk-in offering is resolved internally from guests and the complete table set", () => {
  assert.equal(resolveWalkInOffering(offerings, ["vip-1"], 2)?.id, "small");
  assert.equal(resolveWalkInOffering(offerings, ["vip-2"], 3)?.id, "small");
  assert.equal(resolveWalkInOffering(offerings, ["vip-2", "vip-3"], 6)?.id, "large");
  assert.equal(resolveWalkInOffering(offerings, ["vip-1", "vip-3"], 3), null);
});

test("table choices are disabled before they can create an incompatible hidden plan", () => {
  assert.equal(canSelectWalkInTable(offerings, ["vip-1"], "vip-2", 2), true);
  assert.equal(canSelectWalkInTable(offerings, ["vip-1"], "vip-3", 3), false);
  assert.equal(canSelectWalkInTable(offerings, [], "vip-3", 6), true);
});
