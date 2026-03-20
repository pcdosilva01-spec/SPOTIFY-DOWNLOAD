# 🎵 Spotify Downloader

Interface estilo Spotify para baixar músicas de playlists públicas.

## Pré-requisitos

- [Node.js](https://nodejs.org/) v18+
- [yt-dlp](https://github.com/yt-dlp/yt-dlp/releases) — baixe o executável e coloque na pasta do projeto (ou no PATH do sistema)
- [ffmpeg](https://ffmpeg.org/download.html) — necessário para conversão para MP3 (adicione ao PATH)
- Conta de desenvolvedor Spotify: https://developer.spotify.com/dashboard

## Configuração

### 1. Credenciais Spotify

1. Acesse https://developer.spotify.com/dashboard
2. Crie um app (qualquer nome)
3. Copie o **Client ID** e **Client Secret**
4. Edite o arquivo `.env`:

```
SPOTIFY_CLIENT_ID=seu_client_id_aqui
SPOTIFY_CLIENT_SECRET=seu_client_secret_aqui
PORT=3000
```

### 2. yt-dlp (Windows)

Baixe `yt-dlp.exe` em https://github.com/yt-dlp/yt-dlp/releases/latest
e coloque na pasta raiz do projeto (`Site/yt-dlp.exe`).

### 3. ffmpeg (Windows)

Baixe em https://ffmpeg.org/download.html, extraia e adicione a pasta `bin/` ao PATH do sistema.

## Instalação e execução

```bash
npm install
npm start
```

Acesse: http://localhost:3000

## Como usar

1. Cole o link de uma playlist pública do Spotify
2. Clique em **Buscar Playlist**
3. Clique em **Baixar** em cada música, ou **Baixar Tudo** / **Baixar ZIP**

## Estrutura

```
Site/
├── server.js        # Backend Express
├── .env             # Credenciais (não versionar)
├── package.json
└── public/
    ├── index.html
    ├── style.css
    └── app.js
```

## Observações

- Apenas playlists **públicas** funcionam com Client Credentials
- O download usa o YouTube via `yt-dlp` buscando "Artista - Música audio"
- O ZIP é gerado no servidor e pode demorar para playlists grandes
