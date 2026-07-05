#!/usr/bin/env node
/**
 * Post-deploy gateway smoke checks: /healthz, /readyz, /metrics.
 * Optional app-api list when IAM smoke tokens are provided via env.
 *
 * Env:
 *   SDKWORK_CUSTOMER_SERVICE_APPLICATION_PUBLIC_HTTP_URL | CUSTOMER_SERVICE_GATEWAY_BASE_URL
 *   CUSTOMER_SERVICE_SMOKE_AUTH_TOKEN + CUSTOMER_SERVICE_SMOKE_ACCESS_TOKEN (optional)
 *   CUSTOMER_SERVICE_SMOKE_TENANT_ID + CUSTOMER_SERVICE_SMOKE_USER_ID (optional, with tokens)
 */
import process from "node:process";

function fail(message) {
  console.error(`customerservice_gateway_smoke: ${message}`);
  process.exit(1);
}

function resolveBaseUrl() {
  const candidate =
    process.env.SDKWORK_CUSTOMER_SERVICE_APPLICATION_PUBLIC_HTTP_URL?.trim() ||
    process.env.CUSTOMER_SERVICE_GATEWAY_BASE_URL?.trim() ||
    "http://127.0.0.1:18091";
  return candidate.replace(/\/+$/u, "");
}

async function probeJson(path, { label = path, expectStatus = 200 } = {}) {
  const url = `${resolveBaseUrl()}${path}`;
  let response;
  try {
    response = await fetch(url, { redirect: "manual" });
  } catch (error) {
    fail(`${label} request failed (${url}): ${error instanceof Error ? error.message : String(error)}`);
  }

  if (response.status !== expectStatus) {
    const body = await response.text();
    fail(`${label} expected HTTP ${expectStatus}, got ${response.status}: ${body.slice(0, 240)}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    fail(`${label} expected application/json, got ${contentType || "(missing)"}`);
  }

  return response.json();
}

async function probeText(path, { label = path, expectStatus = 200, includes } = {}) {
  const url = `${resolveBaseUrl()}${path}`;
  let response;
  try {
    response = await fetch(url, { redirect: "manual" });
  } catch (error) {
    fail(`${label} request failed (${url}): ${error instanceof Error ? error.message : String(error)}`);
  }

  if (response.status !== expectStatus) {
    const body = await response.text();
    fail(`${label} expected HTTP ${expectStatus}, got ${response.status}: ${body.slice(0, 240)}`);
  }

  const body = await response.text();
  if (includes && !body.includes(includes)) {
    fail(`${label} response missing expected marker: ${includes}`);
  }
  return body;
}

function hasValue(value) {
  return typeof value === "string" && value.trim().length > 0;
}

async function optionalAppApiListSmoke() {
  const authToken = process.env.CUSTOMER_SERVICE_SMOKE_AUTH_TOKEN?.trim();
  const accessToken = process.env.CUSTOMER_SERVICE_SMOKE_ACCESS_TOKEN?.trim();
  if (!authToken || !accessToken) {
    return;
  }

  const tenantId = process.env.CUSTOMER_SERVICE_SMOKE_TENANT_ID?.trim();
  const userId = process.env.CUSTOMER_SERVICE_SMOKE_USER_ID?.trim();
  const headers = {
    Authorization: `Bearer ${authToken}`,
    "Access-Token": accessToken,
  };
  if (hasValue(tenantId)) {
    headers["x-sdkwork-tenant-id"] = tenantId;
  }
  if (hasValue(userId)) {
    headers["x-sdkwork-user-id"] = userId;
    headers["x-sdkwork-actor-id"] = userId;
  }

  const url = `${resolveBaseUrl()}/app/v3/api/customer_services/tickets?page=1&pageSize=1`;
  let response;
  try {
    response = await fetch(url, { headers, redirect: "manual" });
  } catch (error) {
    fail(`app-api list request failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (response.status !== 200) {
    const body = await response.text();
    fail(`app-api list expected HTTP 200, got ${response.status}: ${body.slice(0, 240)}`);
  }

  const json = await response.json();
  if (json?.code !== 0) {
    fail(`app-api list expected envelope code 0, got ${String(json?.code)}`);
  }
  if (!json?.data || !Array.isArray(json.data.items) || !json.data.pageInfo) {
    fail("app-api list response missing data.items + data.pageInfo");
  }
  if (!hasValue(json.traceId)) {
    fail("app-api list response missing traceId");
  }
}

const baseUrl = resolveBaseUrl();
console.log(`customerservice_gateway_smoke: probing ${baseUrl}`);

const health = await probeJson("/healthz", { label: "healthz" });
if (health?.status !== "ok") {
  fail(`healthz expected status "ok", got ${JSON.stringify(health)}`);
}

const ready = await probeJson("/readyz", { label: "readyz" });
if (ready?.status !== "ready") {
  fail(`readyz expected status "ready", got ${JSON.stringify(ready)}`);
}

await probeText("/metrics", {
  label: "metrics",
  includes: "sdkwork_http_requests_total",
});

await optionalAppApiListSmoke();

console.log("customerservice_gateway_smoke: ok");
