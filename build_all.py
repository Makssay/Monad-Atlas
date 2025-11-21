import requests
import json
import json5
import time
import cloudscraper
from urllib.parse import urlparse
from bs4 import BeautifulSoup
from sentence_transformers import SentenceTransformer


# ============================================================
# CONFIG
# ============================================================

MAIN_OUTPUT = "all_dapps_main.json"
EMBED_OUTPUT = "all_dapps_embedded.json"
GITHUB_API = "https://api.github.com/repos/monad-crypto/protocols/contents/mainnet?ref=main"

print("\n========================================")
print("   MONAD BUILD SYSTEM — FULL PIPELINE")
print("========================================\n")


# ============================================================
# HELPERS
# ============================================================

def clean(text: str) -> str:
    return " ".join(text.replace("\n", " ").replace("\t", " ").split())


def safe_get(url):
    try:
        r = requests.get(url, timeout=10)
        if r.status_code == 200:
            return r.text
    except:
        pass
    return None


# ============================================================
# 1) FETCH DAPPS FROM GITHUB + LOGOS (FAVICONS)
# ============================================================

def get_repo_files():
    resp = requests.get(GITHUB_API)
    resp.raise_for_status()
    return [f for f in resp.json() if f["name"].endswith((".json", ".jsonc"))]


def load_json_file(file_url):
    try:
        r = requests.get(file_url)
        r.raise_for_status()
        return json5.loads(r.text)
    except Exception as e:
        print(f"[ERROR] Cannot load JSON {file_url}: {e}")
    return None


def get_favicon_from_site(url):
    if not url:
        return None

    try:
        parsed = urlparse(url)
        base = f"{parsed.scheme}://{parsed.netloc}"

        ico = base + "/favicon.ico"
        if requests.head(ico).status_code == 200:
            return ico

        html = safe_get(url)
        if not html:
            return None

        soup = BeautifulSoup(html, "html.parser")
        link = soup.find("link", rel=lambda x: x and "icon" in x.lower())
        if link and link.get("href"):
            href = link["href"]
            return href if href.startswith("http") else base + href

    except:
        return None

    return None


def get_github_avatar(github_url):
    try:
        if not github_url:
            return None
        parts = github_url.split("/")
        org = parts[3]
        r = requests.get(f"https://api.github.com/users/{org}")
        if r.status_code == 200:
            return r.json().get("avatar_url")
    except:
        pass
    return None


def build_main():
    print("\n[1] Fetching DApps from GitHub...")

    files = get_repo_files()
    dapps = []

    for f in files:
        raw_url = f"https://raw.githubusercontent.com/monad-crypto/protocols/main/mainnet/{f['name']}"
        data = load_json_file(raw_url)
        if not data:
            continue

        links = data.get("links", {})
        project = links.get("project")
        github = links.get("github")
        docs = links.get("docs")

        # best favicon
        pfp = (
            get_github_avatar(github)
            or get_favicon_from_site(project)
        )

        data["pfp"] = pfp
        dapps.append(data)

        print("   ✓", data.get("name"))

    print(f"\n[DONE] {len(dapps)} dApps loaded.\n")

    with open(MAIN_OUTPUT, "w", encoding="utf-8") as f:
        json.dump(dapps, f, indent=2, ensure_ascii=False)

    print("→ Saved:", MAIN_OUTPUT)
    return dapps


# ============================================================
# 2) SCRAPE SITE TEXT
# ============================================================

def scrape_site(url: str) -> str:
    if not url:
        return ""

    print(f"[SCRAPE] {url}")

    headers = {
        "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/123 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
    }

    try:
        html = requests.get(url, headers=headers, timeout=10).text
    except:
        try:
            scraper = cloudscraper.create_scraper()
            html = scraper.get(url).text
        except:
            return ""

    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()

    text = clean(soup.get_text(" "))
    return text[:2000]


# ============================================================
# 3) GENERATE EMBEDDINGS
# ============================================================

print("[MODEL] Loading MiniLM...")
model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
print("[MODEL] Ready.\n")


def embed(text):
    vec = model.encode(text, normalize_embeddings=True)
    return vec.tolist()


# ============================================================
# 4) MASTER PIPELINE
# ============================================================

def build_all():
    # Step 1 — Github + avatars
    dapps = build_main()

    final = []
    total = len(dapps)

    for i, d in enumerate(dapps, 1):
        print(f"\n[{i}/{total}] {d.get('name')}")

        links = d.get("links", {})
        url = links.get("project") or links.get("app")

        site_text = scrape_site(url) if url else ""
        d["site_text"] = site_text

        base_text = (
            f"{d.get('name')} "
            f"{d.get('description')} "
            f"{' '.join(d.get('categories', []))} "
            f"{site_text}"
        )

        vector = embed(base_text)
        d["embedding"] = vector

        final.append(d)

        print(f"✓ embedded ({len(base_text)} chars)")
        time.sleep(0.2)

    with open(EMBED_OUTPUT, "w", encoding="utf-8") as f:
        json.dump(final, f, indent=2, ensure_ascii=False)

    print("\n→ Saved:", EMBED_OUTPUT)
    print("\nALL COMPLETED SUCCESSFULLY.\n")


if __name__ == "__main__":
    build_all()
