const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { URL } = require("node:url");

const PORT = Number(process.env.PORT || 5173);
const HOST = process.env.HOST || "0.0.0.0";
const ROOT = __dirname;
const STATE_FILE = process.env.PARTY_STATE_FILE || path.join(ROOT, "server-state.json");
const MAX_BODY_BYTES = 1024 * 1024;

let partyState = loadPartyState();
let partyVersion = partyState ? partyState.version || 1 : 0;
const clients = new Set();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);

  try {
    if (request.method === "GET" && requestUrl.pathname === "/api/health") {
      sendJson(response, 200, { ok: true, clients: clients.size, version: partyVersion });
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/api/watch-party") {
      sendJson(response, 200, makePartyPayload("snapshot"));
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/watch-party") {
      const body = await readJsonBody(request);
      if (!body || !body.watchParty) {
        sendJson(response, 400, { error: "watchParty is required" });
        return;
      }

      partyVersion += 1;
      partyState = {
        version: partyVersion,
        watchParty: normalizeIncomingWatchParty(body.watchParty, body.clientNow),
        updatedAt: new Date().toISOString(),
        reason: body.reason || "update",
      };
      persistPartyState();

      const payload = makePartyPayload(partyState.reason);
      sendJson(response, 200, payload);
      broadcast(payload);
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/api/watch-party/events") {
      openEventStream(request, response);
      return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      sendJson(response, 405, { error: "method not allowed" });
      return;
    }

    serveStatic(requestUrl.pathname, response);
  } catch (error) {
    sendJson(response, 500, { error: error.message || "internal server error" });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`music-sns server listening on http://${HOST}:${PORT}`);
});

function openEventStream(request, response) {
  response.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  response.write("retry: 1500\n\n");

  const client = response;
  clients.add(client);
  if (partyState) {
    writeEvent(client, makePartyPayload("connect"));
  }

  request.on("close", () => {
    clients.delete(client);
  });
}

function broadcast(payload) {
  for (const client of clients) {
    writeEvent(client, payload);
  }
}

function writeEvent(client, payload) {
  client.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function makePartyPayload(reason) {
  return {
    reason,
    version: partyVersion,
    serverNow: Date.now(),
    watchParty: partyState?.watchParty || null,
  };
}

function normalizeIncomingWatchParty(value, clientNowValue) {
  const now = Date.now();
  const clientNow = Number(clientNowValue);
  const queue = Array.isArray(value.queue) ? value.queue.slice(0, 200) : [];
  const fallbackTrackId = queue[0]?.id || "";
  const incomingPlayback = value.playback || {};
  const incomingStatus = incomingPlayback.status === "playing" ? "playing" : "paused";
  const incomingStartedAt = Number(incomingPlayback.startedAt);
  const incomingPausedAt = Number(incomingPlayback.pausedAt);
  const position =
    incomingStatus === "playing" && Number.isFinite(clientNow) && Number.isFinite(incomingStartedAt)
      ? Math.max(0, (clientNow - incomingStartedAt) / 1000)
      : Math.max(0, Number.isFinite(incomingPausedAt) ? incomingPausedAt : 0);

  return {
    roomName: String(value.roomName || "ウォッチパーティー"),
    festivalName: String(value.festivalName || "共同リスニング"),
    queue,
    playback: {
      trackId: incomingPlayback.trackId || fallbackTrackId,
      status: incomingStatus,
      startedAt: incomingStatus === "playing" ? now - position * 1000 : null,
      pausedAt: position,
      updatedAt: new Date().toISOString(),
      updatedBy: incomingPlayback.updatedBy || "",
      updatedByName: incomingPlayback.updatedByName || "",
    },
    comments: Array.isArray(value.comments) ? value.comments.slice(-200) : [],
  };
}

function serveStatic(urlPath, response) {
  const safePath = decodeURIComponent(urlPath.split("?")[0]);
  const normalizedPath = safePath === "/" ? "/index.html" : safePath;
  const filePath = path.normalize(path.join(ROOT, normalizedPath));

  if (filePath !== ROOT && !filePath.startsWith(`${ROOT}${path.sep}`)) {
    sendJson(response, 403, { error: "forbidden" });
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      fs.readFile(path.join(ROOT, "index.html"), (fallbackError, fallbackData) => {
        if (fallbackError) {
          sendJson(response, 404, { error: "not found" });
          return;
        }
        response.writeHead(200, { "Content-Type": mimeTypes[".html"] });
        response.end(fallbackData);
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    response.writeHead(200, {
      "Content-Type": mimeTypes[ext] || "application/octet-stream",
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=60",
    });
    response.end(data);
  });
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let body = "";

    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("request body too large"));
        request.destroy();
        return;
      }
      body += chunk;
    });

    request.on("end", () => {
      if (!body) {
        resolve(null);
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("invalid json"));
      }
    });

    request.on("error", reject);
  });
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-cache",
  });
  response.end(JSON.stringify(payload));
}

function loadPartyState() {
  try {
    const raw = fs.readFileSync(STATE_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function persistPartyState() {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(partyState, null, 2));
  } catch (error) {
    console.warn(`failed to persist party state: ${error.message}`);
  }
}
