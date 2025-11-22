import { Application, Client, Router, send } from "./deps.ts";
import { API_KEY_HASH } from "../webclient/api-key-hash.ts";

// apiKeyEnabled value via compose.yml, which got via devenv.sh loading simtellus/.env
const apiKeyEnabled = Deno.env.get("API_KEY_AUTH_ENABLE") === 'true';

// API Key created at simtellus start,   
const apiKeyHash = API_KEY_HASH; 
const STATIC_FILES_ROOT = "/app/dist";

const validateRequestApiKey = async (ctx) => {
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
const app = new Application();
const router = new Router();

// from compose.yaml 'environment:'
const databaseUrl = Deno.env.get("DATABASE_URL");
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is not set");
}
const client = new Client(databaseUrl);

await client.connect();

app.use(async (context, next) => {
  try {
    await context.send({
      root: STATIC_FILES_ROOT,
      index: "index.html",
    });
  } catch {
    await next();
  }
});
/// Routes ///

// Add DB-diagnostic endpoint
router.get("/db-test", async (ctx) => {
  validateRequestApiKey(ctx, apiKeyEnabled, apiKeyHash);
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
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = {
      status: "error",
      message: error.message
    };
  }
});

app.use(router.routes());
app.use(router.allowedMethods());
app.listen({ port });

const scriptPath = import.meta.url.replace('file://', '').split('/app/').pop();
console.log(`[ ${scriptPath} ] @ http://localhost:${port}`);
