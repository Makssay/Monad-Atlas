# Monad Atlas  
**Discover live experiences on Monad — dApps, infrastructure, AI-powered search.**
**https://monad-atlas-iota.vercel.app/**

---

## 🔍 Overview  
**Monad Atlas** is a discovery layer for the Monad blockchain — a place to explore dApps, infrastructure, DeFi tools, games, and emerging projects in the ecosystem.

The platform provides two core interfaces:

### 🏠 Home Page (`index.html`)
A full catalog of all indexed dApps featuring:
- category filtering  
- status filtering  
- alphabetical sorting  
- quick search  

### 🤖 AI Search (`ai.html`)
A powerful semantic search engine that understands natural language queries and returns the most relevant *live* dApps based on meaning — not keywords.

---

## 🧱 Architecture

### 🔧 Backend / Data Pipeline (Python)
A unified script **`build_all.py`** performs the entire dataset generation flow:

#### 1. Fetch GitHub Protocol Definitions + Icons  
- Loads dApp definitions from the official `monad-crypto/protocols` repository  
- Detects project logos using:
  - GitHub avatars
  - website favicons  

#### 2. Scrape Website Text  
Extracts meaningful text (up to ~2000 characters) from each project's official website and stores it in:
```
site_text
```

#### 3. Generate Embeddings  
Combines `name + description + categories + site_text` and produces a semantic vector embedding using:

- **SentenceTransformer MiniLM-L6-v2**

#### Output Files
The pipeline produces two JSON datasets:

- **`all_dapps_main.json`** — core dataset used by `index.html`  
- **`all_dapps_embedded.json`** — includes full data + `embedding` vectors for AI search  

---

## 🎨 Frontend (HTML + JS + CSS)

### 🏠 index.html  
Loads `all_dapps_main.json` and renders:
- dApp cards  
- categories  
- filters  
- statuses  
- sorting options  

### 🤖 ai.html  
Loads `all_dapps_embedded.json` and performs AI semantic search **directly in the browser** using the `@xenova/transformers` WebGPU/WASM backend.

### 📌 Features

#### AI Search Flow
1. Load precomputed embeddings for all dApps  
2. Convert user query → MiniLM embedding  
3. Compare it with precomputed dApp embeddings using **cosine similarity**  
4. Filter out all `live === false`  
5. Sort by relevance  
6. Display top-12 dApps  

#### Render  
- Desktop → **2 cards per row**  
- Mobile → **1 card per row**  

---

## 🧠 How AI Search Works (Under the Hood)

1. The frontend loads `all_dapps_embedded.json`  
2. Model MiniLM is loaded via `@xenova/transformers`  
3. The user query is embedded  
4. Cosine similarity is computed with every dApp vector  
5. Only live dApps are included in final results  
6. Results are ranked and rendered

This engine runs:
- fully client-side  
- without an API server  
- without rate limits  
- extremely fast, thanks to WebGPU acceleration  

---

## 🛠 Catalog Filtering (index.html)

Supports:

- **Search:** name + description  
- **Categories:** primary + optional secondary  
- **Status:**  
  - All  
  - Live  
  - Not Live  
- **Sorting:**  
  - A → Z  
  - Z → A  
  - Live First  

Each card includes:
- logo  
- name  
- description  
- categories  
- live status  
- link to full profile  

---

## 👥 Authors

- **Makssay** — https://x.com/Makssay_eth  
- **AlexRocker** — https://x.com/AlexRocker0330  

---
