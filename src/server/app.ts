import { Application, Router } from "./deps.ts";
import { Client } from "./deps.ts";

const app = new Application();
const port = 8000;
const router = new Router();

const databaseUrl = Deno.env.get("DATABASE_URL");
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const client = new Client(databaseUrl);

await client.connect();

router.get("/", (ctx) => {
  ctx.response.body = "Hello, world!";
});

app.use(router.routes());
app.use(router.allowedMethods());

app.listen({ port });
console.log(`Server running on http://localhost:${port}`);