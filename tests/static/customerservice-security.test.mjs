import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = join(import.meta.dirname, "..", "..");

test("service layer enforces requester-scoped ticket reads", () => {
  const service = readFileSync(
    join(root, "crates/sdkwork-communication-customerservice-service/src/runtime/service.rs"),
    "utf8",
  );
  assert.match(service, /retrieve_ticket_for_requester/);
  assert.match(service, /requester_user_id != requester_user_id/);
});

test("channel credentials use AES-256-GCM envelope", () => {
  const crypto = readFileSync(
    join(root, "crates/sdkwork-communication-customerservice-service/src/credential_crypto.rs"),
    "utf8",
  );
  assert.match(crypto, /aes256gcm-v1/);
  assert.match(crypto, /CUSTOMER_SERVICE_CREDENTIAL_MASTER_KEY/);
  const backend = readFileSync(
    join(root, "crates/sdkwork-routes-customerservice-backend-api/src/backend_routes.rs"),
    "utf8",
  );
  assert.doesNotMatch(backend, /dev-plaintext-v1/);
});

test("internal ingress uses ProblemDetail and tenant header", () => {
  const ingress = readFileSync(
    join(root, "crates/sdkwork-routes-customerservice-internal-api/src/ingress_auth.rs"),
    "utf8",
  );
  assert.match(ingress, /application\/problem\+json/);
  const internal = readFileSync(
    join(root, "crates/sdkwork-routes-customerservice-internal-api/src/internal_routes.rs"),
    "utf8",
  );
  assert.match(internal, /x-sdkwork-tenant-id/);
});

test("frontend uses shared operator SDK headers and app ticket facade", () => {
  const headers = readFileSync(
    join(
      root,
      "apps/sdkwork-customerservice-common/packages/sdkwork-customerservice-client-core/src/session/operatorSdkHeaders.ts",
    ),
    "utf8",
  );
  assert.match(headers, /x-sdkwork-tenant-id/);
  const appService = readFileSync(
    join(
      root,
      "apps/sdkwork-customerservice-common/packages/sdkwork-customerservice-client-core/src/services/ticketAppService.ts",
    ),
    "utf8",
  );
  assert.match(appService, /createMyTicket/);
  const storage = readFileSync(
    join(
      root,
      "apps/sdkwork-customerservice-common/packages/sdkwork-customerservice-client-core/src/session/operatorSessionStorage.ts",
    ),
    "utf8",
  );
  assert.match(storage, /sessionStorage/);
  const drivePort = readFileSync(
    join(
      root,
      "apps/sdkwork-customerservice-common/packages/sdkwork-customerservice-client-core/src/services/driveAttachmentUploadPort.ts",
    ),
    "utf8",
  );
  assert.match(drivePort, /customerservice_h5/);
  const service = readFileSync(
    join(root, "apps/sdkwork-customerservice-common/packages/sdkwork-customerservice-service/src/index.ts"),
    "utf8",
  );
  assert.doesNotMatch(service, /DEMO_TICKETS/);
});

test("app routes map missing IAM context to AuthenticationRequired", () => {
  const response = readFileSync(
    join(root, "crates/sdkwork-routes-customerservice-app-api/src/response.rs"),
    "utf8",
  );
  assert.match(response, /AuthenticationRequired/);
  assert.match(response, /application\/problem\+json/);
  const subject = readFileSync(
    join(root, "crates/sdkwork-routes-customerservice-app-api/src/subject.rs"),
    "utf8",
  );
  assert.match(subject, /AuthenticationRequired/);
});

test("verify pipeline includes API envelope check", () => {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  assert.match(pkg.scripts.verify, /check-api-response-envelope/);
});
