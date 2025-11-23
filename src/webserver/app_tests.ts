// Set a dummy value for the environment variable before importing the app
Deno.env.set("STATIC_ROOT_DIR", "src/dist");

import { load } from "https://deno.land/std@0.178.0/dotenv/mod.ts";
await load({ envPath: "./src/.env", export: true });

import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.178.0/testing/asserts.ts";
import { app, client } from "./app.ts";
import { httpErrors, Application } from "https://deno.land/x/oak@v12.6.1/mod.ts";

async function handleRequest(app: Application, request: Request): Promise<Response> {
  const response = await app.handle(request);
  if (!response) {
    throw new httpErrors.NotFound();
  }
  return response;
}

Deno.test(
  "GET / - Should return index.html",
  async () => {
    const request = new Request("http://localhost:8888/", {
      method: "GET",
    });
    const response = await handleRequest(app, request);
    assertEquals(response.status, 200);
    assertEquals(response.headers.get("content-type"), "text/html; charset=utf-8");
    const text = await response.text();
    assert(text.includes("<html>"));
  },
);

Deno.test(
  "GET /db-test - Should return database status",
  async () => {
    await client.connect();
    const request = new Request("http://localhost:8888/db-test", {
      method: "GET",
    });
    const response = await handleRequest(app, request);
    assertEquals(response.status, 200);
    assertEquals(response.headers.get("content-type"), "application/json; charset=utf-8");
    const json = await response.json();
    assertEquals(json.status, "connected");
    assert(json.details.db_name);
    await client.end();
  },
);
