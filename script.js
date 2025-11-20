
const state = {
  allDapps: [],
  filtered: [],
  categoryIndex: {}, 
  semanticVectors: [] 
};

const dom = {};

const PROGRESSION_CONFIG = {
  base: 6,
  growth: 1.35
};

const isAIPage = window.location.pathname.includes("ai.html");



document.addEventListener("DOMContentLoaded", () => {
  const aiInput = document.getElementById("ai-input");
  const aiBtn = document.getElementById("ai-search-btn");

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

  fetch("all_dapps_main.json")
    .then(res => res.json())
    .then(dapps => {
      state.allDapps = dapps || [];

      buildSemanticVectors();

      if (!isAIPage) {
        hydrateStats();
        buildCategoryIndex();
        hydrateCategoryFilters();
        attachEvents();
        applyFilters();
      }
    });

  if (aiBtn && aiInput) {
    aiBtn.addEventListener("click", runAISearch);
    aiInput.addEventListener("keydown", e => {
      if (e.key === "Enter") runAISearch();
    });
  }
});



function hydrateStats() {
  if (!dom.statDapps) return;

  dom.statDapps.textContent = state.allDapps.length;
  dom.statLive.textContent = state.allDapps.filter(d => d.live).length;

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
  dom.secondaryCategory.innerHTML =
    `<option value="all">All subcategories</option>`;
  dom.secondaryCategory.disabled = true;
}



function attachEvents() {
  if (!dom.search) return;

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
      `<option value="all">All ${value}</option>`;

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
  if (isAIPage) return;

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
  if (status === "live") arr = arr.filter(d => d.live);
  if (status === "inactive") arr = arr.filter(d => !d.live);

  // Sorting
  if (sort === "az") arr.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === "za") arr.sort((a, b) => b.name.localeCompare(a.name));
  if (sort === "live") arr.sort((a, b) => Number(b.live) - Number(a.live));

  state.filtered = arr;
  renderGrid();
}


const SEM_DIMENSIONS = [
  "meme",       
  "trading",    
  "crosschain", 
  "ai",         
  "gaming",     
  "nft",        
  "infra",      
  "tooling",    
  "lending",    
  "payments"    
];

const SEM_INDEX = {};
SEM_DIMENSIONS.forEach((k, i) => {
  SEM_INDEX[k] = i;
});

const DOMAIN_KEYWORDS = {
  meme: [
    "memecoin", "memecoins", "meme coin", "meme coins",
    "meme", "memes", "shitcoin", "shitcoins", "pepe", "doge"
  ],
  trading: [
    "trade", "trading", "swap", "swaps", "dex", "exchange",
    "amm", "liquidity pool", "liquidity", "market", "markets",
    "orderbook", "perpetual", "perp", "spot"
  ],
  crosschain: [
    "cross-chain", "cross chain", "crosschain",
    "omnichain", "multi-chain", "multichain",
    "bridge", "bridging", "interop", "interoperability"
  ],
  ai: [
    "ai", "agent", "agents", "llm", "machine learning",
    "ml", "neural", "inference", "ai-powered"
  ],
  gaming: [
    "game", "games", "gaming", "play", "play-to-earn",
    "p2e", "metaverse"
  ],
  nft: [
    "nft", "nfts", "collectible", "collectibles",
    "mint", "minting", "marketplace", "profile picture"
  ],
  infra: [
    "infrastructure", "infra", "protocol", "network",
    "layer 1", "layer1", "l1", "l2", "rollup", "sequencer",
    "rpc", "indexer"
  ],
  tooling: [
    "tool", "tools", "sdk", "api", "dashboard",
    "analytics", "monitoring", "dev", "developer"
  ],
  lending: [
    "lend", "lending", "borrow", "borrowing",
    "loan", "loans", "credit", "collateral"
  ],
  payments: [
    "payment", "payments", "onramp", "offramp",
    "fiat", "card", "merchant", "checkout"
  ]
};

