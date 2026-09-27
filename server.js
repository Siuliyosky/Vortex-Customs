"use strict";

// ============================================================
// VORTEXCUSTOMS SERVER
// Global Chat + Admin VTX System + SPA Server
// ============================================================

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();

const PORT = process.env.PORT || 3000;

// ============================================================
// CONFIG
// ============================================================

const CHAT_FILE = path.join(__dirname, "chat");

// ============================================================
// ADMIN VTX CONFIG
// ============================================================

// Username and password are stored on the SERVER.
// Never put the admin password inside app.js.

const ADMIN_USERNAME =
  process.env.VORTEX_ADMIN_USERNAME || "siuliyosky";

const ADMIN_PASSWORD =
  process.env.VORTEX_ADMIN_PASSWORD || "";

const ADMIN_SESSION_TIME =
  24 * 60 * 60 * 1000; // 24 hours

// Active admin sessions
const adminSessions = new Map();

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(
  cors({
    origin: true,
    credentials: false
  })
);

app.use(
  express.json({
    limit: "100kb"
  })
);

// Static website files
app.use(
  express.static(__dirname, {
    index: false
  })
);

// ============================================================
// CHAT FILE
// ============================================================

function ensureChatFile() {
  try {
    if (!fs.existsSync(CHAT_FILE)) {
      fs.writeFileSync(
        CHAT_FILE,
        "[]",
        "utf8"
      );

      return;
    }

    const content =
      fs.readFileSync(
        CHAT_FILE,
        "utf8"
      ).trim();

    if (!content) {
      fs.writeFileSync(
        CHAT_FILE,
        "[]",
        "utf8"
      );

      return;
    }

    const parsed =
      JSON.parse(content);

    if (!Array.isArray(parsed)) {
      throw new Error(
        "Chat file must contain an array."
      );
    }

  } catch (error) {
    console.error(
      "Chat file error:",
      error
    );

    // Backup corrupted file
    try {
      if (fs.existsSync(CHAT_FILE)) {
        const backup =
          CHAT_FILE +
          ".backup-" +
          Date.now();

        fs.copyFileSync(
          CHAT_FILE,
          backup
        );
      }
    } catch (backupError) {
      console.error(
        "Could not create chat backup:",
        backupError
      );
    }

    fs.writeFileSync(
      CHAT_FILE,
      "[]",
      "utf8"
    );
  }
}

function readChat() {
  ensureChatFile();

  try {
    const content =
      fs.readFileSync(
        CHAT_FILE,
        "utf8"
      );

    const parsed =
      JSON.parse(content);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed;

  } catch (error) {
    console.error(
      "Could not read chat:",
      error
    );

    return [];
  }
}

function writeChat(messages) {
  if (!Array.isArray(messages)) {
    throw new Error(
      "Chat data must be an array."
    );
  }

  fs.writeFileSync(
    CHAT_FILE,
    JSON.stringify(
      messages,
      null,
      2
    ),
    "utf8"
  );
}

// Make sure the file exists when the server starts.
ensureChatFile();

// ============================================================
// HELPERS
// ============================================================

function cleanUsername(value) {
  return String(
    value || ""
  )
    .trim()
    .slice(0, 32);
}

function cleanMessage(value) {
  return String(
    value || ""
  )
    .trim()
    .slice(0, 300);
}

function createId() {
  return (
    Date.now().toString(36) +
    "-" +
    crypto
      .randomBytes(8)
      .toString("hex")
  );
}

// ============================================================
// ADMIN TOKEN SYSTEM
// ============================================================

function createAdminToken() {
  return crypto
    .randomBytes(32)
    .toString("hex");
}

function getAdminToken(req) {
  // Preferred custom header
  const customToken =
    String(
      req.headers[
        "x-vortex-admin-token"
      ] || ""
    ).trim();

  if (customToken) {
    return customToken;
  }

  // Also support:
  // Authorization: Bearer TOKEN
  const authorization =
    String(
      req.headers.authorization || ""
    ).trim();

  if (
    authorization.toLowerCase()
      .startsWith("bearer ")
  ) {
    return authorization
      .slice(7)
      .trim();
  }

  return "";
}

