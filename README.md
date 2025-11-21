# Monad Atlas  
**Discover live experiences on Monad — dApps, infrastructure, AI-powered search.**
**https://monad-atlas-iota.vercel.app/**
---

## 🔍 What This Project Does  
**Monad Atlas** is an ecosystem explorer for the Monad blockchain — a discovery layer for dApps, tools, infra, and emerging projects.

It provides two main interfaces:

- **Home Page (index.html):**  
  A catalog of all dApps with category filters, status filters, and sorting.
  
- **AI Search (ai.html):**  
  A semantic search engine that understands meaning and returns the most relevant *live* dApps based on natural-language queries.

---

## 🧱 Architecture Overview

### Backend / Python Data Pipeline  
A single script **`build_all.py`** performs the entire dataset-generation lifecycle:

1. **Fetch dApps & Icons**  
   Pulls protocol definitions from GitHub and automatically resolves the project logo  
   (favicon or GitHub avatar).

2. **Website Text Extraction**  
   Scrapes the official project website for up to ~2000 characters of meaningful text (`site_text`).

3. **Embedding Generation**  
   Combines:
   - name  
   - description  
   - categories  
   - scraped website text  
   
   And generates a semantic vector embedding using **MiniLM-L6-v2**.

The pipeline outputs two files:

- `all_dapps_main.json` — core dataset (no embeddings)  
- `all_dapps_embedded.json` — enriched dataset + embeddings  

---

### Frontend (HTML + JavaScript + CSS)

- **index.html** loads `all_dapps_main.json`, displays all dApps, and supports full filtering.  
- **ai.html** loads `all_dapps_embedded.json` and performs semantic search **directly in the browser**.

#### AI Search Workflow:
- Generate an embedding for the user query (MiniLM running locally via WebGPU/WebAssembly).
- Compare it with precomputed dApp embeddings using **cosine similarity**.
- Sort by highest relevance.
- **Return only dApps where `live === true`.**
- Display the top 12 most relevant results.

The AI search grid shows **2 cards per row** on desktop and **1 card per row** on mobile.

---

## 🧠 How AI Search Works (Detailed)

1. Load `all_dapps_embedded.json`.
2. Build an array of `{ dapp, embeddingVector }`.
3. When the user enters a prompt, create a MiniLM embedding for that prompt.
4. Compute cosine similarity between:

