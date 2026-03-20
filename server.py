import os, re, time, subprocess, tempfile, zipfile
from io import BytesIO
from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
import requests
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_folder="public")
CORS(app)

CLIENT_ID     = os.getenv("SPOTIFY_CLIENT_ID")
CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")

# ── Spotify Token ──────────────────────────────────────────────────────────────
_token, _token_expiry = None, 0

def get_token():
    global _token, _token_expiry
    if _token and time.time() < _token_expiry:
        return _token
    r = requests.post(
        "https://accounts.spotify.com/api/token",
        data={"grant_type": "client_credentials"},
        auth=(CLIENT_ID, CLIENT_SECRET),
    )
    r.raise_for_status()
    data = r.json()
    _token = data["access_token"]
    _token_expiry = time.time() + data["expires_in"] - 60
    return _token

def spotify(path):
    return requests.get(
        f"https://api.spotify.com/v1{path}",
        headers={"Authorization": f"Bearer {get_token()}"},
    ).json()

# ── Playlist ───────────────────────────────────────────────────────────────────
@app.get("/api/playlist")
def playlist():
    url = request.args.get("url", "")
    m = re.search(r"playlist/([a-zA-Z0-9]+)", url)
    if not m:
        return jsonify(error="Link inválido"), 400

    pid = m.group(1)
    info = spotify(f"/playlists/{pid}?fields=name,description,images,tracks.total")

    tracks, next_url = [], (
        f"/playlists/{pid}/tracks?limit=100"
        "&fields=next,items(track(name,artists,album(images)))"
    )
    while next_url:
        page = spotify(next_url) if next_url.startswith("/") else requests.get(
            next_url, headers={"Authorization": f"Bearer {get_token()}"}
        ).json()
        for item in page.get("items", []):
            t = item.get("track")
            if not t or not t.get("name"):
                continue
            images = t.get("album", {}).get("images", [])
            tracks.append({
                "name":   t["name"],
                "artist": ", ".join(a["name"] for a in t["artists"]),
                "cover":  images[1]["url"] if len(images) > 1 else (images[0]["url"] if images else ""),
            })
        next_url = page.get("next")

    return jsonify(
        name=info["name"],
        description=info.get("description", ""),
        cover=info["images"][0]["url"] if info.get("images") else "",
        total=len(tracks),
        tracks=tracks,
    )

# ── Download único ─────────────────────────────────────────────────────────────
YTDLP = "yt-dlp.exe" if os.name == "nt" else "yt-dlp"

def download_mp3(name, artist):
    query   = f"{artist} - {name} audio"
    safe    = re.sub(r'[/\\?%*:|"<>]', "-", f"{artist} - {name}")
    tmp_dir = tempfile.gettempdir()
    out_tpl = os.path.join(tmp_dir, f"{safe}.%(ext)s")
    out_mp3 = os.path.join(tmp_dir, f"{safe}.mp3")

    if os.path.exists(out_mp3):
        os.remove(out_mp3)

    subprocess.run(
        [YTDLP, f"ytsearch1:{query}",
         "--extract-audio", "--audio-format", "mp3",
         "--audio-quality", "0",
         "--output", out_tpl,
         "--no-playlist", "--quiet"],
        timeout=120, check=True,
    )

    if not os.path.exists(out_mp3):
        raise FileNotFoundError("Arquivo MP3 não gerado")

    return out_mp3, safe

@app.get("/api/download")
def download():
    name   = request.args.get("name", "")
    artist = request.args.get("artist", "")
    if not name or not artist:
        return jsonify(error="Parâmetros inválidos"), 400

    try:
        out_mp3, safe = download_mp3(name, artist)
        return send_file(
            out_mp3,
            mimetype="audio/mpeg",
            as_attachment=True,
            download_name=f"{safe}.mp3",
        )
    except subprocess.CalledProcessError:
        return jsonify(error="Música não encontrada no YouTube"), 500
    except Exception as e:
        return jsonify(error=str(e)), 500

# ── Download ZIP ───────────────────────────────────────────────────────────────
@app.post("/api/download-zip")
def download_zip():
    tracks = request.json.get("tracks", [])
    if not tracks:
        return jsonify(error="Nenhuma faixa enviada"), 400

    buf = BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for t in tracks:
            try:
                out_mp3, safe = download_mp3(t["name"], t["artist"])
                zf.write(out_mp3, f"{safe}.mp3")
                os.remove(out_mp3)
            except Exception:
                pass

    buf.seek(0)
    return send_file(buf, mimetype="application/zip",
                     as_attachment=True, download_name="playlist.zip")

# ── Servir frontend ────────────────────────────────────────────────────────────
@app.get("/")
def index():
    return send_from_directory("public", "index.html")

if __name__ == "__main__":
    port = int(os.getenv("PORT", 3000))
    print(f"✅ Servidor rodando em http://localhost:{port}")
    app.run(port=port, debug=False)
