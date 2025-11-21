/* ========================================================================
   GLOBAL STATE
   ======================================================================== */

const state = {
  allDapps: [],
  filtered: [],
  categoryIndex: {}
};

const dom = {};


/* ========================================================================
   AI SEARCH v2 (Precomputed embeddings, only for ai.html)
   ======================================================================== */

let embeddingModel = null;
let embeddedDapps = [];

/** Load MiniLM model for query embeddings only */
async function loadEmbeddingModel() {
  if (embeddingModel) return embeddingModel;

  if (!window.transformers || !window.transformers.pipeline) {
    throw new Error("Transformers ESM pipeline not available");
  }

  console.log("[AI] Loading MiniLM model for queries…");
  embeddingModel = await window.transformers.pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2",
    { quantized: true }
  );

  console.log("[AI] Model ready.");
  return embeddingModel;
}

/** Embedding for QUERY only */
async function embedText(text) {
  const extractor = await loadEmbeddingModel();
  const result = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(result.data);
}

/** Cosine similarity */
function cosineSimilarity(a, b) {
  let dot = 0, na = 0, nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** Build precomputed dApp embeddings (ai.html only) */
function buildEmbeddedVectors() {
  embeddedDapps = state.allDapps
    .filter(d => Array.isArray(d.embedding) && d.embedding.length)
    .map(d => ({ dapp: d, vec: d.embedding }));

  console.log("[AI] Loaded", embeddedDapps.length, "dApp embeddings.");
}


/* ========================================================================
   AI SEARCH — Only LIVE dApps (ai.html)
   ======================================================================== */

async function runAISearch() {
  const input = document.getElementById("ai-input");
  const box = document.getElementById("ai-results");
  if (!input || !box) return;

  const query = input.value.trim();
  if (!query) return;

  if (!embeddedDapps.length) {
    box.innerHTML = `<p style="opacity:0.6">AI index not ready.</p>`;
    return;
  }

  try {
    box.innerHTML = `<p style="opacity:0.6">Thinking...</p>`;

    const qVec = await embedText(query.toLowerCase());

    const scored = embeddedDapps
      .filter(obj => obj.dapp.live === true) // 🔥 только live dApps
      .map(({ dapp, vec }) => ({
        dapp,
        score: cosineSimilarity(qVec, vec)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);

    renderAIResults(scored);

  } catch (err) {
    console.error(err);
    box.innerHTML = `<p style="opacity:0.6">AI Search error: ${err.message}</p>`;
  }
}


/* ========================================================================
   GENERAL APP LOGIC
   ======================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const aiInput = document.getElementById("ai-input");
  const aiBtn = document.getElementById("ai-search-btn");
  const isAIPage = window.location.pathname.includes("ai.html");

  // 👇 тут ключевая логика:
  // ai.html → all_dapps_embedded.json
  // index.html (и всё остальное) → all_dapps_main.json
  const jsonFile = isAIPage
    ? "all_dapps_embedded.json"
    : "all_dapps_main.json";

  // на index.html поднимаем ссылки на DOM элементы
  if (!isAIPage) {
    dom.grid = document.getElementById("dapp-grid");
    dom.search = document.getElementById("search-input");
    dom.primaryCategory = document.getElementById("primary-category-filter");
    dom.secondaryCategory = document.getElementById("secondary-category-filter");
    dom.status = document.getElementById("status-filter");
    dom.sort = document.getElementById("sort-select");
    dom.empty = document.getElementById("empty-state");
    dom.statDapps = document.getElementById("stat-dapps-count");
    dom.statLive = document.getElementById("stat-live-count");
    dom.statCategories = document.getElementById("stat-categories-count");
  }

  // Загружаем нужный JSON
  fetch(jsonFile)
    .then(res => res.json())
    .then(dapps => {
      state.allDapps = dapps || [];

      // на всякий случай — дефолт для live
      state.allDapps.forEach(d => {
        if (d.live === undefined) d.live = false;
      });

      if (isAIPage) {
        buildEmbeddedVectors();
      } else {
        hydrateStats();
        buildCategoryIndex();
        hydrateCategoryFilters();
        attachEvents();
        applyFilters();
      }
    })
    .catch(err => {
      console.error("Failed to load dApps JSON:", err);
    });

  // AI Search bindings (только если это ai.html)
  if (aiBtn && aiInput) {
    aiBtn.addEventListener("click", runAISearch);
    aiInput.addEventListener("keydown", e => {
      if (e.key === "Enter") runAISearch();
    });
  }
});


/* ========================================================================
   CATEGORY SYSTEM (index.html)
   ======================================================================== */

function hydrateStats() {
  if (!dom.statDapps) return;

  dom.statDapps.textContent = state.allDapps.length;
  dom.statLive.textContent = state.allDapps.filter(d => d.live === true).length;

  const set = new Set();
  state.allDapps.forEach(d =>
    (d.categories || []).forEach(c => set.add(c))
  );
  dom.statCategories.textContent = set.size;
}

function buildCategoryIndex() {
  const index = {};

  state.allDapps.forEach(dapp => {
    (dapp.categories || []).forEach(raw => {
      if (!raw) return;
      const parts = String(raw).split("::");
      const primary = parts[0]?.trim() || "";
      const secondary = parts[1]?.trim() || "";

      if (!primary) return;
      if (!index[primary]) index[primary] = new Set();

      if (secondary) index[primary].add(secondary);
    });
  });

  state.categoryIndex = index;
}

function hydrateCategoryFilters() {
  if (!dom.primaryCategory) return;

  dom.primaryCategory.innerHTML = `<option value="all">All categories</option>`;

  Object.keys(state.categoryIndex)
    .sort()
    .forEach(primary => {
      const opt = document.createElement("option");
      opt.value = primary;
      opt.textContent = primary;
      dom.primaryCategory.appendChild(opt);
    });

  resetSecondaryCategory();
}

function resetSecondaryCategory() {
  if (!dom.secondaryCategory) return;
  dom.secondaryCategory.innerHTML = `<option value="all">All subcategories</option>`;
  dom.secondaryCategory.disabled = true;
}

function attachEvents() {
  dom.search.addEventListener("input", applyFilters);

  dom.primaryCategory.addEventListener("change", () => {
    const value = dom.primaryCategory.value;

    if (value === "all") {
      resetSecondaryCategory();
      applyFilters();
      return;
    }

    const secondariesSet = state.categoryIndex[value] || new Set();
    dom.secondaryCategory.innerHTML =
      `<option value="all">${value}</option>`;

    Array.from(secondariesSet)
      .sort()
      .forEach(sec => {
        const opt = document.createElement("option");
        opt.value = sec;
        opt.textContent = sec;
        dom.secondaryCategory.appendChild(opt);
      });

    dom.secondaryCategory.disabled = false;
    applyFilters();
  });

  dom.secondaryCategory.addEventListener("change", applyFilters);
  dom.status.addEventListener("change", applyFilters);
  dom.sort.addEventListener("change", applyFilters);
}

function applyFilters() {
  if (!dom.search) return; // safety для ai.html

  const query = dom.search.value.toLowerCase();
  const primary = dom.primaryCategory.value;
  const secondary = dom.secondaryCategory.value;
  const status = dom.status.value;
  const sort = dom.sort.value;

  let arr = [...state.allDapps];

  // Search
  arr = arr.filter(d =>
    d.name.toLowerCase().includes(query) ||
    (d.description || "").toLowerCase().includes(query)
  );

  // Category
  if (primary !== "all" || (secondary && secondary !== "all")) {
    arr = arr.filter(d => dappMatchesCategory(d, primary, secondary));
  }

  // Status filter
  if (status === "live") arr = arr.filter(d => d.live === true);
  if (status === "inactive") arr = arr.filter(d => d.live === false);

  // Sorting
  if (sort === "az") arr.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === "za") arr.sort((a, b) => b.name.localeCompare(a.name));
  if (sort === "live") arr.sort((a, b) => Number(b.live) - Number(a.live));

  state.filtered = arr;
  renderGrid();
}


/* ========================================================================
   RENDERING (GRID + AI RESULTS)
   ======================================================================== */

function renderAIResults(list) {
  const container = document.getElementById("ai-results");
  if (!container) return;

  container.innerHTML = "";
  container.classList.add("ai-grid");

  if (!list.length) {
    container.innerHTML = `<p style="opacity:0.6">No results found</p>`;
    return;
  }

  list.forEach(({ dapp, score }, index) => {
    const card = document.createElement("div");
    card.className = "card";
    card.style.animationDelay = `${index * 80}ms`;

    card.innerHTML = `
      <div class="card-logo">
        <img src="${escapeHtml(dapp.pfp || "icons/monad_logo.png")}" />
      </div>
      <div class="card-info">
        <h3>${escapeHtml(dapp.name)}</h3>
        <p>${escapeHtml(dapp.description || "")}</p>
        <div class="card-tags">
          ${(dapp.categories || []).map(c => `<span>${escapeHtml(c)}</span>`).join("")}
        </div>
        <div class="card-status ${dapp.live ? "live" : "inactive"}">
          ${dapp.live ? "Live" : "Not live"}
        </div>
        <button class="card-open">View profile</button>
      </div>
    `;

    card.querySelector(".card-open").addEventListener("click", e => {
      e.stopPropagation();
      markDappVisited(dapp.name);
      window.location.href = `profile.html?name=${encodeURIComponent(dapp.name)}`;
    });

    card.addEventListener("click", () => {
      markDappVisited(dapp.name);
      window.location.href = `profile.html?name=${encodeURIComponent(dapp.name)}`;
    });

    container.appendChild(card);
  });
}

function dappMatchesCategory(dapp, primary, secondary) {
  const cats = dapp.categories || [];
  if (primary === "all") return true;

  return cats.some(raw => {
    const [p, s] = raw.split("::").map(x => x.trim());
    if (p !== primary) return false;
    if (!secondary || secondary === "all") return true;
    return s === secondary;
  });
}

function renderGrid() {
  if (!dom.grid) return; // на ai.html нет грида

  dom.grid.innerHTML = "";

  if (state.filtered.length === 0) {
    dom.empty.classList.remove("hidden");
    return;
  }

  dom.empty.classList.add("hidden");

  state.filtered.forEach(d => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <div class="card-logo">
        <img src="${escapeHtml(d.pfp || "icons/monad_logo.png")}" />
      </div>
      <div class="card-info">
        <h3>${escapeHtml(d.name)}</h3>
        <p>${escapeHtml(d.description || "")}</p>
        <div class="card-tags">
          ${(d.categories || [])
            .map(c => `<span>${escapeHtml(c)}</span>`)
            .join("")}
        </div>
        <div class="card-status ${d.live ? "live" : "inactive"}">
          ${d.live ? "Live" : "Not live"}
        </div>
        <button class="card-open">View profile</button>
      </div>
    `;

    card.querySelector(".card-open").addEventListener("click", () => {
      markDappVisited(d.name);
      window.location.href = `profile.html?name=${encodeURIComponent(d.name)}`;
    });

    dom.grid.appendChild(card);
  });
}


/* ========================================================================
   UTILITIES
   ======================================================================== */

function markDappVisited(name) {
  let visited = JSON.parse(localStorage.getItem("monadAtlasVisited") || "[]");

  if (!visited.includes(name)) {
    visited.push(name);
    localStorage.setItem("monadAtlasVisited", JSON.stringify(visited));

    try { updateXP(visited.length); }
    catch (e) { console.warn("updateXP not found"); }
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