function getAdminSession(req) {
  const token =
    getAdminToken(req);

  if (!token) {
    return null;
  }

  const session =
    adminSessions.get(token);

  if (!session) {
    return null;
  }

  // Session expired
  if (
    Date.now() >
    session.expiresAt
  ) {
    adminSessions.delete(token);

    return null;
  }

  return {
    token,
    ...session
  };
}

function requireAdmin(req, res, next) {
  const session =
    getAdminSession(req);

  if (!session) {
    return res.status(401).json({
      error:
        "Admin access required."
    });
  }

  req.adminSession =
    session;

  next();
}

// ============================================================
// HEALTH CHECK
// ============================================================

app.get(
  "/api/health",
  (req, res) => {
    res.json({
      ok: true,
      service: "VortexCustoms",
      time: new Date().toISOString()
    });
  }
);

// ============================================================
// ADMIN LOGIN
// ============================================================

app.post(
  "/api/admin/login",
  (req, res) => {
    try {
      const username =
        cleanUsername(
          req.body?.username
        );

      const password =
        String(
          req.body?.password || ""
        );

      // Password must exist in server environment
      if (!ADMIN_PASSWORD) {
        console.error(
          "VORTEX_ADMIN_PASSWORD is not configured."
        );

        return res.status(500).json({
          error:
            "Admin system is not configured on the server."
        });
      }

      // Username required
      if (!username) {
        return res.status(400).json({
          error:
            "Admin username is required."
        });
      }

      // Password required
      if (!password) {
        return res.status(400).json({
          error:
            "Admin password is required."
        });
      }

      // Check username
      if (
        username.toLowerCase() !==
        ADMIN_USERNAME.toLowerCase()
      ) {
        return res.status(401).json({
          error:
            "Invalid admin credentials."
        });
      }

      // Check password
      if (
        password !==
        ADMIN_PASSWORD
      ) {
        return res.status(401).json({
          error:
            "Invalid admin credentials."
        });
      }

      // Create secure session token
      const token =
        createAdminToken();

      const expiresAt =
        Date.now() +
        ADMIN_SESSION_TIME;

      adminSessions.set(
        token,
        {
          username:
            ADMIN_USERNAME,
          expiresAt
        }
      );

      console.log(
        `[ADMIN] Login: ${ADMIN_USERNAME}`
      );

      return res.json({
        success: true,
        token,
        username:
          ADMIN_USERNAME,
        expiresAt
      });

    } catch (error) {
      console.error(
        "Admin login error:",
        error
      );

      return res.status(500).json({
        error:
          "Could not sign in as admin."
      });
    }
  }
);

// ============================================================
// ADMIN LOGOUT
// ============================================================

app.post(
  "/api/admin/logout",
  (req, res) => {
    const token =
      getAdminToken(req);

    if (token) {
      adminSessions.delete(token);
    }

    console.log(
      "[ADMIN] Session logged out."
    );

    return res.json({
      success: true
    });
  }
);

// ============================================================
// ADMIN SESSION CHECK
// ============================================================

app.get(
  "/api/admin/me",
  (req, res) => {
    const session =
      getAdminSession(req);

    if (!session) {
      return res.status(401).json({
        authenticated: false
      });
    }

    return res.json({
      authenticated: true,
      username:
        session.username,
      expiresAt:
        session.expiresAt
    });
  }
);

// ============================================================
// GLOBAL CHAT - GET
// ============================================================

app.get(
  "/api/chat/global",
  (req, res) => {
    try {
      const messages =
        readChat();

      return res.json({
        success: true,
        messages
      });

    } catch (error) {
      console.error(
        "Global chat GET error:",
        error
      );

      return res.status(500).json({
        error:
          "Could not load chat."
      });
    }
  }
);

// ============================================================
// GLOBAL CHAT - NORMAL USER MESSAGE
// ============================================================

app.post(
  "/api/chat/global",
  (req, res) => {
    try {
      const username =
        cleanUsername(
          req.body?.username
        );

      const message =
        cleanMessage(
          req.body?.message
        );

      // Username required
      if (!username) {
        return res.status(401).json({
          error:
            "You must be signed in to chat."
        });
      }

      // Message required
      if (!message) {
        return res.status(400).json({
          error:
            "Message cannot be empty."
        });
      }

      if (message.length > 300) {
        return res.status(400).json({
          error:
            "Message is too long."
        });
      }

      // Normal user message
      const newMessage = {
        id: createId(),

        username,

        message,

        time:
          new Date().toISOString(),

        isAdmin: false
      };

      const messages =
        readChat();

      messages.push(
        newMessage
      );

      writeChat(messages);

      return res.status(201).json({
        success: true,
        message:
          newMessage
      });

    } catch (error) {
      console.error(
        "Global chat POST error:",
        error
      );

      return res.status(500).json({
        error:
          "Could not send message."
      });
    }
  }
);

