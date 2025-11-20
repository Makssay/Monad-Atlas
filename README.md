# 🌌 Monad Atlas  
**An interactive discovery layer for the Monad ecosystem**

🔗 **Live Project:** https://monad-atlas-iota.vercel.app/

Monad Atlas is a visual, searchable, and AI-powered directory of all dApps across the Monad ecosystem — including DeFi, AI, Gaming, Infrastructure, Tooling, and more.  
The project provides an immersive interface for browsing, filtering, and analyzing ecosystem applications.

---

## 🚀 Features

### ✔ Full dApp Index
- Loads data from `all_dapps_main.json`
- Filtering by:
  - Primary category  
  - Subcategory  
  - Live / Not Live status  
  - Alphabetical sorting or “Live First”

### ✔ Full-Text Search
Search by:
- name  
- description  

### ✔ Semantic AI Search
The `ai.html` page includes an AI-powered semantic search engine that finds dApps **by meaning**, not just keywords.

Uses:
- domain keyword dictionaries (DeFi, AI, NFT, Trading, Gaming, etc.)  
- 10-dimensional semantic vectors  
- L2 normalization  
- cosine similarity  
- lexical boosting  
- hybrid scoring (semantic + lexical)

Core logic: `buildSemanticVectors()` and `runAISearch()` in `script.js`.

---

## 📂 Project Structure


```
/
│ index.html              # Main dApp index page
│ profile.html            # Individual dApp profile page
│ ai.html                 # Semantic AI Search page
│
│ script.js               # Main app logic (filters, rendering, search)
│ profile.js              # Profile page rendering
│ galaxy.js               # Animated canvas background (uses cosmonaut images)
│ style.css               # Styles and UI
│
│ all_dapps_main.json     # Dataset of all dApps
│ fetch_favicons.py       # Script for fetching pfp and building dataset
│
└── icons/                # Contains Monad logo and two cosmonaut images used in the UI & galaxy animation
```


---

## 🧠 How AI Search Works

AI Search uses a hybrid ranking algorithm:

### 1. Semantic Vectorization
Each dApp becomes a 10D vector based on:
- keyword frequency  
- category-based heuristics  
- L2 normalization  

### 2. Query Vectorization
User input is converted into a semantic vector as well.

### 3. Ranking
- cosine similarity  
- lexical boosting  
- boosts for high-signal queries (memecoin, trading, cross-chain)

Final score = **semanticScore + lexicalBoost**

---

## 🔧 Adding a New dApp

### Method 1 — Add manually to JSON

```json
{
  "name": "Your dApp",
  "description": "Short description",
  "live": true,
  "categories": ["DeFi::DEX", "Infra::Other"],
  "addresses": {
    "ContractName": "0x123..."
  },
  "links": {
    "project": "https://example.com",
    "twitter": "https://x.com/example",
    "github": "https://github.com/org/repo",
    "docs": "https://docs.example.com"
  },
  "pfp": "https://your-logo-url.com/icon.png"
}
```

### Method 2 — Automatic build from GitHub metadata

Run:

```
python fetch_favicons.py
```

The script:
- fetches metadata from `monad-crypto/protocols`
- extracts favicons or GitHub avatars  
- inserts `pfp` for each dApp  
- generates an updated `all_dapps_main.json`

---

## ✨ Authors & Contributors

Project authors:

- https://x.com/Makssay_eth  
- https://x.com/AlexRocker0330  

Built as part of the Monad ecosystem tools.  
Contributions and improvements are welcome.

---
