# music-sns

音楽SNSのローカルプロトタイプです。ブラウザで動く静的Webアプリとして実装しています。

## 実装している機能

- アカウント作成と操作アカウントの切り替え
- タイムラインでの音楽共有
- 音源URLがある場合の再生、URLがない場合のデモ音源再生
- タイムラインでのライブ情報共有
- 音楽記事一覧とアカウントごとのコメント投稿
- 共同プレイリストへの曲追加と投票
- フェス予習用ウォッチパーティー
- 公開サーバー上での同期再生、曲キュー共有、リアルタイム風コメント
- Spotify Authorization Code with PKCE によるユーザーごとのOAuth認証
- Spotify Web Playback SDKでのブラウザ内プレイヤー作成
- Spotify検索APIで曲を検索し、候補から選んでウォッチパーティーで再生
- `localStorage` によるローカル保存
- Node.jsサーバーによる静的配信、ウォッチパーティー状態API、Server-Sent Events同期

## 使い方

ローカルではPythonまたはNode.jsサーバーから開いてください。

```powershell
python -m http.server 5173 --bind 127.0.0.1
```

公開サーバーと同じ同期機能をローカルで確認する場合はNode.jsサーバーを使います。

```powershell
npm start
```

ブラウザで以下を開きます。

```text
http://127.0.0.1:5173/
```

## Spotify設定

`config.js` の `spotifyClientId` に、Spotify Developer Dashboardで作成したアプリのClient IDを設定します。

```js
window.MUSIC_SNS_CONFIG = {
  spotifyClientId: "your_spotify_client_id",
};
```

Spotify Developer DashboardではRedirect URIに以下を完全一致で登録してください。

```text
http://127.0.0.1:5173/
```

公開サーバーで使う場合は以下も登録してください。

```text
http://160.16.213.245:5173/
```

ユーザーは画面でClient IDを入力しません。各ユーザーが「検索」や「プレイヤー準備」を使うと、Spotify OAuthで自分のSpotifyアカウントにログインします。

フル再生にはSpotify Premiumアカウントが必要です。

## 公開サーバーへのデプロイ

このアプリを複数端末で同期させる場合は、Pythonの静的サーバーではなくNode.jsサーバーを使ってください。Node.jsサーバーは静的ファイル配信、ウォッチパーティー状態API、Server-Sent Eventsによるリアルタイム配信を行います。

### 1. サーバーへログインする

```bash
ssh <user>@160.16.213.245
```

### 2. 必要なものを入れる

Ubuntu系の例です。

```bash
sudo apt update
sudo apt install -y git nodejs npm
```

Node.jsのバージョンは18以上を推奨します。

```bash
node -v
```

### 3. リポジトリを配置する

```bash
git clone https://github.com/jack-altide/music-sns.git
cd music-sns
```

すでに配置済みの場合は更新します。

```bash
git pull origin main
```

### 4. Spotify Client IDを設定する

`config.js` を編集します。

```js
window.MUSIC_SNS_CONFIG = {
  spotifyClientId: "your_spotify_client_id",
};
```

Spotify Developer DashboardのRedirect URIには以下を登録します。

```text
http://160.16.213.245:5173/
```

### 5. サーバーを起動する

```bash
HOST=0.0.0.0 PORT=5173 npm start
```

ブラウザで以下を開きます。

```text
http://160.16.213.245:5173/
```

### 6. ファイアウォールを確認する

5173番ポートを使う場合は、サーバー側のファイアウォールとクラウド側のセキュリティ設定でTCP 5173を開けてください。

Ubuntuのufwを使っている場合の例です。

```bash
sudo ufw allow 5173/tcp
```

### 7. systemdで常駐化する

`/etc/systemd/system/music-sns.service` を作成します。

```ini
[Unit]
Description=Music SNS prototype
After=network.target

[Service]
WorkingDirectory=/home/<user>/music-sns
Environment=HOST=0.0.0.0
Environment=PORT=5173
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=3
User=<user>

[Install]
WantedBy=multi-user.target
```

起動します。

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now music-sns
sudo systemctl status music-sns
```

ログ確認:

```bash
journalctl -u music-sns -f
```

### 同期仕様

ウォッチパーティーの再生状態、曲キュー、コメントはNode.jsサーバーのメモリ上で共有されます。サーバーは `server-state.json` に状態を保存するため、プロセス再起動後も最後の状態を復元できます。

この実装は単一サーバー・単一Node.jsプロセス向けです。複数台構成や複数プロセス構成にスケールアウトする場合は、RedisやDBなどの共有ストアとPub/Subが必要です。

## 共同開発者向けローカル起動チュートリアル

### 1. リポジトリに参加する

このリポジトリはprivateです。GitHubの招待を承認してから作業してください。

```text
https://github.com/jack-altide/music-sns
```

### 2. 必要なものを用意する

- Git
- Python 3
- ブラウザ
- Spotifyアカウント
- Spotify Premiumアカウント フル再生する場合

### 3. リポジトリをcloneする

```powershell
git clone https://github.com/jack-altide/music-sns.git
cd music-sns
```

すでにclone済みの場合は最新版を取得します。

```powershell
git pull origin main
```

### 4. Spotify Client IDを設定する

`config.js` を開き、`spotifyClientId` にアプリ共通のSpotify Client IDを入れます。

```js
window.MUSIC_SNS_CONFIG = {
  spotifyClientId: "your_spotify_client_id",
};
```

Spotify Developer Dashboard側ではRedirect URIに以下を登録してください。

```text
http://127.0.0.1:5173/
```

SpotifyアプリがDevelopment Modeの場合、利用するSpotifyユーザーをSpotify Developer DashboardのUsers and Accessに追加する必要があります。

### 5. ローカルサーバーを起動する

```powershell
python -m http.server 5173 --bind 127.0.0.1
```

起動したらブラウザで開きます。

```text
http://127.0.0.1:5173/
```

### 6. Spotify連携を確認する

1. ウォッチパーティーを開く
2. `Spotifyログイン/プレイヤー準備` を押す
3. SpotifyのOAuth画面で許可する
4. アプリに戻ったら曲名やアーティスト名で検索する
5. 検索結果から曲を選んで再生する

### 7. よくある問題

`INVALID_CLIENT: Invalid redirect URI` が出る場合は、Spotify Developer DashboardのRedirect URIが `http://127.0.0.1:5173/` と完全一致しているか確認してください。

検索や再生で `403` が出る場合は、SpotifyアプリのDevelopment ModeのUsers and Accessに自分のSpotifyユーザーが追加されているか確認してください。

曲が再生されない場合は、Spotify Premiumアカウントでログインしているか確認してください。

`http://127.0.0.1:5173/` が開けない場合は、サーバーが起動しているか、別のアプリが5173番ポートを使っていないか確認してください。

別のポートで起動する場合は、Spotify Developer DashboardのRedirect URIも同じポートに変更してください。
