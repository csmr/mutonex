import { Application, Router } from "./deps.ts";
import { Client } from "./deps.ts";

const app = new Application();
const port = 8000;
const router = new Router();

const client = new Client({
  user: "your_user",
  database: "your_database",
  hostname: "your_host",
  password: "your_password",
  port: 5432,
});

await client.connect();

router.get("/", (ctx) => {
  ctx.response.body = "Hello, world!";
});

app.use(router.routes());
app.use(router.allowedMethods());

app.listen({ port });
console.log(`Server running on http://localhost:${port}`);