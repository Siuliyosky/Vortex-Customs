(() => {
  "use strict";

  const app = document.getElementById("app");

  const STORAGE = {
    user: "vx_user",
    matches: "vx_matches",
    trades: "vx_trades",
    global: "vx_global",
    shop: "vx_shop"
  };

  const ADMIN_STORAGE = {
    token: "vx_admin_token",
    username: "vx_admin_username"
  };

  const defaultUser = {
    loggedIn: false,
    username: "",
    avatar: ""
  };

  let user = load(STORAGE.user, defaultUser);
  let matches = load(STORAGE.matches, []);
  let trades = load(STORAGE.trades, []);
  let messages = [];

  const SHOP_ITEMS = [
    {
      id: "vtx-recruit",
      name: "VTX Recruit",
      price: 1.99,
      billing: "one-time",
      description: "Vortex community tag."
    },
    {
      id: "vtx-grinder",
      name: "VTX Grinder",
      price: 3.99,
      billing: "one-time",
      description: "Premium grinder tag and profile badge."
    },
    {
      id: "vtx-veteran",
      name: "VTX Veteran",
      price: 5.99,
      billing: "one-time",
      description: "Veteran community tag and profile badge."
    },
    {
      id: "vtx-priority",
      name: "VTX Priority",
      price: 12.99,
      billing: "monthly",
      description: "Priority queue access, 5 queue skips every day and Bot Lobbies."
    }
  ];

  const SUBREGIONS = {
    "NA Central": [
      "Texas",
      "Illinois"
    ],
    "NA East": [
      "Virginia",
      "Ohio"
    ],
    "NA West": [
      "California",
      "Oregon"
    ],
    "EU": [
      "London",
      "Frankfurt"
    ],
    "BR": [
      "São Paulo"
    ],
    "OCE": [
      "Sydney"
    ],
    "ASIA": [
      "Tokyo",
      "Singapore"
    ],
    "ME": [
      "Bahrain"
    ]
  };

  // ============================================================
  // SPRITE TRADING
  // ============================================================

  const SPRITE_RARITIES = [
    "Common",
    "Uncommon",
    "Rare",
    "Epic",
    "Legendary",
    "Mythic"
  ];

  /*
   * IMPORTANTE:
   * Aquí se colocarán los Sprites reales del juego.
   *
   * Por ahora están vacíos para no inventar nombres.
   * Cuando me digas el juego, se pueden llenar con todos
   * los Sprites correspondientes a cada rareza.
   */
  const SPRITES_BY_RARITY = {
    Common: [],
    Uncommon: [],
    Rare: [],
    Epic: [],
    Legendary: [],
    Mythic: []
  };

  function load(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  function save(key, value) {
    localStorage.setItem(
      key,
      JSON.stringify(value)
    );
  }

  function syncUser() {
    user = load(
      STORAGE.user,
      defaultUser
    );

    return user;
  }

  function esc(value) {
    return String(value ?? "").replace(
      /[&<>"']/g,
      c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[c])
    );
  }

  function uid() {
    return (
      "vx_" +
      Date.now().toString(36) +
      Math.random()
        .toString(36)
        .slice(2, 8)
    );
  }

  function randomKey() {
    return Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase();
  }

  function avatar(name) {
    return String(name || "?")
      .slice(0, 1)
      .toUpperCase();
  }

  function getCurrentUserName() {
    syncUser();

    return user.loggedIn
      ? user.username
      : "";
  }

  // ============================================================
  // ADMIN VTX
  // ============================================================

  function getAdminToken() {
    return localStorage.getItem(
      ADMIN_STORAGE.token
    ) || "";
  }

  function getAdminUsername() {
    return localStorage.getItem(
      ADMIN_STORAGE.username
    ) || "";
  }

  function isAdmin() {
    return Boolean(
      getAdminToken()
    );
  }

  function clearAdminStorage() {
    localStorage.removeItem(
      ADMIN_STORAGE.token
    );

    localStorage.removeItem(
      ADMIN_STORAGE.username
    );
  }

  async function verifyAdminSession() {
    const token =
      getAdminToken();

    if (!token) {
      return false;
    }

    try {
      const res =
        await fetch(
          "/api/admin/me",
          {
            method: "GET",
            headers: {
              "x-vortex-admin-token":
                token
            },
            cache: "no-store"
          }
        );

      if (!res.ok) {
        clearAdminStorage();
        return false;
      }

      const data =
        await res.json();

      if (
        !data.authenticated ||
        !data.username
      ) {
        clearAdminStorage();
        return false;
      }

      localStorage.setItem(
        ADMIN_STORAGE.username,
        data.username
      );

      return true;

    } catch {
      return false;
    }
  }

  function toast(text) {
    const el =
      document.getElementById("toast");

    if (!el) return;

    el.textContent = text;

    el.classList.add("show");

    clearTimeout(
      window.__toastTimer
    );

    window.__toastTimer =
      setTimeout(() => {
        el.classList.remove("show");
      }, 2600);
  }

  function navigate(path) {
    history.pushState(
      {},
      "",
      path
    );

    render();
  }

  function login() {
    const name = prompt(
      "Enter your Vortex username:"
    );

    if (!name) return;

    const username =
      name
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 24);

    if (!username) return;

    user = {
      loggedIn: true,
      username,
      avatar: avatar(username)
    };

    save(
      STORAGE.user,
      user
    );

    toast(
      `Signed in as ${username}`
    );

    render();
  }

  function logout() {
    user = {
      ...defaultUser
    };

    save(
      STORAGE.user,
      user
    );

    toast("Signed out.");

    render();
  }

  async function loadGlobalChat() {
    try {
      const res =
        await fetch(
          "/api/chat/global",
          {
            cache: "no-store"
          }
        );

      if (!res.ok) {
        throw new Error();
      }

      const data =
        await res.json();

      messages =
        Array.isArray(
          data.messages
        )
          ? data.messages
          : [];

      save(
        STORAGE.global,
        messages
      );

    } catch {
      messages =
        load(
          STORAGE.global,
          []
        );
    }

    return messages;
  }

  async function sendGlobalMessage(
    message
  ) {
    const username =
      getCurrentUserName();

    if (!username) {
      return toast(
        "Sign in to use Global Chat."
      );
    }

    const res =
      await fetch(
        "/api/chat/global",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            username,
            message
          })
        }
      );

    const data =
      await res.json();

    if (!res.ok) {
      throw new Error(
        data.error ||
        "Could not send message."
      );
    }

    messages.push(
      data.message
    );

    save(
      STORAGE.global,
      messages
    );
  }

  async function sendAdminMessage(
    message
  ) {
    const token =
      getAdminToken();

    if (!token) {
      clearAdminStorage();

      throw new Error(
        "Admin session expired. Sign in again."
      );
    }

    const res =
      await fetch(
        "/api/chat/global/admin",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            "x-vortex-admin-token":
              token
          },
          body: JSON.stringify({
            message
          })
        }
      );

    const data =
      await res.json();

    if (res.status === 401) {
      clearAdminStorage();

      throw new Error(
        "Admin session expired. Sign in again."
      );
    }

    if (!res.ok) {
      throw new Error(
        data.error ||
        "Admin message failed."
      );
    }

    messages.push(
      data.message
    );

    save(
      STORAGE.global,
      messages
    );
  }

  async function clearGlobalChat() {
    const token =
      getAdminToken();

    if (!token) {
      clearAdminStorage();

      throw new Error(
        "Admin session expired. Sign in again."
      );
    }

    const res =
      await fetch(
        "/api/chat/global",
        {
          method: "DELETE",
          headers: {
            "x-vortex-admin-token":
              token
          }
        }
      );

    const data =
      await res.json();

    if (res.status === 401) {
      clearAdminStorage();

      throw new Error(
        "Admin session expired. Sign in again."
      );
    }

    if (!res.ok) {
      throw new Error(
        data.error ||
        "Could not clear chat."
      );
    }

    messages = [];

    save(
      STORAGE.global,
      []
    );
  }

  function navbar() {
    const currentUser =
      syncUser();

    const username =
      getCurrentUserName();

    const owned =
      load(
        STORAGE.shop,
        []
      );

    const shopCount =
      owned.length;

    return `
      <header class="navbar">
        <div class="nav-inner">

          <a
            href="/"
            class="brand"
            data-link
          >
            <span class="brand-mark">
              V
            </span>

            <span class="brand-name">
              Vortex<span>Customs</span>
            </span>
          </a>

          <nav class="nav-links">

            <a href="/" data-link>
              Home
            </a>

            <a href="/matches" data-link>
              Matches
            </a>

            <a href="/host" data-link>
              Host
            </a>

            <a href="/bot-lobbies" data-link>
              Bot Lobbies
            </a>

            <a href="/trading" data-link>
              Sprite Trading
            </a>

            <a href="/shop" data-link>
              Shop
            </a>

            <a href="/help" data-link>
              Help
            </a>

          </nav>

          <div class="nav-right">

            <button
              class="nav-icon"
              data-action="shop"
              title="Shop"
            >
              ⚡
              <span>${shopCount}</span>
            </button>

            <button
              class="nav-icon global-chat-btn"
              data-action="messages"
              title="Global Chat"
            >
              💬
            </button>

            ${
              currentUser.loggedIn &&
              username
                ? `
                  <button
                    class="user-menu"
                    data-action="profile"
                  >
                    <span class="avatar">
                      ${esc(
                        avatar(username)
                      )}
                    </span>

                    <span>
                      ${esc(username)}
                    </span>
                  </button>
                `
                : `
                  <button
                    class="btn btn-dark btn-small"
                    data-action="login"
                  >
                    Sign in with Discord
                  </button>
                `
            }

          </div>

        </div>
      </header>
    `;
  }

  function footer() {
    return `
      <footer class="footer">

        <div class="footer-grid">

          <div>

            <div class="footer-logo">
              VortexCustoms
            </div>

            <p>
              Fortnite custom matches,
              bot lobbies and a community
              built for grinders.
            </p>

          </div>

          <div>

            <h4>Play</h4>

            <a href="/matches" data-link>
              Matches
            </a>

            <a href="/host" data-link>
              Host a game
            </a>

            <a href="/bot-lobbies" data-link>
              Bot Lobbies
            </a>

            <a href="/trading" data-link>
              Sprite Trading
            </a>

          </div>

          <div>

            <h4>Explore</h4>

            <a href="/help" data-link>
              Guides
            </a>

            <a href="/help" data-link>
              Help
            </a>

            <a href="/shop" data-link>
              Shop
            </a>

          </div>

          <div>

            <h4>Community</h4>

            <a href="#" data-noop>
              Discord
            </a>

            <a href="#" data-noop>
              About
            </a>

            <a href="#" data-noop>
              Contact
            </a>

          </div>

          <div>

            <h4>Legal</h4>

            <a href="#" data-noop>
              Terms of Service
            </a>

            <a href="#" data-noop>
              Privacy Policy
            </a>

            <a href="#" data-noop>
              Cookie Policy
            </a>

          </div>

        </div>

        <div class="footer-bottom">
          © 2026 VortexCustoms.
          Not affiliated with Epic Games.
          Fortnite is a trademark of Epic Games, Inc.
        </div>

      </footer>
    `;
  }

  function shell(content, wide = false) {
    return `
      ${navbar()}

      <main class="${wide ? "page wide-page" : "page"}">
        ${content}
      </main>

      ${footer()}
    `;
  }

  function homePage() {
    return shell(`

      <section class="hero">

        <div class="hero-copy">

          <div class="eyebrow">
            VORTEXCUSTOMS / COMPETITIVE
          </div>

          <h1>
            Host Fortnite Customs.<br>
            <span>Your way.</span>
          </h1>

          <p>
            Create a match, find active
            lobbies, join bot lobbies and
            build your Vortex profile.
          </p>

          <div class="hero-actions">

            <button
              class="btn btn-purple"
              data-action="host"
            >
              Host a Match
            </button>

            <button
              class="btn btn-outline"
              data-action="matches"
            >
              Browse Live Matches
            </button>

          </div>

          <div class="hero-stats">

            <div>
              <strong>
                ${matches.length}
              </strong>

              <span>
                Live matches
              </span>
            </div>

            <div>
              <strong>
                24/7
              </strong>

              <span>
                Community
              </span>
            </div>

            <div>
              <strong>
                NA
              </strong>

              <span>
                Central focus
              </span>
            </div>

          </div>

        </div>

        <div class="hero-panel">

          <div class="panel-glow"></div>

          <div class="hero-panel-top">

            <span>
              VORTEX
            </span>

            <span class="live-dot">
              ● LIVE
            </span>

          </div>

          <div class="hero-card-main">

            <div class="big-v">
              V
            </div>

            <div>

              <small>
                COMMUNITY
              </small>

              <b>
                GRIND HARDER.
              </b>

            </div>

          </div>

          <div class="mini-row">
            <span>Customs</span>
            <b>Ready</b>
          </div>

          <div class="mini-row">
            <span>Bot Lobbies</span>
            <b>Open</b>
          </div>

          <div class="mini-row">
            <span>Trading</span>
            <b>Active</b>
          </div>

        </div>

      </section>

      <section class="section">

        <div class="section-head">

          <div>

            <div class="eyebrow">
              QUICK START
            </div>

            <h2>
              How it works
            </h2>

          </div>

        </div>

        <div class="feature-grid three">

          <article class="feature-card">

            <div class="feature-num">
              01
            </div>

            <h3>Create</h3>

            <p>
              Set your region, mode,
              team size and custom key.
            </p>

          </article>

          <article class="feature-card">

            <div class="feature-num">
              02
            </div>

            <h3>Share</h3>

            <p>
              Send your lobby details
              to your duo, trio or community.
            </p>

          </article>

          <article class="feature-card">

            <div class="feature-num">
              03
            </div>

            <h3>Play</h3>

            <p>
              Start when everyone is ready
              and run your custom.
            </p>

          </article>

        </div>

      </section>

      <section class="section">

        <div class="section-head">

          <div>

            <div class="eyebrow">
              BUILT FOR GRINDERS
            </div>

            <h2>
              Everything in one hub
            </h2>

          </div>

          <button
            class="btn btn-outline btn-small"
            data-action="help"
          >
            Learn more
          </button>

        </div>

        <div class="feature-grid four">

          <article class="feature-card">

            <div class="icon-box">⌁</div>

            <h3>Custom Matches</h3>

            <p>
              Fast lobby creation with
              clean match details.
            </p>

          </article>

          <article class="feature-card">

            <div class="icon-box">◈</div>

            <h3>Bot Lobbies</h3>

            <p>
              Organize practice sessions
              and warmups.
            </p>

          </article>

          <article class="feature-card">

            <div class="icon-box">◆</div>

            <h3>Sprite Trading</h3>

            <p>
              Post and discover community
              trade offers.
            </p>

          </article>

          <article class="feature-card">

            <div class="icon-box">◎</div>

            <h3>Global Chat</h3>

            <p>
              One shared chat for the
              whole Vortex community.
            </p>

          </article>

        </div>

      </section>

    `);
  }

  function matchesPage() {

    const region =
      document.getElementById(
        "filter-region"
      )?.value || "all";

    const mode =
      document.getElementById(
        "filter-mode"
      )?.value || "all";

    const filtered =
      matches.filter(
        m =>
          (
            region === "all" ||
            m.region === region
          ) &&
          (
            mode === "all" ||
            m.mode === mode
          )
      );

    return shell(`

      <section class="page-head">

        <div>

          <div class="eyebrow">
            MATCHMAKING
          </div>

          <h1>
            Live Matches
          </h1>

          <p>
            Find a custom and jump
            into the queue.
          </p>

        </div>

        <button
          class="btn btn-purple"
          data-action="host"
        >
          ＋ Host a Match
        </button>

      </section>

      <section class="filter-bar">

        <select id="filter-region">

          <option value="all">
            REGION
          </option>

          <option>NA Central</option>
          <option>NA East</option>
          <option>NA West</option>
          <option>EU</option>
          <option>BR</option>
          <option>OCE</option>
          <option>ASIA</option>
          <option>ME</option>

        </select>

        <select id="filter-mode">

          <option value="all">
            MODE
          </option>

          <option>Battle Royale</option>
          <option>Reload</option>
          <option>Zero Build</option>

        </select>

        <button
          class="btn btn-dark btn-small"
          data-action="refresh-matches"
        >
          Refresh
        </button>

      </section>

      <section class="match-grid">

        ${
          filtered.length
            ? filtered
                .map(matchCard)
                .join("")
            : `
              <div class="empty-state">

                <div class="empty-icon">
                  ⌁
                </div>

                <h3>
                  No live matches
                </h3>

                <p>
                  Host the first custom
                  and it will appear here.
                </p>

                <button
                  class="btn btn-purple btn-small"
                  data-action="host"
                >
                  Host a Match
                </button>

              </div>
            `
        }

      </section>

    `);
  }

  function matchCard(m) {

    return `
      <article class="match-card">

        <div class="match-card-top">

          <span class="status-pill">
            ${esc(
              m.status || "OPEN"
            )}
          </span>

          <span>
            ${esc(m.region)}
            ${
              m.subregion
                ? ` · ${esc(m.subregion)}`
                : ""
            }
          </span>

        </div>

        <h3>
          ${esc(
            m.title ||
            "Vortex Custom"
          )}
        </h3>

        <div class="match-meta">

          <span>${esc(m.mode)}</span>
          <span>Team ${esc(m.teamSize)}</span>
          <span>${esc(m.building)}</span>

        </div>

        <div class="match-bottom">

          <span>
            Host:
            <b>${esc(m.host)}</b>
          </span>

          <button
            class="btn btn-purple btn-small"
            data-action="match"
            data-id="${esc(m.id)}"
          >
            View
          </button>

        </div>

      </article>
    `;
  }

  function hostPage() {

    return shell(`

      <section class="page-head">

        <div>

          <div class="eyebrow">
            HOST
          </div>

          <h1>
            Host a Match
          </h1>

          <p>
            Build a lobby in a few seconds.
          </p>

        </div>

      </section>

      <section class="form-card">

        <div class="form-grid">

          <label>
            Match title

            <input
              id="host-title"
              placeholder="Friday Night Customs"
            >
          </label>

          <label>
            Mode

            <select id="host-mode">
              <option>Battle Royale</option>
              <option>Reload</option>
              <option>Zero Build</option>
            </select>

          </label>

          <label>
            Region

            <select id="host-region">
              <option>NA Central</option>
              <option>NA East</option>
              <option>NA West</option>
              <option>EU</option>
              <option>BR</option>
              <option>OCE</option>
              <option>ASIA</option>
              <option>ME</option>
            </select>

          </label>

          <label>
            Sub-region

            <select id="host-subregion"></select>

          </label>

          <label>
            Team size

            <select id="host-team">
              <option value="Solo">Solo</option>
              <option value="Duos">Duos</option>
              <option value="Trios">Trios</option>
              <option value="Squads">Squads</option>
            </select>

          </label>

          <label>
            Building

            <select id="host-building">
              <option>Build</option>
              <option>Zero Build</option>
            </select>

          </label>

          <label>
            Custom Key

            <input
              id="host-key"
              placeholder="Leave blank for random"
              maxlength="16"
            >

          </label>

          <label>
            Lobby password

            <input
              id="host-password"
              type="password"
              placeholder="Optional"
            >

          </label>

          <label>
            Offspawn

            <select id="host-offspawn">
              <option>Allowed</option>
              <option>Not allowed</option>
            </select>

          </label>

        </div>

        <div class="form-actions">

          <button
            class="btn btn-purple"
            data-action="create-match"
          >
            Create Match
          </button>

          <button
            class="btn btn-outline"
            data-action="matches"
          >
            Cancel
          </button>

        </div>

      </section>

    `);
  }

  function matchDetailPage(id) {

    const m =
      matches.find(
        x => x.id === id
      );

    if (!m) {

      return shell(`

        <div class="empty-state page-empty">

          <h2>Match not found</h2>

          <button
            class="btn btn-purple"
            data-action="matches"
          >
            Back to Matches
          </button>

        </div>

      `);

    }

    const owner =
      getCurrentUserName() ===
      m.host;

    return shell(`

      <section class="page-head">

        <div>

          <div class="eyebrow">
            ${esc(
              m.status || "OPEN"
            )}
            / MATCH
          </div>

          <h1>
            ${esc(m.title)}
          </h1>

          <p>
            Hosted by ${esc(m.host)}
          </p>

        </div>

        <button
          class="btn btn-outline"
          data-action="matches"
        >
          ← Back
        </button>

      </section>

      <section class="detail-layout">

        <div class="detail-card">

          <div class="detail-key">

            <small>CUSTOM KEY</small>

            <strong>
              ${esc(m.key)}
            </strong>

            <button
              class="btn btn-dark btn-small"
              data-action="copy-key"
              data-key="${esc(m.key)}"
            >
              Copy
            </button>

          </div>

          <div class="detail-grid">

            <div>
              <small>MODE</small>
              <b>${esc(m.mode)}</b>
            </div>

            <div>
              <small>REGION</small>
              <b>${esc(m.region)}</b>
            </div>

            <div>
              <small>SUB-REGION</small>
              <b>
                ${esc(
                  m.subregion ||
                  "Not selected"
                )}
              </b>
            </div>

            <div>
              <small>TEAM</small>
              <b>${esc(m.teamSize)}</b>
            </div>

            <div>
              <small>BUILDING</small>
              <b>${esc(m.building)}</b>
            </div>

            <div>
              <small>OFFSPAWN</small>
              <b>${esc(m.offspawn)}</b>
            </div>

            <div>
              <small>PASSWORD</small>
              <b>
                ${
                  m.password
                    ? "Protected"
                    : "None"
                }
              </b>
            </div>

          </div>

          ${
            owner
              ? `
                <div class="owner-actions">

                  <button
                    class="btn btn-purple"
                    data-action="start-match"
                    data-id="${esc(m.id)}"
                  >
                    Start Match
                  </button>

                  <button
                    class="btn btn-danger"
                    data-action="cancel-match"
                    data-id="${esc(m.id)}"
                  >
                    Cancel Match
                  </button>

                </div>
              `
              : ""
          }

        </div>

        <aside class="side-card">

          <div class="eyebrow">
            HOST
          </div>

          <h3>${esc(m.host)}</h3>

          <p>
            Only the creator can start
            or cancel this match.
          </p>

        </aside>

      </section>

    `);
  }

  function botLobbiesPage() {

    const owned =
      load(
        STORAGE.shop,
        []
      );

    const hasPriority =
      owned.includes("vtx-priority");

    const hasBotMonthly =
      owned.includes("bot-lobby-monthly");

    const hasBotAnnual =
      owned.includes("bot-lobby-annual");

    const botAccess =
      hasPriority ||
      hasBotMonthly ||
      hasBotAnnual;

    return shell(`

      <section class="bot-hero">

        <div class="bot-hero-copy">

          <div class="eyebrow">
            VORTEXCUSTOMS / BOT LOBBIES
          </div>

          <h1>
            Set up your
            <span>next match.</span>
          </h1>

          <p>
            Practice your aim, mechanics and movement
            inside private Fortnite bot lobbies.
            Bring your friends and get your reps in.
          </p>

          <div class="bot-status">

            <span class="${
              botAccess
                ? "status-dot active"
                : "status-dot"
            }"></span>

            ${
              botAccess
                ? "Bot Lobbies unlocked"
                : "Bot Lobbies subscription required"
            }

          </div>

        </div>

        <div class="bot-visual">

          <div class="bot-orb">
            <span>V</span>
          </div>

          <div class="bot-floating-card card-one">
            <b>BOT LOBBY</b>
            <span>READY</span>
          </div>

          <div class="bot-floating-card card-two">
            <b>FRIENDS</b>
            <span>+2</span>
          </div>

        </div>

      </section>

      <section class="bot-section">

        <div class="section-head">

          <div>

            <div class="eyebrow">
              PRIVATE PRACTICE
            </div>

            <h2>
              Get Bot Lobbies
            </h2>

          </div>

        </div>

        <div class="bot-info-grid">

          <div class="bot-info-card">
            <div class="bot-info-icon">⚡</div>
            <h3>Fast sessions</h3>
            <p>
              Start a private bot lobby whenever
              you want and get straight into practice.
            </p>
          </div>

          <div class="bot-info-card">
            <div class="bot-info-icon">🤖</div>
            <h3>Bots ready</h3>
            <p>
              Your practice sessions are built
              around quick, repeatable warmups.
            </p>
          </div>

          <div class="bot-info-card">
            <div class="bot-info-icon">🎯</div>
            <h3>Practice your way</h3>
            <p>
              Work on aim, movement, edits,
              builds and fights without pressure.
            </p>
          </div>

          <div class="bot-info-card">
            <div class="bot-info-icon">👥</div>
            <h3>Bring your squad</h3>
            <p>
              Invite up to 2 friends and
              practice together.
            </p>
          </div>

        </div>

      </section>

      <section class="bot-pricing-section">

        <div class="bot-pricing-header">

          <div>

            <div class="eyebrow">
              BOT LOBBY ACCESS
            </div>

            <h2>
              Choose your plan
            </h2>

            <p>
              Get unlimited access to Vortex bot lobby sessions.
            </p>

          </div>

        </div>

        <div class="bot-pricing-grid">

          <article class="bot-plan ${
            hasBotMonthly
              ? "owned"
              : ""
          }">

            <div class="bot-plan-top">

              <span>MONTHLY</span>

              ${
                hasBotMonthly
                  ? `
                    <b class="plan-owned">
                      ACTIVE
                    </b>
                  `
                  : ""
              }

            </div>

            <h3>Bot Lobby Monthly</h3>

            <div class="bot-price">
              <strong>$2.99</strong>
              <span>/mo</span>
            </div>

            <p>
              Flexible access for players
              who want bot lobbies month to month.
            </p>

            <ul class="bot-features">
              <li>✓ Unlimited bot lobby access</li>
              <li>✓ Private practice sessions</li>
              <li>✓ Up to 2 friends</li>
              <li>✓ Cancel any time</li>
            </ul>

            <button
              class="btn ${
                hasBotMonthly
                  ? "btn-dark"
                  : "btn-purple"
              } bot-plan-btn"
              data-bot-plan="monthly"
            >
              ${
                hasBotMonthly
                  ? "Active Plan"
                  : "Choose Monthly"
              }
            </button>

          </article>

          <article class="bot-plan bot-plan-featured ${
            hasBotAnnual
              ? "owned"
              : ""
          }">

            <div class="bot-plan-badge">
              BEST VALUE
            </div>

            <div class="bot-plan-top">

              <span>ANNUAL</span>

              ${
                hasBotAnnual
                  ? `
                    <b class="plan-owned">
                      ACTIVE
                    </b>
                  `
                  : ""
              }

            </div>

            <h3>Bot Lobby Annual</h3>

            <div class="bot-price">
              <strong>$29.99</strong>
              <span>/yr</span>
            </div>

            <div class="bot-saving">
              $2.50/mo · 2 months free
            </div>

            <p>
              Best option for grinders who
              use bot lobbies throughout the year.
            </p>

            <ul class="bot-features">
              <li>✓ Unlimited bot lobby access</li>
              <li>✓ Private practice sessions</li>
              <li>✓ Up to 2 friends</li>
              <li>✓ Best yearly value</li>
            </ul>

            <button
              class="btn ${
                hasBotAnnual
                  ? "btn-dark"
                  : "btn-purple"
              } bot-plan-btn"
              data-bot-plan="annual"
            >
              ${
                hasBotAnnual
                  ? "Active Plan"
                  : "Choose Annual"
              }
            </button>

          </article>

          <article class="bot-plan bot-priority ${
            hasPriority
              ? "owned"
              : ""
          }">

            <div class="bot-plan-top">

              <span>VTX PRIORITY</span>

              ${
                hasPriority
                  ? `
                    <b class="plan-owned">
                      INCLUDED
                    </b>
                  `
                  : ""
              }

            </div>

            <h3>VTX Priority</h3>

            <div class="bot-price">
              <strong>$12.99</strong>
              <span>/mo</span>
            </div>

            <p>
              Already have VTX Priority?
              Bot Lobbies are included.
            </p>

            <ul class="bot-features">
              <li>✓ Bot Lobbies included</li>
              <li>✓ Priority queue access</li>
              <li>✓ 5 queue skips every day</li>
              <li>✓ Vortex profile perks</li>
            </ul>

            <button
              class="btn ${
                hasPriority
                  ? "btn-dark"
                  : "btn-outline"
              }"
              data-action="shop"
            >
              ${
                hasPriority
                  ? "View Priority"
                  : "Get VTX Priority"
              }
            </button>

          </article>

        </div>

        <div class="bot-priority-note">

          <div class="bot-priority-note-icon">
            ⚡
          </div>

          <div>

            <strong>
              Already have VTX Priority?
            </strong>

            <p>
              Bot Lobbies are included with your
              Priority membership. You don't need
              a separate Bot Lobby subscription.
            </p>

          </div>

          <button
            class="btn btn-dark btn-small"
            data-action="shop"
          >
            View Priority
          </button>

        </div>

      </section>

      <section class="bot-how">

        <div class="section-head">

          <div>

            <div class="eyebrow">
              BUILT FOR GRINDERS
            </div>

            <h2>
              More reps. Less waiting.
            </h2>

          </div>

        </div>

        <div class="feature-grid three">

          <article class="feature-card">

            <div class="feature-num">01</div>

            <h3>Warm up</h3>

            <p>
              Jump into a quick session before
              ranked, tournaments or customs.
            </p>

          </article>

          <article class="feature-card">

            <div class="feature-num">02</div>

            <h3>Bring friends</h3>

            <p>
              Invite up to two friends and
              practice together.
            </p>

          </article>

          <article class="feature-card">

            <div class="feature-num">03</div>

            <h3>Get better</h3>

            <p>
              Repeat your mechanics and
              movement until you're ready.
            </p>

          </article>

        </div>

      </section>

      <section class="section">

        <div class="notice">

          <strong>
            Demo access
          </strong>

          <br>

          Bot Lobby subscriptions are currently
          saved locally for testing. No real payment
          is processed and this page does not create
          an actual Fortnite party by itself.

        </div>

      </section>

    `);
  }

  // ============================================================
  // SPRITE TRADING PAGE
  // ============================================================

  function tradingPage() {

    trades =
      load(
        STORAGE.trades,
        []
      );

    return shell(`

      <section class="page-head">

        <div>

          <div class="eyebrow">
            COMMUNITY MARKET
          </div>

          <h1>
            Sprite Trading
          </h1>

          <p>
            Trade Sprites with the Vortex community.
          </p>

        </div>

        <button
          class="btn btn-purple"
          data-action="post-trade"
        >
          ＋ Post Trade
        </button>

      </section>

      <section class="trade-grid">

        ${
          trades.length
            ? trades
                .map(
                  t => `
                    <article class="trade-card">

                      <div class="trade-top">

                        <span>
                          Sprite
                        </span>

                        <span>
                          ${esc(
                            t.time || ""
                          )}
                        </span>

                      </div>

                      <div class="trade-spirit-info">

                        <span>
                          Rarity:
                          <b>
                            ${esc(
                              t.rarity ||
                              "Common"
                            )}
                          </b>
                        </span>

                        ${
                          t.sprite
                            ? `
                              <span>
                                Sprite:
                                <b>
                                  ${esc(
                                    t.sprite
                                  )}
                                </b>
                              </span>
                            `
                            : ""
                        }

                      </div>

                      <h3>
                        ${esc(t.title)}
                      </h3>

                      <p>
                        ${esc(
                          t.description
                        )}
                      </p>

                      <div class="trade-bottom">

                        <b>
                          ${esc(
                            t.username
                          )}
                        </b>

                        <button
                          class="btn btn-outline btn-small"
                          data-action="trade-contact"
                          data-id="${esc(t.id)}"
                        >
                          Contact
                        </button>

                      </div>

                    </article>
                  `
                )
                .join("")
            : `
              <div class="empty-state">

                <div class="empty-icon">
                  ◆
                </div>

                <h3>
                  No Sprite trades
                </h3>

                <p>
                  Be the first person
                  to post an offer.
                </p>

                <button
                  class="btn btn-purple btn-small"
                  data-action="post-trade"
                >
                  Post Trade
                </button>

              </div>
            `
        }

      </section>

    `);
  }

  function postTradePage() {

    const defaultRarity =
      SPRITE_RARITIES[0];

    const initialSprites =
      SPRITES_BY_RARITY[
        defaultRarity
      ] || [];

    return shell(`

      <section class="page-head">

        <div>

          <div class="eyebrow">
            TRADING
          </div>

          <h1>
            Post a Sprite Trade
          </h1>

          <p>
            Select a rarity and then choose
            the Sprite you want to trade.
          </p>

        </div>

      </section>

      <section class="form-card">

        <div class="form-grid">

          <label>
            Title

            <input
              id="trade-title"
              placeholder="Looking for..."
            >

          </label>

          <label>
            Category

            <select
              id="trade-category"
              disabled
            >

              <option value="Sprite" selected>
                Sprite
              </option>

            </select>

          </label>

          <label>
            Rarity

            <select id="trade-rarity">

              ${
                SPRITE_RARITIES.map(
                  rarity => `
                    <option
                      value="${esc(rarity)}"
                    >
                      ${esc(rarity)}
                    </option>
                  `
                ).join("")
              }

            </select>

          </label>

          <label>
            Sprite

            <select id="trade-sprite">

              <option value="">
                Select a Sprite
              </option>

              ${
                initialSprites
                  .map(
                    sprite => `
                      <option
                        value="${esc(sprite)}"
                      >
                        ${esc(sprite)}
                      </option>
                    `
                  )
                  .join("")
              }

            </select>

          </label>

        </div>

        <label>

          Description

          <textarea
            id="trade-description"
            rows="6"
            placeholder="What are you offering and what do you want?"
          ></textarea>

        </label>

        <div class="form-actions">

          <button
            class="btn btn-purple"
            data-action="create-trade"
          >
            Publish Trade
          </button>

          <button
            class="btn btn-outline"
            data-action="trading"
          >
            Cancel
          </button>

        </div>

      </section>

    `);
  }

  function shopPage() {

    const owned =
      load(
        STORAGE.shop,
        []
      );

    return shell(`

      <section class="page-head">

        <div>

          <div class="eyebrow">
            VORTEX STORE
          </div>

          <h1>
            Shop
          </h1>

          <p>
            Support the community
            and unlock Vortex perks.
          </p>

        </div>

      </section>

      <section class="shop-grid">

        ${SHOP_ITEMS.map(
          item => `

            <article
              class="shop-card ${
                item.id ===
                "vtx-priority"
                  ? "featured"
                  : ""
              }"
            >

              ${
                item.id ===
                "vtx-priority"
                  ? `
                    <div class="shop-badge">
                      MOST POPULAR
                    </div>
                  `
                  : ""
              }

              <h3>
                ${esc(item.name)}
              </h3>

              <div class="price">

                $${item.price.toFixed(2)}

                <small>
                  ${
                    item.billing ===
                    "monthly"
                      ? "/ month"
                      : "one-time"
                  }
                </small>

              </div>

              <p>
                ${esc(
                  item.description
                )}
              </p>

              <ul>

                <li>
                  Vortex profile badge
                </li>

                <li>
                  Community tag
                </li>

                <li>
                  Member perks
                </li>

                ${
                  item.id ===
                  "vtx-priority"
                    ? `
                      <li>
                        Bot Lobbies included
                      </li>
                    `
                    : ""
                }

              </ul>

              <button
                class="btn ${
                  owned.includes(
                    item.id
                  )
                    ? "btn-dark"
                    : "btn-purple"
                } shop-buy"
                data-id="${item.id}"
              >
                ${
                  owned.includes(
                    item.id
                  )
                    ? "Owned"
                    : "Choose Plan"
                }
              </button>

            </article>

          `
        ).join("")}

      </section>

      <div class="notice">

        Payments are not connected yet.
        Choosing a plan saves your
        selection locally for testing;
        no real charge is made.

      </div>

    `);
  }

  function helpPage() {

    return shell(`

      <section class="page-head">

        <div>

          <div class="eyebrow">
            SUPPORT
          </div>

          <h1>
            Help
          </h1>

          <p>
            Quick answers for using
            VortexCustoms.
          </p>

        </div>

      </section>

      <div class="faq-list">

        <details open>

          <summary>
            How do I host a match?
          </summary>

          <p>
            Sign in, open Host,
            choose your settings
            and create the lobby.
            Your match will appear
            under Live Matches.
          </p>

        </details>

        <details>

          <summary>
            Who can start a match?
          </summary>

          <p>
            Only the account that
            created the match sees
            the Start and Cancel controls.
          </p>

        </details>

        <details>

          <summary>
            Is Global Chat shared?
          </summary>

          <p>
            Yes. Messages are stored
            by the server, so users
            on different accounts see
            the same chat.
          </p>

        </details>

        <details>

          <summary>
            Can I buy Shop items?
          </summary>

          <p>
            The Shop UI is ready,
            but real payment processing
            is not connected in this version.
          </p>

        </details>

        <details>

          <summary>
            How do Bot Lobbies work?
          </summary>

          <p>
            Choose the Monthly or Annual
            Bot Lobby plan. VTX Priority
            also includes Bot Lobbies.
            The current version stores access
            locally for testing.
          </p>

        </details>

      </div>

    `);
  }

  function profilePage() {

    const username =
      getCurrentUserName();

    if (!username) {

      return shell(`

        <div class="empty-state page-empty">

          <h2>
            You're not signed in
          </h2>

          <p>
            Sign in to create
            a Vortex profile.
          </p>

          <button
            class="btn btn-purple"
            data-action="login"
          >
            Sign in
          </button>

        </div>

      `);
    }

    const owned =
      load(
        STORAGE.shop,
        []
      );

    return shell(`

      <section class="profile-hero">

        <div class="profile-avatar">
          ${esc(
            avatar(username)
          )}
        </div>

        <div>

          <div class="eyebrow">
            VORTEX PROFILE
          </div>

          <h1>
            ${esc(username)}
          </h1>

          <p>
            Community member
          </p>

        </div>

        <div style="
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          align-items:center;
        ">

          <button
            class="${
              isAdmin()
                ? "btn btn-purple"
                : "btn btn-outline"
            }"
            data-action="admin"
          >
            🛡️ Admin VTX
          </button>

          <button
            class="btn btn-dark"
            data-action="logout"
          >
            Sign out
          </button>

        </div>

      </section>

      <div class="profile-grid">

        <div class="stat-card">

          <b>
            ${
              matches.filter(
                m =>
                  m.host ===
                  username
              ).length
            }
          </b>

          <span>
            Matches hosted
          </span>

        </div>

        <div class="stat-card">

          <b>
            ${
              trades.filter(
                t =>
                  t.username ===
                  username
              ).length
            }
          </b>

          <span>
            Trades posted
          </span>

        </div>

        <div class="stat-card">

          <b>
            ${owned.length}
          </b>

          <span>
            Shop perks
          </span>

        </div>

      </div>

    `);
  }

  // ============================================================
  // ADMIN VTX PAGE
  // ============================================================

  function adminPage() {

    if (!isAdmin()) {

      return shell(`

        <section class="form-card admin-login">

          <div class="eyebrow">
            VORTEX STAFF
          </div>

          <h1>
            Admin VTX
          </h1>

          <p>
            Sign in with your Admin VTX credentials.
          </p>

          <label>

            Admin username

            <input
              id="admin-login-username"
              type="text"
              autocomplete="username"
              placeholder="Username"
              maxlength="32"
            >

          </label>

          <label>

            Admin password

            <input
              id="admin-password"
              type="password"
              autocomplete="current-password"
              placeholder="Password"
            >

          </label>

          <button
            class="btn btn-purple"
            data-action="admin-login"
          >
            Sign in as Admin
          </button>

        </section>

      `);
    }

    const adminUsername =
      getAdminUsername() ||
      "Admin";

    return shell(`

      <section class="page-head">

        <div>

          <div class="eyebrow">
            VORTEX STAFF
          </div>

          <h1>
            Admin VTX
          </h1>

          <p>
            Signed in as
            <strong>
              ${esc(adminUsername)}
            </strong>
          </p>

        </div>

        <button
          class="btn btn-danger"
          data-action="admin-logout"
        >
          Log out
        </button>

      </section>

      <section class="form-card">

        <div class="admin-status-box">

          <div>
            <small>ADMIN SESSION</small>
            <strong>ACTIVE</strong>
          </div>

          <div>
            <small>ACCOUNT</small>
            <strong>${esc(adminUsername)}</strong>
          </div>

        </div>

        <label>

          Admin username

          <input
            id="admin-username"
            value="${esc(adminUsername)}"
            readonly
          >

        </label>

        <label>

          Official message

          <textarea
            id="admin-message"
            rows="5"
            maxlength="300"
            placeholder="Send an official Vortex message..."
          ></textarea>

        </label>

        <div class="form-actions">

          <button
            class="btn btn-purple"
            data-action="admin-send"
          >
            Send Admin Message
          </button>

          <button
            class="btn btn-danger"
            data-action="admin-clear"
          >
            Clear Global Chat
          </button>

        </div>

      </section>

    `);
  }

  async function chatPage() {

    await loadGlobalChat();

    return shell(`

      <section class="page-head">

        <div>

          <div class="eyebrow">
            COMMUNITY
          </div>

          <h1>
            Global Chat
          </h1>

          <p>
            One shared room for
            the Vortex community.
          </p>

        </div>

      </section>

      <section class="chat-shell">

        <div class="chat-head">

          <span>
            GLOBAL
          </span>

          <span>
            ${messages.length}
            messages
          </span>

        </div>

        <div class="chat-messages">

          ${
            messages.length
              ? messages
                  .map(
                    m => `
                      <div
                        class="chat-message ${
                          m.isAdmin
                            ? "admin-msg"
                            : ""
                        }"
                      >

                        <div>

                          <div class="chat-line">

                            <b>

                              ${
                                m.isAdmin
                                  ? "(ADMIN) "
                                  : ""
                              }

                              ${esc(
                                m.username
                              )}

                            </b>

                            <time>
                              ${
                                new Date(
                                  m.time
                                ).toLocaleTimeString(
                                  [],
                                  {
                                    hour:
                                      "2-digit",
                                    minute:
                                      "2-digit"
                                  }
                                )
                              }
                            </time>

                          </div>

                          <p>
                            ${esc(
                              m.message
                            )}
                          </p>

                        </div>

                      </div>
                    `
                  )
                  .join("")
              : `
                <div class="chat-empty">
                  No messages yet.
                  Start the conversation.
                </div>
              `
          }

        </div>

        <div class="chat-compose">

          ${
            getCurrentUserName()
              ? `
                <input
                  id="chat-input"
                  maxlength="300"
                  placeholder="Message Global Chat..."
                >

                <button
                  class="btn btn-purple"
                  data-action="send-chat"
                >
                  Send
                </button>
              `
              : `
                <button
                  class="btn btn-dark"
                  data-action="login"
                >
                  Sign in to chat
                </button>
              `
          }

        </div>

      </section>

    `);
  }

  function router() {

    const path =
      location.pathname.replace(
        /\/+$/,
        ""
      ) || "/";

    if (path === "/") {
      return Promise.resolve(
        homePage()
      );
    }

    if (path === "/matches") {
      return Promise.resolve(
        matchesPage()
      );
    }

    if (path === "/host") {
      return Promise.resolve(
        hostPage()
      );
    }

    if (path === "/bot-lobbies") {
      return Promise.resolve(
        botLobbiesPage()
      );
    }

    if (path === "/trading") {
      return Promise.resolve(
        tradingPage()
      );
    }

    if (path === "/post-trade") {
      return Promise.resolve(
        postTradePage()
      );
    }

    if (path === "/shop") {
      return Promise.resolve(
        shopPage()
      );
    }

    if (path === "/help") {
      return Promise.resolve(
        helpPage()
      );
    }

    if (path === "/profile") {
      return Promise.resolve(
        profilePage()
      );
    }

    if (path === "/admin") {
      return Promise.resolve(
        adminPage()
      );
    }

    if (path === "/chat") {
      return chatPage();
    }

    if (path.startsWith("/match/")) {
      return Promise.resolve(
        matchDetailPage(
          path.split("/")[2]
        )
      );
    }

    return Promise.resolve(
      homePage()
    );
  }

  async function render() {

    window.scrollTo(
      0,
      0
    );

    app.innerHTML = `
      <div class="loading-screen">
        Loading VortexCustoms...
      </div>
    `;

    try {

      if (getAdminToken()) {
        await verifyAdminSession();
      }

      app.innerHTML =
        await router();

      bindEvents();

    } catch (e) {

      console.error(e);

      app.innerHTML =
        shell(`

          <div class="empty-state page-empty">

            <h2>
              Something went wrong
            </h2>

            <p>
              Refresh the page
              and try again.
            </p>

          </div>

        `);

      bindEvents();

    }
  }

  function bindEvents() {

    document
      .querySelectorAll(
        "[data-link]"
      )
      .forEach(a => {

        a.addEventListener(
          "click",
          e => {

            e.preventDefault();

            navigate(
              a.getAttribute(
                "href"
              )
            );

          }
        );

      });

    document
      .querySelectorAll(
        "[data-action]"
      )
      .forEach(el => {

        el.addEventListener(
          "click",
          async () => {

            const action =
              el.dataset.action;

            try {

              if (action === "login") {
                login();

              } else if (action === "logout") {
                logout();

              } else if (action === "profile") {
                navigate("/profile");

              } else if (action === "shop") {
                navigate("/shop");

              } else if (action === "messages") {
                navigate("/chat");

              } else if (action === "admin") {
                navigate("/admin");

              } else if (action === "host") {
                navigate("/host");

              } else if (
                action === "matches" ||
                action === "refresh-matches"
              ) {
                render();

              } else if (action === "help") {
                navigate("/help");

              } else if (action === "trading") {
                navigate("/trading");

              } else if (action === "post-trade") {
                navigate("/post-trade");

              } else if (action === "match") {
                navigate(
                  "/match/" +
                  el.dataset.id
                );

              } else if (action === "copy-key") {

                await navigator
                  .clipboard
                  .writeText(
                    el.dataset.key
                  );

                toast(
                  "Custom key copied."
                );

              } else if (action === "create-match") {

                createMatch();

              } else if (action === "start-match") {

                updateMatch(
                  el.dataset.id,
                  "LIVE"
                );

              } else if (action === "cancel-match") {

                cancelMatch(
                  el.dataset.id
                );

              } else if (action === "create-trade") {

                createTrade();

              } else if (action === "trade-contact") {

                toast(
                  "Contact flow can be connected to Discord next."
                );

              } else if (action === "send-chat") {

                await sendChat();

              } else if (action === "admin-login") {

                await adminLogin();

              } else if (action === "admin-logout") {

                await adminLogout();

              } else if (action === "admin-send") {

                await adminSend();

              } else if (action === "admin-clear") {

                if (
                  confirm(
                    "Clear Global Chat?"
                  )
                ) {

                  await clearGlobalChat();

                  toast(
                    "Global Chat cleared."
                  );

                  navigate(
                    "/chat"
                  );

                }

              }

            } catch (e) {

              toast(
                e.message ||
                "Something went wrong."
              );

            }

          }
        );

      });

    document
      .querySelectorAll(
        "[data-noop]"
      )
      .forEach(x => {

        x.addEventListener(
          "click",
          e => {
            e.preventDefault();
          }
        );

      });

    // ============================================================
    // HOST REGION / SUB-REGION
    // ============================================================

    const hostRegion =
      document.getElementById(
        "host-region"
      );

    const hostSubregion =
      document.getElementById(
        "host-subregion"
      );

    function updateHostSubregions() {

      if (
        !hostRegion ||
        !hostSubregion
      ) {
        return;
      }

      const list =
        SUBREGIONS[
          hostRegion.value
        ] || [];

      hostSubregion.innerHTML =
        list
          .map(
            sub =>
              `<option value="${esc(sub)}">${esc(sub)}</option>`
          )
          .join("");

    }

    if (
      hostRegion &&
      hostSubregion
    ) {

      hostRegion.addEventListener(
        "change",
        updateHostSubregions
      );

      updateHostSubregions();

    }

    // ============================================================
    // SPRITE RARITY / SPRITE SELECTOR
    // ============================================================

    const tradeRarity =
      document.getElementById(
        "trade-rarity"
      );

    const tradeSprite =
      document.getElementById(
        "trade-sprite"
      );

    function updateTradeSprites() {

      if (
        !tradeRarity ||
        !tradeSprite
      ) {
        return;
      }

      const rarity =
        tradeRarity.value;

      const spriteList =
        SPRITES_BY_RARITY[
          rarity
        ] || [];

      tradeSprite.innerHTML = `
        <option value="">
          ${
            spriteList.length
              ? "Select a Sprite"
              : "No Sprites added yet"
          }
        </option>

        ${
          spriteList
            .map(
              sprite => `
                <option
                  value="${esc(sprite)}"
                >
                  ${esc(sprite)}
                </option>
              `
            )
            .join("")
        }

      `;

    }

    if (
      tradeRarity &&
      tradeSprite
    ) {

      tradeRarity.addEventListener(
        "change",
        updateTradeSprites
      );

      updateTradeSprites();

    }

    // ============================================================
    // MATCH FILTERS
    // ============================================================

    const region =
      document.getElementById(
        "filter-region"
      );

    const mode =
      document.getElementById(
        "filter-mode"
      );

    if (region) {

      region.addEventListener(
        "change",
        () => {

          const params = {
            region:
              region.value,
            mode:
              mode?.value ||
              "all"
          };

          const cards =
            matches.filter(
              m =>
                (
                  params.region ===
                    "all" ||
                  m.region ===
                    params.region
                ) &&
                (
                  params.mode ===
                    "all" ||
                  m.mode ===
                    params.mode
                )
            );

          const grid =
            document.querySelector(
              ".match-grid"
            );

          if (!grid) return;

          grid.innerHTML =
            cards.length
              ? cards
                  .map(matchCard)
                  .join("")
              : `
                <div class="empty-state">

                  <h3>
                    No matches found
                  </h3>

                  <p>
                    Try another filter.
                  </p>

                </div>
              `;

          bindEvents();

        }
      );

    }

    if (mode) {

      mode.addEventListener(
        "change",
        () =>
          region?.dispatchEvent(
            new Event("change")
          )
      );

    }

    // ============================================================
    // SHOP
    // ============================================================

    document
      .querySelectorAll(
        ".shop-buy"
      )
      .forEach(btn => {

        btn.addEventListener(
          "click",
          () => {

            if (
              !getCurrentUserName()
            ) {

              return toast(
                "Sign in before choosing a plan."
              );

            }

            const owned =
              load(
                STORAGE.shop,
                []
              );

            if (
              !owned.includes(
                btn.dataset.id
              )
            ) {

              owned.push(
                btn.dataset.id
              );

            }

            save(
              STORAGE.shop,
              owned
            );

            toast(
              "Plan selected. No real charge was made."
            );

            render();

          }
        );

      });

    // ============================================================
    // BOT LOBBIES
    // ============================================================

    document
      .querySelectorAll(
        ".bot-plan-btn"
      )
      .forEach(btn => {

        btn.addEventListener(
          "click",
          () => {

            if (
              !getCurrentUserName()
            ) {

              return toast(
                "Sign in before choosing a Bot Lobby plan."
              );

            }

            const plan =
              btn.dataset.botPlan;

            const owned =
              load(
                STORAGE.shop,
                []
              );

            if (
              owned.includes(
                "vtx-priority"
              )
            ) {

              return toast(
                "Bot Lobbies are already included with VTX Priority."
              );

            }

            const planId =
              plan === "annual"
                ? "bot-lobby-annual"
                : "bot-lobby-monthly";

            if (
              owned.includes(
                planId
              )
            ) {

              return toast(
                "This Bot Lobby plan is already active."
              );

            }

            const otherPlanId =
              plan === "annual"
                ? "bot-lobby-monthly"
                : "bot-lobby-annual";

            const cleanedOwned =
              owned.filter(
                id =>
                  id !==
                  otherPlanId
              );

            cleanedOwned.push(
              planId
            );

            save(
              STORAGE.shop,
              cleanedOwned
            );

            toast(
              plan === "annual"
                ? "Annual Bot Lobby plan activated."
                : "Monthly Bot Lobby plan activated."
            );

            render();

          }
        );

      });

  }

  function createMatch() {

    const host =
      getCurrentUserName();

    if (!host) {
      return toast(
        "Sign in first."
      );
    }

    const keyInput =
      document
        .getElementById(
          "host-key"
        )
        .value
        .trim()
        .toUpperCase();

    const key =
      keyInput ||
      randomKey();

    if (
      !/^[A-Z0-9_-]{4,16}$/.test(
        key
      )
    ) {

      return toast(
        "Custom key must be 4–16 characters."
      );

    }

    if (
      matches.some(
        m => m.key === key
      )
    ) {

      return toast(
        "That custom key is already in use."
      );

    }

    const m = {

      id: uid(),

      title:
        document
          .getElementById(
            "host-title"
          )
          .value
          .trim() ||
        "Vortex Custom",

      mode:
        document
          .getElementById(
            "host-mode"
          )
          .value,

      region:
        document
          .getElementById(
            "host-region"
          )
          .value,

      subregion:
        document
          .getElementById(
            "host-subregion"
          )
          .value,

      teamSize:
        document
          .getElementById(
            "host-team"
          )
          .value,

      building:
        document
          .getElementById(
            "host-building"
          )
          .value,

      key,

      password:
        document
          .getElementById(
            "host-password"
          )
          .value,

      offspawn:
        document
          .getElementById(
            "host-offspawn"
          )
          .value,

      host,

      status:
        "OPEN",

      createdAt:
        Date.now()

    };

    matches.push(m);

    save(
      STORAGE.matches,
      matches
    );

    toast(
      "Match created."
    );

    navigate(
      "/match/" +
      m.id
    );
  }

  function updateMatch(
    id,
    status
  ) {

    const m =
      matches.find(
        x => x.id === id
      );

    if (
      !m ||
      m.host !==
        getCurrentUserName()
    ) {

      return toast(
        "Only the host can do that."
      );

    }

    m.status = status;

    save(
      STORAGE.matches,
      matches
    );

    toast(
      status === "LIVE"
        ? "Match started."
        : "Updated."
    );

    render();
  }

  function cancelMatch(id) {

    const m =
      matches.find(
        x => x.id === id
      );

    if (
      !m ||
      m.host !==
        getCurrentUserName()
    ) {

      return toast(
        "Only the host can cancel this."
      );

    }

    matches =
      matches.filter(
        x => x.id !== id
      );

    save(
      STORAGE.matches,
      matches
    );

    toast(
      "Match cancelled."
    );

    navigate(
      "/matches"
    );
  }

  function createTrade() {

    const username =
      getCurrentUserName();

    if (!username) {

      return toast(
        "Sign in first."
      );

    }

    const title =
      document
        .getElementById(
          "trade-title"
        )
        .value
        .trim();

    const description =
      document
        .getElementById(
          "trade-description"
        )
        .value
        .trim();

    const rarity =
      document
        .getElementById(
          "trade-rarity"
        )
        .value;

    const sprite =
      document
        .getElementById(
          "trade-sprite"
        )
        .value;

    if (
      !title ||
      !description
    ) {

      return toast(
        "Fill in the title and description."
      );

    }

    if (!sprite) {

      return toast(
        "Select a Sprite."
      );

    }

    trades =
      load(
        STORAGE.trades,
        []
      );

    trades.push({

      id: uid(),

      username,

      title:
        title.slice(
          0,
          80
        ),

      description:
        description.slice(
          0,
          500
        ),

      category:
        "Sprite",

      rarity,

      sprite,

      time:
        new Date()
          .toLocaleDateString()

    });

    save(
      STORAGE.trades,
      trades
    );

    toast(
      "Sprite trade posted."
    );

    navigate(
      "/trading"
    );
  }

  async function sendChat() {

    const input =
      document.getElementById(
        "chat-input"
      );

    const text =
      input?.value.trim();

    if (!text) return;

    await sendGlobalMessage(
      text
    );

    input.value = "";

    toast(
      "Message sent."
    );

    await render();
  }

  // ============================================================
  // ADMIN LOGIN
  // ============================================================

  async function adminLogin() {

    const usernameInput =
      document.getElementById(
        "admin-login-username"
      );

    const passwordInput =
      document.getElementById(
        "admin-password"
      );

    const username =
      usernameInput?.value
        .trim() || "";

    const password =
      passwordInput?.value || "";

    if (!username) {
      throw new Error(
        "Enter the Admin username."
      );
    }

    if (!password) {
      throw new Error(
        "Enter the Admin password."
      );
    }

    const res =
      await fetch(
        "/api/admin/login",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              username,
              password
            })
        }
      );

    const data =
      await res.json();

    if (!res.ok) {

      throw new Error(
        data.error ||
        "Invalid admin credentials."
      );

    }

    if (
      !data.token ||
      !data.username
    ) {

      throw new Error(
        "The server returned an invalid admin session."
      );

    }

    localStorage.setItem(
      ADMIN_STORAGE.token,
      data.token
    );

    localStorage.setItem(
      ADMIN_STORAGE.username,
      data.username
    );

    const verified =
      await verifyAdminSession();

    if (!verified) {

      clearAdminStorage();

      throw new Error(
        "Could not verify the Admin VTX session."
      );

    }

    toast(
      `Admin access granted. Welcome ${data.username}.`
    );

    render();
  }

  // ============================================================
  // ADMIN LOGOUT
  // ============================================================

  async function adminLogout() {

    const token =
      getAdminToken();

    try {

      if (token) {

        await fetch(
          "/api/admin/logout",
          {
            method: "POST",
            headers: {
              "x-vortex-admin-token":
                token
            }
          }
        );

      }

    } catch {
      /*
       * Even if the server is temporarily
       * unavailable, remove the local token.
       */
    }

    clearAdminStorage();

    toast(
      "Admin logged out."
    );

    navigate(
      "/admin"
    );
  }

  // ============================================================
  // ADMIN SEND
  // ============================================================

  async function adminSend() {

    const verified =
      await verifyAdminSession();

    if (!verified) {

      throw new Error(
        "Admin session expired. Sign in again."
      );

    }

    const message =
      document
        .getElementById(
          "admin-message"
        )
        .value
        .trim();

    if (!message) {

      return toast(
        "Write a message."
      );

    }

    await sendAdminMessage(
      message
    );

    toast(
      "Admin message sent."
    );

    navigate(
      "/chat"
    );
  }

  window.addEventListener(
    "popstate",
    render
  );

  render();

})();