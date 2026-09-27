const defaultTrades = [
{
id: 1,
user: "Satoshi_99",
rep: 12,
type: "pedido",
pokemon: "Miraidon",
game: "Pokémon Púrpura",
category: "legendary",
isShiny: false,
details: "Busco Koraidon capturado legalmente. Ofrezco Miraidon con buenos IVs."
},
{
id: 2,
user: "Vortex_Ray",
rep: 25,
type: "oferta",
pokemon: "Rayquaza",
game: "Pokémon HOME",
category: "shiny",
isShiny: true,
details: "Ofrezco Rayquaza Shiny. Busco otro Pokémon Shiny legítimo."
},
{
id: 3,
user: "PokemonMaster",
rep: 8,
type: "pedido",
pokemon: "Manaphy",
game: "Pokémon HOME",
category: "event",
isShiny: false,
details: "Busco Manaphy legítimo. Puedo ofrecer varios Pokémon raros."
}
];

let trades = JSON.parse(localStorage.getItem("vortexTrades"));

if (!Array.isArray(trades)) {
trades = defaultTrades;
saveTrades();
}

function saveTrades() {
localStorage.setItem("vortexTrades", JSON.stringify(trades));
}

function showSection(sectionId) {
document.querySelectorAll(".section").forEach(section => {
section.classList.remove("active-section");
});

```
const selected = document.getElementById(sectionId);

if (selected) {
    selected.classList.add("active-section");
}

document.querySelectorAll(".nav-btn").forEach(button => {
    button.classList.remove("active");

    if (button.dataset.section === sectionId) {
        button.classList.add("active");
    }
});

window.scrollTo({
    top: 0,
    behavior: "smooth"
});

if (sectionId === "trades") {
    renderTrades();
}
```

}

document.querySelectorAll(".nav-btn").forEach(button => {
button.addEventListener("click", () => {
showSection(button.dataset.section);
});
});

function renderTrades() {
const grid = document.getElementById("tradesGrid");
const empty = document.getElementById("emptyState");

```
const search = document
    .getElementById("searchInput")
    .value
    .toLowerCase()
    .trim();

const game = document.getElementById("gameFilter").value;
const category = document.getElementById("typeFilter").value;

const filteredTrades = trades.filter(trade => {
    const matchesSearch =
        trade.pokemon.toLowerCase().includes(search) ||
        trade.user.toLowerCase().includes(search) ||
        trade.details.toLowerCase().includes(search);

    const matchesGame =
        game === "all" || trade.game === game;

    const matchesCategory =
        category === "all" || trade.category === category;

    return matchesSearch && matchesGame && matchesCategory;
});

grid.innerHTML = "";

if (filteredTrades.length === 0) {
    empty.classList.remove("hidden");
    return;
}

empty.classList.add("hidden");

filteredTrades.forEach(trade => {
    const card = document.createElement("article");
    card.className = "trade-card";

    const typeText =
        trade.type === "pedido"
            ? "🔎 BUSCO"
            : "💎 OFREZCO";

    const categoryText = {
        legendary: "Legendario",
        shiny: "Shiny",
        event: "Evento",
        normal: "Normal"
    }[trade.category] || "Pokémon";

    card.innerHTML = `
        <div class="trade-top">
            <span class="trade-type">${typeText}</span>
            <button class="delete-btn" onclick="deleteTrade(${trade.id})">
                Eliminar
            </button>
        </div>

        <h3>${escapeHTML(trade.pokemon)}</h3>

        <div class="trade-game">
            🎮 ${escapeHTML(trade.game)}
        </div>

        <p class="trade-details">
            ${escapeHTML(trade.details)}
        </p>

        <div class="trade-tags">
            <span class="tag">${categoryText}</span>
            ${trade.isShiny ? '<span class="tag">✨ Shiny</span>' : ""}
            <span class="tag">✓ Legal</span>
        </div>

        <div class="trade-user">
            👤 <strong>${escapeHTML(trade.user)}</strong>
            · ⭐ ${trade.rep} rep
        </div>
    `;

    grid.appendChild(card);
});
```

}

function deleteTrade(id) {
const confirmed = confirm(
"¿Seguro que quieres eliminar este trade?"
);

```
if (!confirmed) return;

trades = trades.filter(trade => trade.id !== id);

saveTrades();
renderTrades();
updateTradeCount();

showToast("Trade eliminado.");
```

}

document
.getElementById("tradeForm")
.addEventListener("submit", function(event) {
event.preventDefault();

```
    const user = document.getElementById("userName").value.trim();
    const type = document.getElementById("tradeType").value;
    const pokemon = document.getElementById("pokemonName").value.trim();
    const game = document.getElementById("game").value;
    const category = document.getElementById("category").value;
    const isShiny = document.getElementById("isShiny").checked;
    const details = document.getElementById("details").value.trim();

    if (!user || !pokemon || !details) {
        showToast("Completa todos los campos.");
        return;
    }

    const newTrade = {
        id: Date.now(),
        user: user,
        rep: 0,
        type: type,
        pokemon: pokemon,
        game: game,
        category: category,
        isShiny: isShiny,
        details: details
    };

    trades.unshift(newTrade);

    saveTrades();
    updateTradeCount();

    this.reset();

    showToast("🔥 ¡Trade publicado correctamente!");

    setTimeout(() => {
        showSection("trades");
    }, 700);
});
```

function updateTradeCount() {
document.getElementById("tradeCount").textContent = trades.length;
}

function showToast(message) {
const toast = document.getElementById("toast");

```
toast.textContent = message;
toast.classList.add("show");

setTimeout(() => {
    toast.classList.remove("show");
}, 2500);
```

}

function escapeHTML(text) {
return String(text)
.replaceAll("&", "&")
.replaceAll("<", "<")
.replaceAll(">", ">")
.replaceAll('"', """)
.replaceAll("'", "'");
}

document
.getElementById("searchInput")
.addEventListener("input", renderTrades);

document
.getElementById("gameFilter")
.addEventListener("change", renderTrades);

document
.getElementById("typeFilter")
.addEventListener("change", renderTrades);

updateTradeCount();
renderTrades();
