import { Application, Router, send, Context } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";
import { API_KEY_HASH } from "../webclient/api-key-hash.ts";
import { dirname, fromFileUrl, join } from "https://deno.land/std@0.178.0/path/mod.ts";

// apiKeyEnabled value via compose.yml, which got via devenv.sh loading simtellus/.env
const apiKeyEnabled = Deno.env.get("API_KEY_AUTH_ENABLE") === 'true';

// API Key created at simtellus start,   
const apiKeyHash = API_KEY_HASH;

// Get static root from environment - set in start-webserver.sh
const STATIC_ROOT_DIR = Deno.env.get("STATIC_ROOT_DIR");
if (!STATIC_ROOT_DIR) {
  console.error("FATAL: STATIC_ROOT_DIR environment variable is not set.");
  Deno.exit(1);
}

const validateRequestApiKey = async (ctx: Context) => {
  if (apiKeyEnabled) {
    console.log("validateRequestApiKey: request headers", ctx.request.headers);
    const requestApiKeyHash = ctx.request.headers.get("api-key-hash") || ctx.request.headers.get("API-KEY-HASH");
    console.log("Request API Key Hash: ", requestApiKeyHash);
    console.log("Expected API Key Hash: ", apiKeyHash);
    // api key hash from request
    if (apiKeyHash !== ctx.request.headers.get("api-key-hash")) {
      ctx.response.status = 401;
      ctx.response.body = "Unauthorized";
    return;
    }
  }
}

const port = 8888; // TODO
export const app = new Application();
const router = new Router();

// from compose.yaml 'environment:'
const databaseUrl = Deno.env.get("DATABASE_URL");
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is not set");
}
export const client = new Client(databaseUrl);

/// Routes ///

// Add DB-diagnostic endpoint
router.get("/db-test", async (ctx: Context) => {
  await validateRequestApiKey(ctx);
  try {
    // Test query
    const result = await client.queryObject`
      SELECT current_database() as db_name, 
             current_user as user_name,
             version() as version
    `;
    ctx.response.body = {
      status: "connected",
      details: result.rows[0],
      database_url: databaseUrl.replace(/:[^:]*@/, ':***@') // Hide password in output
    };
  } catch (error: unknown) {
    ctx.response.status = 500;
    ctx.response.body = {
      status: "error",
      message: (error as Error).message
    };
  }
});

// Middleware for API router
app.use(router.routes());
app.use(router.allowedMethods());

// Fallback to static file server for non-API routes.
// Serves index.html for the root route ("/").
app.use(async (context) => {
  await send(context, context.request.url.pathname, {
    root: STATIC_ROOT_DIR,
    index: "index.html",
  });
});

if (import.meta.main) {
  await client.connect();
  app.listen({ port });
  const scriptPath = import.meta.url.replace('file://', '').split('/app/').pop();
  console.log(`[ ${scriptPath} ] @ http://localhost:${port}`);
}
