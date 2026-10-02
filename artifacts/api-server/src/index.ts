import app from "./app.js";
import { logger } from "./lib/logger.js";
import { DeepgramAsrProvider } from "@workspace/asr";
import { attachAsrRelay } from "./asr/relay.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = app.listen(port, (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});

// Speech-to-text relay (the vendor key never reaches the browser).
// NOTE: unauthenticated; add session auth before any deployment.
const deepgramKey = process.env["DEEPGRAM_API_KEY"];
attachAsrRelay(server, {
  path: "/api/asr/stream",
  provider: () => (deepgramKey ? new DeepgramAsrProvider({ apiKey: deepgramKey }) : null),
  log: logger,
});
logger.info({ asr: deepgramKey ? "deepgram" : "not configured" }, "ASR relay ready");
