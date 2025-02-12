import { Application, Router } from "./deps.ts";
import { Client } from "./deps.ts";
import { generateApiKeyHash } from "./hash-utils.ts";

const app = new Application();
const port = 8888; // TODO
const router = new Router();

// get env
let apiKeyHash = '';
const apiKeyEnabled = Deno.env.get("API_KEY_AUTH:ENABLE");
if (apiKeyEnabled) {
  // api key hash is in ./client/api-key-hash.ts ?
  apiKeyHash = Deno.env.get("API_KEY_HASH");
}

// from compose.yaml 'environment:'
const databaseUrl = Deno.env.get("DATABASE_URL");
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is not set");
}
const client = new Client(databaseUrl);

await client.connect();

router.get("/", (ctx) => {
  // api key hash from request
  if (apiKeyEnabled) {
    if (apiKeyHash !== ctx.request.headers.get("api-key-hash")) {
      ctx.response.status = 401;
      ctx.response.body = "Unauthorized";
    return;
    }
  }
  ctx.response.body = "Hello, world!";
});

// Add DB-diagnostic endpoint
router.get("/db-test", async (ctx) => {
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

const scriptPath = import.meta.url.replace('file://', '').split('/app/').pop();

app.listen({ port });
console.log(`[ ${scriptPath} ] @ http://localhost:${port}`);
