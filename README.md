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
- 複数タブ間での同期再生、曲キュー共有、リアルタイム風コメント
- Spotify Authorization Code with PKCE によるユーザーごとのOAuth認証
- Spotify Web Playback SDKでのブラウザ内プレイヤー作成
- Spotify検索APIで曲を検索し、候補から選んでウォッチパーティーで再生
- `localStorage` によるローカル保存

## 使い方

ローカルサーバーから開いてください。

```powershell
python -m http.server 5173 --bind 127.0.0.1
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

ユーザーは画面でClient IDを入力しません。各ユーザーが「検索」や「プレイヤー準備」を使うと、Spotify OAuthで自分のSpotifyアカウントにログインします。

フル再生にはSpotify Premiumアカウントが必要です。

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
