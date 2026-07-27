import assert from "node:assert/strict";
import test from "node:test";

import {
  exerciseCustomerProfile,
} from "../../scripts/staging-release-regression.mjs";

const eventDayId = "10000000-0000-4000-8000-000000000001";
const reservationId = "20000000-0000-4000-8000-000000000002";
const customerId = "30000000-0000-4000-8000-000000000003";
const auditLogId = "40000000-0000-4000-8000-000000000004";

test("customer profile coverage executes write, replay, conflict, and attributes", async () => {
  const vipCalls = [];
  const backendCalls = [];
  const client = {
    async requestJson(pathname, init = {}) {
      vipCalls.push({ pathname, init });
      if (init.method === "PATCH") {
        return jsonResponse(200, {
          ok: true,
          action: "customer_profile.attributes_updated",
          auditLogId,
          entityVersion: 5,
        });
      }
      return jsonResponse(200, {
        ok: true,
        customer: { profileVersion: 3 },
      });
    },
  };
  const backendClient = {
    async requestJson(pathname, init) {
      backendCalls.push({ pathname, init });
      if (backendCalls.length === 1) {
        return jsonResponse(200, {
          ok: true,
          action: "customer_profile.upserted",
          auditLogId,
          entityVersion: 4,
          reused: false,
        });
      }
      if (backendCalls.length === 2) {
        return jsonResponse(200, {
          ok: true,
          action: "customer_profile.upserted",
          auditLogId,
          entityVersion: 4,
          reused: true,
        });
      }
      return jsonResponse(409, {
        ok: false,
        error: { code: "VERSION_CONFLICT" },
      });
    },
  };

  const result = await exerciseCustomerProfile({
    client,
    backendClient,
    eventDayId,
    reservationId,
    customerId,
  });

  assert.deepEqual(result, { profileVersion: 4 });
  assert.equal(backendCalls.length, 3);
  assert.equal(
    backendCalls[0].pathname,
    `/api/admin/v2/customers/${customerId}`,
  );
  assert.equal(backendCalls[0].init.basic, false);
  assert.equal(
    backendCalls[0].init.headers["Idempotency-Key"],
    backendCalls[1].init.headers["Idempotency-Key"],
  );
  assert.notEqual(
    backendCalls[1].init.headers["Idempotency-Key"],
    backendCalls[2].init.headers["Idempotency-Key"],
  );
  assert.equal(vipCalls.length, 2);
  assert.equal(vipCalls[1].init.json.expectedVersion, 4);
  assert.equal(vipCalls[1].init.json.reason, "管理画面操作");
  assert.doesNotMatch(
    JSON.stringify({ vipCalls, backendCalls }),
    /authorization|cookie|bypass-secret/iu,
  );
});

function jsonResponse(status, payload) {
  return {
    response: { ok: status >= 200 && status < 300, status },
    payload,
  };
}