// ============================================================
// GLOBAL CHAT - ADMIN MESSAGE
// ============================================================

app.post(
  "/api/chat/global/admin",
  requireAdmin,
  (req, res) => {
    try {
      const message =
        cleanMessage(
          req.body?.message
        );

      if (!message) {
        return res.status(400).json({
          error:
            "Message cannot be empty."
        });
      }

      if (message.length > 300) {
        return res.status(400).json({
          error:
            "Message is too long."
        });
      }

      const newMessage = {
        id: createId(),

        username:
          req.adminSession
            .username,

        message,

        time:
          new Date().toISOString(),

        isAdmin: true
      };

      const messages =
        readChat();

      messages.push(
        newMessage
      );

      writeChat(messages);

      console.log(
        `[ADMIN CHAT] ${req.adminSession.username}: ${message}`
      );

      return res.status(201).json({
        success: true,
        message:
          newMessage
      });

    } catch (error) {
      console.error(
        "Admin chat POST error:",
        error
      );

      return res.status(500).json({
        error:
          "Could not send admin message."
      });
    }
  }
);

// ============================================================
// GLOBAL CHAT - CLEAR
// ============================================================

app.delete(
  "/api/chat/global",
  requireAdmin,
  (req, res) => {
    try {
      writeChat([]);

      console.log(
        `[ADMIN] Global Chat cleared by ${req.adminSession.username}`
      );

      return res.json({
        success: true,
        messages: []
      });

    } catch (error) {
      console.error(
        "Clear chat error:",
        error
      );

      return res.status(500).json({
        error:
          "Could not clear chat."
      });
    }
  }
);

// ============================================================
// ADMIN STATUS
// ============================================================

app.get(
  "/api/admin/status",
  (req, res) => {
    res.json({
      enabled:
        Boolean(ADMIN_PASSWORD),

      username:
        ADMIN_USERNAME,

      sessionDuration:
        ADMIN_SESSION_TIME
    });
  }
);

// ============================================================
// SPA FALLBACK
// ============================================================

app.get(
  "*",
  (req, res, next) => {
    // Never intercept API routes.
    if (
      req.path.startsWith("/api/")
    ) {
      return res.status(404).json({
        error:
          "API route not found."
      });
    }

    const indexPath =
      path.join(
        __dirname,
        "index.html"
      );

    if (
      !fs.existsSync(indexPath)
    ) {
      return res.status(404).send(
        "VortexCustoms index.html not found."
      );
    }

    res.sendFile(indexPath);
  }
);

// ============================================================
// ERROR HANDLER
// ============================================================

app.use(
  (error, req, res, next) => {
    console.error(
      "VortexCustoms server error:",
      error
    );

    if (res.headersSent) {
      return next(error);
    }

    res.status(500).json({
      error:
        "Internal server error."
    });
  }
);

// ============================================================
// START SERVER
// ============================================================

app.listen(
  PORT,
  () => {
    console.log("");
    console.log(
      "======================================"
    );
    console.log(
      "       VORTEXCUSTOMS SERVER"
    );
    console.log(
      "======================================"
    );

    console.log(
      `Server: http://localhost:${PORT}`
    );

    console.log(
      `Chat file: ${CHAT_FILE}`
    );

    console.log(
      `Admin username: ${ADMIN_USERNAME}`
    );

    console.log(
      `Admin password: ${
        ADMIN_PASSWORD
          ? "CONFIGURED"
          : "NOT CONFIGURED"
      }`
    );

    console.log(
      `Admin sessions: ${
        ADMIN_SESSION_TIME /
        (60 * 60 * 1000)
      } hours`
    );

    console.log(
      "Admin API: ONLINE"
    );

    console.log(
      "Global Chat: ONLINE"
    );

    console.log(
      "======================================"
    );

    console.log("");
  }
);