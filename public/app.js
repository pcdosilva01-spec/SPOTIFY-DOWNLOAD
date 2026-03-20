const API = "http://localhost:3000/api";
let tracks = [];
let isDownloadingAll = false;

// ── Buscar Playlist ────────────────────────────────────────────────────────────
async function fetchPlaylist() {
  const url = document.getElementById("playlistUrl").value.trim();
  if (!url) return showToast("Cole o link da playlist primeiro");

  setFetchLoading(true);
  hideError();

  try {
    const res = await fetch(`${API}/playlist?url=${encodeURIComponent(url)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro desconhecido");
    renderPlaylist(data);
  } catch (err) {
    showError(err.message);
  } finally {
    setFetchLoading(false);
  }
}

// ── Renderizar Playlist ────────────────────────────────────────────────────────
function renderPlaylist(data) {
  tracks = data.tracks;

  document.getElementById("playlistCover").src = data.cover;
  document.getElementById("playlistName").textContent = data.name;
  document.getElementById("playlistDesc").textContent = data.description || "";
  document.getElementById("playlistTotal").textContent = `${data.total} músicas`;

  const list = document.getElementById("trackList");
  list.innerHTML = tracks.map((t, i) => `
    <div class="track-item" id="track-${i}">
      <span class="track-num">${i + 1}</span>
      <img class="track-cover" src="${t.cover}" alt="" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 44 44%22><rect width=%2244%22 height=%2244%22 fill=%22%23282828%22/></svg>'" />
      <div class="track-info">
        <div class="track-name">${escHtml(t.name)}</div>
        <div class="track-artist">${escHtml(t.artist)}</div>
      </div>
      <div class="track-actions" id="actions-${i}">
        <button class="btn-download" onclick="downloadTrack(${i})">
          <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M5 20h14v-2H5v2zm7-18L5.33 9h3.84v6h5.66V9h3.84L12 2z"/></svg>
          Baixar
        </button>
      </div>
    </div>
  `).join("");

  document.getElementById("playlistSection").classList.remove("hidden");
  document.getElementById("playlistSection").scrollIntoView({ behavior: "smooth" });
}

// ── Download Individual ────────────────────────────────────────────────────────
async function downloadTrack(index) {
  const track = tracks[index];
  setTrackStatus(index, "downloading");

  try {
    const params = new URLSearchParams({ name: track.name, artist: track.artist });
    const res = await fetch(`${API}/download?${params}`);

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Falha no download" }));
      throw new Error(err.error);
    }

    const blob = await res.blob();
    triggerDownload(blob, `${track.artist} - ${track.name}.mp3`);
    setTrackStatus(index, "done");
    showToast(`✓ ${track.name} baixada!`);
  } catch (err) {
    setTrackStatus(index, "error");
    showToast(`✗ ${track.name}: ${err.message}`, true);
  }
}

// ── Download Tudo (fila) ───────────────────────────────────────────────────────
async function downloadAll() {
  if (isDownloadingAll || !tracks.length) return;
  isDownloadingAll = true;

  const btn = document.getElementById("downloadAllBtn");
  btn.disabled = true;

  const container = document.getElementById("progressContainer");
  const bar = document.getElementById("progressBar");
  const text = document.getElementById("progressText");
  const count = document.getElementById("progressCount");

  container.classList.remove("hidden");
  let done = 0;

  for (let i = 0; i < tracks.length; i++) {
    text.textContent = `Baixando: ${tracks[i].name}`;
    count.textContent = `${i + 1} / ${tracks.length}`;
    bar.style.width = `${((i) / tracks.length) * 100}%`;

    await downloadTrack(i);
    done++;
    bar.style.width = `${(done / tracks.length) * 100}%`;
  }

  text.textContent = "Concluído!";
  count.textContent = `${done} / ${tracks.length}`;
  showToast(`✓ ${done} músicas baixadas!`);
  btn.disabled = false;
  isDownloadingAll = false;
}

// ── Download ZIP ───────────────────────────────────────────────────────────────
async function downloadZip() {
  if (!tracks.length) return;
  showToast("Preparando ZIP... isso pode demorar");

  try {
    const res = await fetch(`${API}/download-zip`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tracks }),
    });

    if (!res.ok) throw new Error("Falha ao gerar ZIP");

    const blob = await res.blob();
    triggerDownload(blob, "playlist.zip");
    showToast("✓ ZIP baixado com sucesso!");
  } catch (err) {
    showToast(`✗ ${err.message}`, true);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function setTrackStatus(index, status) {
  const actions = document.getElementById(`actions-${index}`);
  if (!actions) return;

  const labels = { downloading: "Baixando...", done: "✓ Baixado", error: "✗ Erro" };
  const classes = { downloading: "status-downloading", done: "status-done", error: "status-error" };

  if (status === "downloading") {
    actions.innerHTML = `<span class="track-status ${classes[status]}">${labels[status]}</span>`;
  } else {
    actions.innerHTML = `
      <span class="track-status ${classes[status]}">${labels[status]}</span>
      <button class="btn-download" onclick="downloadTrack(${index})">↺</button>
    `;
  }
}

function triggerDownload(blob, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

function setFetchLoading(loading) {
  document.getElementById("fetchBtnText").classList.toggle("hidden", loading);
  document.getElementById("fetchSpinner").classList.toggle("hidden", !loading);
  document.getElementById("fetchBtn").disabled = loading;
}

function showError(msg) {
  const el = document.getElementById("errorMsg");
  el.textContent = `⚠ ${msg}`;
  el.classList.remove("hidden");
}

function hideError() {
  document.getElementById("errorMsg").classList.add("hidden");
}

function escHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

let toastTimer;
function showToast(msg, isError = false) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.style.background = isError ? "rgba(231,76,60,0.9)" : "#282828";
  toast.classList.remove("hidden");
  requestAnimationFrame(() => toast.classList.add("show"));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.classList.add("hidden"), 300);
  }, 3500);
}

// Enter para buscar
document.getElementById("playlistUrl").addEventListener("keydown", (e) => {
  if (e.key === "Enter") fetchPlaylist();
});