function buildSemanticVectors() {
  const vectors = [];

  state.allDapps.forEach(dapp => {
    const vec = new Array(SEM_DIMENSIONS.length).fill(0);

    const textRaw = `${dapp.name || ""} ${(dapp.description || "")}`;
    const text = textRaw.toLowerCase().replace(/-/g, " ");


    SEM_DIMENSIONS.forEach(dim => {
      const idx = SEM_INDEX[dim];
      const words = DOMAIN_KEYWORDS[dim] || [];
      words.forEach(word => {
        const c = countOccurrences(text, word);
        if (c > 0) {
          vec[idx] += c;
        }
      });
    });

    (dapp.categories || []).forEach(cat => {
      if (!cat) return;
      const parts = String(cat).split("::");
      const primary = (parts[0] || "").toLowerCase();
      const secondary = (parts[1] || "").toLowerCase();

      if (primary === "defi") {
        vec[SEM_INDEX.trading] += 1;
        if (/dex|amm|swap|exchange|market/.test(secondary)) {
          vec[SEM_INDEX.trading] += 3;
        }
        if (/lending|loan|borrow/.test(secondary)) {
          vec[SEM_INDEX.lending] += 3;
        }
        if (/yield|staking/.test(secondary)) {
          vec[SEM_INDEX.trading] += 1;
        }
        if (/bridge/.test(secondary)) {
          vec[SEM_INDEX.crosschain] += 2;
        }
      } else if (primary === "infra") {
        vec[SEM_INDEX.infra] += 2;
        if (/interoperability|bridge|cross/.test(secondary)) {
          vec[SEM_INDEX.crosschain] += 3;
        }
      } else if (primary === "ai") {
        vec[SEM_INDEX.ai] += 3;
      } else if (primary === "gaming") {
        vec[SEM_INDEX.gaming] += 3;
      } else if (primary === "nft") {
        vec[SEM_INDEX.nft] += 3;
      } else if (primary === "payments") {
        vec[SEM_INDEX.payments] += 3;
      } else if (primary === "consumer") {
        if (/prediction/.test(secondary)) {
          vec[SEM_INDEX.trading] += 2;
          vec[SEM_INDEX.meme] += 1;
        }
      }
    });

    if (text.includes("memecoin") || text.includes("memecoins")) {
      vec[SEM_INDEX.meme] += 6;
      vec[SEM_INDEX.trading] += 3;
    }
    if (text.includes("launchpad") && (text.includes("meme") || text.includes("memecoin"))) {
      vec[SEM_INDEX.meme] += 4;
      vec[SEM_INDEX.trading] += 4;
    }

    const normVec = normalizeVector(vec);

    vectors.push({
      dapp,
      vector: normVec
    });
  });

  state.semanticVectors = vectors;
}

function buildQueryVector(query) {
  const vec = new Array(SEM_DIMENSIONS.length).fill(0);
  const q = query.toLowerCase().replace(/-/g, " ");

  SEM_DIMENSIONS.forEach(dim => {
    const idx = SEM_INDEX[dim];
    const words = DOMAIN_KEYWORDS[dim] || [];
    words.forEach(word => {
      if (q.includes(word)) {
        vec[idx] += 1;
      }
    });
  });

  if (/memecoin|memecoins|shitcoin|shitcoins|meme/.test(q)) {
    vec[SEM_INDEX.meme] += 4;
    vec[SEM_INDEX.trading] += 1.5;
  }

  if (/trade|trading|swap|exchange|buy|sell/.test(q)) {
    vec[SEM_INDEX.trading] += 3;
  }

  if (/cross[\s-]?chain|bridge|omnichain|interoperability/.test(q)) {
    vec[SEM_INDEX.crosschain] += 4;
  }

  if (/\bai\b|agent|agents|llm|machine learning|neural/.test(q)) {
    vec[SEM_INDEX.ai] += 3;
  }

  if (/game|gaming|play/.test(q)) {
    vec[SEM_INDEX.gaming] += 3;
  }

  if (/nft|collectible|mint/.test(q)) {
    vec[SEM_INDEX.nft] += 3;
  }

  if (/lend|lending|borrow|loan/.test(q)) {
    vec[SEM_INDEX.lending] += 3;
  }

  if (/payment|onramp|offramp|fiat|card/.test(q)) {
    vec[SEM_INDEX.payments] += 3;
  }

  if (vec[SEM_INDEX.meme] > 0 && vec[SEM_INDEX.trading] > 0) {
    vec[SEM_INDEX.meme] *= 1.4;
    vec[SEM_INDEX.trading] *= 1.3;
  }

  return normalizeVector(vec);
}

