import { createApp } from "./app.js";
import { studioConfig } from "./config.js";

const app = createApp();
const server = app.listen(studioConfig.port, studioConfig.host, () => {
  console.log(`Lala Studio API: http://${studioConfig.host}:${studioConfig.port}`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
