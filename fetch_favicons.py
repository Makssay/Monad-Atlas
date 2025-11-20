import requests
import json
import json5
from urllib.parse import urlparse
from bs4 import BeautifulSoup

def get_repo_files():
    url = "https://api.github.com/repos/monad-crypto/protocols/contents/mainnet?ref=main"
    resp = requests.get(url)
    resp.raise_for_status()
    return [f for f in resp.json() if f["name"].endswith((".json", ".jsonc"))]

def load_json_file(file_url):
    try:
        r = requests.get(file_url)
        r.raise_for_status()
        return json5.loads(r.text)
    except Exception as e:
        print(f"Ошибка при чтении {file_url}: {e}")
        return None


def get_site_favicon(site_url):
    try:
        parsed = urlparse(site_url)
        base_url = f"{parsed.scheme}://{parsed.netloc}"

        favicon_url = f"{base_url}/favicon.ico"
        if requests.head(favicon_url).status_code == 200:
            return favicon_url


        html = requests.get(site_url, timeout=5).text
        soup = BeautifulSoup(html, "html.parser")
        icon = soup.find("link", rel=lambda x: x and "icon" in x.lower())
        if icon and icon.get("href"):
            href = icon["href"]
            if href.startswith("http"):
                return href
            else:
                return base_url + href
    except Exception as e:
        print(f"Ошибка при получении favicon с {site_url}: {e}")
    return None


def get_github_avatar(github_url):
    try:
        if not github_url:
            return None
        parts = github_url.split("/")
        if len(parts) < 4:
            return None
        org = parts[3]
        resp = requests.get(f"https://api.github.com/users/{org}")
        if resp.status_code == 200:
            return resp.json().get("avatar_url")
    except Exception as e:
        print(f"Ошибка при получении аватарки GitHub {github_url}: {e}")
    return None


def get_docs_icon(docs_url):
    try:
        html = requests.get(docs_url, timeout=5).text
        soup = BeautifulSoup(html, "html.parser")
        icon = soup.find("link", rel=lambda x: x and "icon" in x.lower())
        if icon and icon.get("href"):
            href = icon["href"]
            if href.startswith("http"):
                return href
            else:
                parsed = urlparse(docs_url)
                base_url = f"{parsed.scheme}://{parsed.netloc}"
                return base_url + href
    except Exception:
        pass
    return None


def build_dapp_data():
    files = get_repo_files()
    dapps = []

    for f in files:
        raw_url = f"https://raw.githubusercontent.com/monad-crypto/protocols/main/mainnet/{f['name']}"
        data = load_json_file(raw_url)
        if not data:
            continue

        links = data.get("links", {})
        project_url = links.get("project")
        github_url = links.get("github")
        docs_url = links.get("docs")


        github_avatar = get_github_avatar(github_url)
        site_avatar = get_site_favicon(project_url) if project_url else None
        docs_avatar = get_docs_icon(docs_url) if docs_url else None


        pfp = github_avatar or site_avatar or docs_avatar

        data["pfp"] = pfp
        dapps.append(data)

    with open("all_dapps_main.json", "w", encoding="utf-8") as f:
        json.dump(dapps, f, ensure_ascii=False, indent=2)

    print(f"✅  {len(dapps)} DApps. file: all_dapps_main.json")

if __name__ == "__main__":
    build_dapp_data()
