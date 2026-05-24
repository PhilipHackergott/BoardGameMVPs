// Entrypoint: boot the authoritative Lacuna server.
//   PORT             — WebSocket port (default 8787)
//   LACUNA_DATA_DIR  — where players.json / matches.json live (default server/data)

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GameServer } from "./server.ts";
import { Store } from "./store.ts";

const PORT = Number(process.env.PORT ?? 8787);
const here = dirname(fileURLToPath(import.meta.url)); // server/src
const DATA_DIR = process.env.LACUNA_DATA_DIR ?? join(here, "..", "data");

const store = new Store(DATA_DIR);
const server = new GameServer({ store, port: PORT });
console.log(`Lacuna server listening on ws://localhost:${server.port}  (data: ${DATA_DIR})`);

process.on("SIGINT", () => {
  server.close();
  process.exit(0);
});
