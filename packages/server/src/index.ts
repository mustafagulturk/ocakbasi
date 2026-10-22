import { buildApp } from "./app";
import { Db } from "./db";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL tanımlı değil. Örnek: postgres://kullanici:sifre@localhost:5432/ocakbasi");
  process.exit(1);
}

const db = Db.connect(url);
await db.migrate();

const app = buildApp({ db, corsOrigin: process.env.CORS_ORIGIN, logger: true });
const port = Number(process.env.PORT ?? 3000);
await app.listen({ port, host: "0.0.0.0" });

for (const sinyal of ["SIGINT", "SIGTERM"] as const) {
  process.on(sinyal, async () => {
    await app.close();
    await db.close();
    process.exit(0);
  });
}