function cosineSimilarity(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

function countOccurrences(text, needle) {
  if (!needle) return 0;
  let count = 0;
  let pos = text.indexOf(needle);
  while (pos !== -1) {
    count++;
    pos = text.indexOf(needle, pos + needle.length);
  }
  return count;
}

function normalizeVector(vec) {
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  if (!norm) return vec.map(() => 0);
  return vec.map(v => v / norm);
}

function lexicalBoost(dapp, queryLower) {
  let score = 0;
  const desc = (dapp.description || "").toLowerCase();
  const name = (dapp.name || "").toLowerCase();

  if (desc.includes(queryLower) || name.includes(queryLower)) {
    score += 15;
  }

  const isMemeQuery = /meme|memecoin|memecoins|shitcoin|shitcoins/.test(queryLower);
  if (isMemeQuery && /meme|memecoin|memecoins|shitcoin|shitcoins/.test(desc)) {
    score += 40;
  }

  const isTradeQuery = /trade|trading|swap|dex|exchange|buy|sell/.test(queryLower);
  if (isTradeQuery && (hasTradingCategory(dapp) ||
    /dex|amm|swap|exchange|market/.test(desc))) {
    score += 20;
  }

  const isCrossQuery = /cross[\s-]?chain|bridge|omnichain|interoperability/.test(queryLower);
  if (isCrossQuery && /cross[\s-]?chain|interoperability|omnichain|bridge/.test(desc)) {
    score += 25;
  }

  return score;
}

function hasTradingCategory(dapp) {
  return (dapp.categories || []).some(cat => {
    const lower = (cat || "").toLowerCase();
    return (
      lower.includes("dex") ||
      lower.includes("amm") ||
      lower.includes("exchange") ||
      lower.includes("perp") ||
      lower.includes("market")
    );
  });
}

function computeSuperScore(dapp) {
  let s = 0;


  const addrCount = dapp.addresses ? Object.keys(dapp.addresses).length : 0;
  if (addrCount >= 10) s += 20;
  else if (addrCount >= 5) s += 12;
  else if (addrCount >= 2) s += 5;

  const descLen = (dapp.description || "").length;
  if (descLen > 400) s += 12;
  else if (descLen > 250) s += 8;
  else if (descLen > 140) s += 4;

  (dapp.categories || []).forEach(cat => {
    const c = (cat || "").toLowerCase();
    if (/infra::interoperability|infra::messaging|infra::bridge|infra::bridging/.test(c)) {
      s += 18;
    } else if (/defi::dex aggregator|defi::perps|defi::lending/.test(c)) {
      s += 10;
    } else if (/ai::/i.test(c)) {
      s += 6;
    }
  });

  // 4) Линки
  const links = dapp.links || {};
  let linkCount = 0;
  ["project", "twitter", "github", "docs", "discord", "telegram"].forEach(k => {
    if (links[k]) linkCount++;
  });
  if (linkCount >= 4) s += 6;
  else if (linkCount >= 2) s += 3;

  if ((links.github || "").includes("github.com")) s += 4;

  // 5) GitHub-аватар
  if ((dapp.pfp || "").includes("githubusercontent.com")) s += 3;

  // 6) Спец-термины cross-chain infra
  const text = `${dapp.name || ""} ${(dapp.description || "")}`.toLowerCase();
  if (/general message passing|gmp|omnichain|interoperability|bridge/.test(text)) {
    s += 6;
  }

  return s;
}

function runAISearch() {
  const input = document.getElementById("ai-input");
  const box = document.getElementById("ai-results");

  if (!input || !box) return;

  const query = input.value.trim();
  if (!query) return;

  if (!state.allDapps.length) {
    box.innerHTML = `<p style="opacity:0.6">Loading dApps data, please try again...</p>`;
    return;
  }

  const qVec = buildQueryVector(query);
  const hasSemantics = qVec.some(v => v !== 0);

  const qLower = query.toLowerCase();

  const results = state.allDapps
    .map((dapp, idx) => {
      let semanticScore = 0;
      let score = 0;

      if (hasSemantics && state.semanticVectors[idx]) {
        const dVec = state.semanticVectors[idx].vector;
        semanticScore = cosineSimilarity(qVec, dVec) * 100;
        score += semanticScore;
      }

      const lexScore = lexicalBoost(dapp, qLower);
      const superScore = computeSuperScore(dapp);

      score += lexScore;
      score += superScore * 2.2;

      return { dapp, score };
    })
    .filter(r => r.dapp.live && r.score > 0) 
    .sort((a, b) => b.score - a.score);

  renderAIResults(results);
}

function renderAIResults(list) {
  const container = document.getElementById("ai-results");
  if (!container) return;

  container.innerHTML = "";
  container.classList.add("ai-grid");

  if (!list.length) {
    container.innerHTML = `<p style="opacity:0.6">No results found</p>`;
    return;
  }

  const limited = list.slice(0, 12);

  limited.forEach(({ dapp, score }, index) => {
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
          ${(dapp.categories || [])
            .map(c => `<span>${escapeHtml(c)}</span>`)
            .join("")}
        </div>
        <div class="card-status ${dapp.live ? "live" : "inactive"}">
          ${dapp.live ? "Live" : "Not live"}
        </div>
        <button class="card-open">View profile</button>
      </div>
    `;

    const btn = card.querySelector(".card-open");
    if (btn) {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        markDappVisited(dapp.name);
        window.location.href = `profile.html?name=${encodeURIComponent(dapp.name)}`;
      });
    }

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
    if (!raw) return false;
    const [p, s] = raw.split("::").map(x => x.trim());
    if (p !== primary) return false;
    if (!secondary || secondary === "all") return true;
    return s === secondary;
  });
}



function renderGrid() {
  if (!dom.grid) return;

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


function markDappVisited(name) {
  let visited = JSON.parse(localStorage.getItem("monadAtlasVisited") || "[]");

  if (!visited.includes(name)) {
    visited.push(name);
    localStorage.setItem("monadAtlasVisited", JSON.stringify(visited));
    updateXP(visited.length);
  }
}






function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
