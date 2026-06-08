# music-sns

音楽SNSのプロトタイプです。ブラウザで動く画面、Spotify連携、ウォッチパーティーの状態同期を試せます。

このREADMEは、チームメンバーが迷わず作業できるように、ローカル起動と公開サーバーへの反映手順を詳しめに書いています。

## まず読む

作業する場所は2種類あります。

- 自分のPC: コードを書く、ローカルで動かす、GitHubへpushする場所
- 公開サーバー: `160.16.213.245`。GitHubから最新版をpullして、外から見られる状態で動かす場所

ローカルで確認するURL:

```text
http://127.0.0.1:5173/
```

公開サーバーで確認するURL:

```text
http://160.16.213.245:5173/
```

SpotifyのRedirect URIは、URLの末尾 `/` まで完全一致が必要です。

```text
http://127.0.0.1:5173/
http://160.16.213.245:5173/
```

## 実装している機能

- アカウント作成と操作アカウントの切り替え
- タイムラインでの音楽共有
- 権利処理されていない外部音源URLを使わないデモ音源再生
- タイムラインでのライブ情報共有
- 音楽記事一覧とアカウントごとのコメント投稿
- 共同プレイリストへの曲追加と投票
- フェス予習用ウォッチパーティー
- 公開サーバー上での曲キュー共有、再生状態表示、リアルタイム風コメント
- Spotify Authorization Code with PKCE によるユーザーごとのOAuth認証
- Spotify Web Playback SDKでのブラウザ内プレイヤー作成
- Spotify検索APIで曲を検索し、候補から選んで各ユーザー本人の操作で再生
- `localStorage` によるローカル保存
- Node.jsサーバーによる静的配信、ウォッチパーティー状態API、Server-Sent Events同期

## ローカルで起動する

普段の開発ではNode.jsサーバーで起動してください。ウォッチパーティーの同期APIも同じ条件で確認できます。

### 1. 必要なものを用意する

自分のPCに以下を入れてください。

- Git
- Node.js 18以上
- ブラウザ
- Spotifyアカウント
- Spotify Premiumアカウント、フル再生を確認する場合

Node.jsが入っているか確認:

```powershell
node -v
npm -v
```

バージョンが表示されればOKです。`node` が見つからない場合はNode.jsをインストールしてください。

### 2. GitHubの招待を承認する

このリポジトリはprivateです。先にGitHubの招待を承認してください。

```text
https://github.com/jack-altide/music-sns
```

### 3. リポジトリをcloneする

PowerShellやターミナルを開いて、作業したいフォルダで実行します。

```powershell
git clone https://github.com/jack-altide/music-sns.git
cd music-sns
```

すでにclone済みなら、最新版を取り込みます。

```powershell
cd music-sns
git pull origin main
```

### 4. Spotify Client IDを確認する

`config.js` にSpotifyのClient IDが入っている必要があります。

```js
window.MUSIC_SNS_CONFIG = {
  spotifyClientId: "your_spotify_client_id",
};
```

アプリ共通のClient IDが共有されている場合は、それを入れてください。

Spotify Developer Dashboard側には、ローカル用Redirect URIを登録します。

```text
http://127.0.0.1:5173/
```

SpotifyアプリがDevelopment Modeの場合、使うSpotifyユーザーをSpotify Developer DashboardのUsers and Accessに追加する必要があります。

### 5. ローカルサーバーを起動する

PowerShellやターミナルで、リポジトリ直下にいることを確認してから実行します。

```powershell
npm start
```

以下のような表示が出れば起動しています。

```text
music-sns server listening on http://0.0.0.0:5173
```

ブラウザで開きます。

```text
http://127.0.0.1:5173/
```

サーバーを止めたいときは、`npm start` を実行している画面で `Ctrl + C` を押します。

### 6. 動作確認する

1. ブラウザで `http://127.0.0.1:5173/` を開く
2. ウォッチパーティーを開く
3. `Spotifyログイン/プレイヤー準備` を押す
4. Spotifyの画面で許可する
5. アプリに戻ったら曲名やアーティスト名で検索する
6. 検索結果から曲を選んで再生する

### 7. ローカル起動で困ったとき

`http://127.0.0.1:5173/` が開けない:

```powershell
npm start
```

を実行しているか確認してください。別のアプリが5173番ポートを使っている場合は、一度そのアプリを止めます。

`INVALID_CLIENT: Invalid redirect URI` が出る:

Spotify Developer DashboardのRedirect URIが以下と完全一致しているか確認してください。

```text
http://127.0.0.1:5173/
```

Spotify検索や再生で `403` が出る:

SpotifyアプリのDevelopment ModeのUsers and Accessに、自分のSpotifyユーザーが追加されているか確認してください。

曲がフル再生されない:

Spotify Premiumアカウントでログインしているか確認してください。

## チーム開発の基本

作業前に最新版を取り込みます。

```powershell
git pull origin main
```

変更後、構文チェックをします。

```powershell
npm run check
```

初めてコミットするときに名前とメールアドレスを聞かれたら、先に設定します。

```powershell
git config user.name "自分の名前"
git config user.email "GitHubに登録しているメールアドレス"
```

問題なければ、変更したファイルを確認してからコミットしてpushします。

```powershell
git status
git add README.md
git commit -m "変更内容が分かる短いメッセージ"
git push origin main
```

`git add README.md` の部分は例です。実際には、自分が変更したファイル名を指定してください。

他の人が同じファイルを触っていると、`git pull` や `git push` で衝突することがあります。その場合は勝手に消さず、チーム内で確認してください。

## Spotify設定

`config.js` の `spotifyClientId` に、Spotify Developer Dashboardで作成したアプリのClient IDを設定します。

```js
window.MUSIC_SNS_CONFIG = {
  spotifyClientId: "your_spotify_client_id",
};
```

ローカル用Redirect URI:

```text
http://127.0.0.1:5173/
```

公開サーバー用Redirect URI:

```text
http://160.16.213.245:5173/
```

ユーザーは画面でClient IDを入力しません。各ユーザーが「検索」や「プレイヤー準備」を使うと、Spotify OAuthで自分のSpotifyアカウントにログインします。

フル再生にはSpotify Premiumアカウントが必要です。

## 権利・Spotify規約対応

公開運用を前提に、以下の制限を入れています。

- 外部音源URLの投稿・保存・再生は行いません。Spotify以外の手動追加曲はWeb Audioで生成したデモ音源だけを再生します。
- Spotify曲の再生は各参加者本人のクリック時だけ行います。サーバーから受け取ったウォッチパーティー状態だけで、他ユーザーのSpotifyを自動再生・自動停止しません。
- Spotify由来のキュー情報は曲ID、URI、Spotifyリンク、曲名、アーティスト名、長さ、追加日時に絞って保存します。ジャケット画像URLは永続化せず、表示時にSpotify APIから一時取得します。
- Spotify由来のキュー情報は7日を超えると読み込み・保存時に破棄します。
- コメントやメモには、音源ファイルURLと `歌詞:` / `lyrics:` 形式の歌詞本文投稿を受け付けません。
- Spotify由来の曲表示にはSpotifyへのリンクを付けます。公開前にSpotify Developer Terms、Developer Policy、Design & Branding Guidelinesを再確認してください。

## 公開サーバーにデプロイする

公開サーバーでは、GitHubから最新版を取得して、Node.jsサーバーを常駐起動します。

サーバー情報:

```text
IPアドレス: 160.16.213.245
公開URL: http://160.16.213.245:5173/
```

### 授業PDFのさくらVPSを使う場合

PDFの手順で作成したさくらVPSは、Ubuntu 24.04とApacheの実習環境を前提にしています。このアプリはNode.jsサーバーで動かすため、SSHログインとUbuntu上の作業はそのまま使えますが、Apache、`public_html`、CGI、SQLiteの手順は必須ではありません。

- 最初のログインユーザーが `ubuntu` の場合は `ssh ubuntu@160.16.213.245` で入ります。
- 別ユーザーで配置する場合は、以下の `<user>` をそのユーザー名に置き換えてください。
- PDFでApacheを入れていても、Node.jsを `5173` 番で動かすだけなら共存できます。Apacheは通常 `80` 番を使うため、このREADMEの `5173` 番起動とは競合しません。
- `http://160.16.213.245:5173/` で直接公開する場合は、Ubuntu側のファイアウォールに加えて、さくらVPSのパケットフィルターでもTCP `5173` をカスタム許可してください。
- Apache経由で `http://160.16.213.245/` に出したい場合は、Apacheのリバースプロキシ設定が別途必要です。その場合はSpotify Developer DashboardのRedirect URIも `http://160.16.213.245/` に変わります。
- systemdの `WorkingDirectory=/home/<user>/music-sns` と `User=<user>` は、実際にリポジトリを置いたユーザーに合わせてください。

### 初回デプロイ

ここからのコマンドは、公開サーバーにSSHログインしてから実行します。自分のPCではなく、`160.16.213.245` の中で実行するコマンドです。

#### 1. サーバーへログインする

ユーザー名が `ubuntu` の場合:

```bash
ssh ubuntu@160.16.213.245
```

別のユーザー名の場合:

```bash
ssh <user>@160.16.213.245
```

#### 2. 必要なソフトを入れる

```bash
sudo apt update
sudo apt install -y git nodejs npm
```

Node.jsのバージョンを確認します。

```bash
node -v
npm -v
```

Node.jsは18以上を推奨します。`v18` 以上ならOKです。

#### 3. GitHubからリポジトリを取得する

ホームディレクトリに移動します。

```bash
cd ~
```

初回だけcloneします。

```bash
git clone https://github.com/jack-altide/music-sns.git
cd music-sns
```

privateリポジトリなので、GitHubのユーザー名と認証情報を求められることがあります。GitHubの通常パスワードではなく、Personal Access TokenまたはSSHキーを使ってください。

#### 4. Spotify Client IDを設定する

`config.js` を編集します。初心者は `nano` が分かりやすいです。

```bash
nano config.js
```

中身を以下の形にします。

```js
window.MUSIC_SNS_CONFIG = {
  spotifyClientId: "your_spotify_client_id",
};
```

保存は `Ctrl + O`、Enter、終了は `Ctrl + X` です。

Spotify Developer Dashboardには、公開サーバー用Redirect URIを登録します。

```text
http://160.16.213.245:5173/
```

#### 5. 一度手動で起動して確認する

```bash
HOST=0.0.0.0 PORT=5173 npm start
```

ブラウザで開きます。

```text
http://160.16.213.245:5173/
```

表示できたら、サーバー画面で `Ctrl + C` を押して一度止めます。次の手順で、ログアウトしても動き続けるようにします。

#### 6. 5173番ポートを開ける

Ubuntu側のファイアウォールを使っている場合:

```bash
sudo ufw allow 5173/tcp
sudo ufw status
```

さくらVPSのコントロールパネルでも、パケットフィルターのカスタム設定でTCP `5173` を許可してください。

ブラウザで `http://160.16.213.245:5173/` が開けない場合は、ここが原因になりやすいです。

#### 7. systemdで常駐化する

ログアウトしてもアプリが動き続けるように、systemdサービスを作ります。

まず、`npm` の場所を確認します。

```bash
which npm
```

多くの場合は以下です。

```text
/usr/bin/npm
```

サービスファイルを作成します。

```bash
sudo nano /etc/systemd/system/music-sns.service
```

ユーザー名が `ubuntu` で、リポジトリを `/home/ubuntu/music-sns` に置いた場合:

```ini
[Unit]
Description=Music SNS prototype
After=network.target

[Service]
WorkingDirectory=/home/ubuntu/music-sns
Environment=HOST=0.0.0.0
Environment=PORT=5173
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=3
User=ubuntu

[Install]
WantedBy=multi-user.target
```

別ユーザーで配置した場合は、`WorkingDirectory` と `User` を変えてください。

保存したら、サービスを起動します。

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now music-sns
sudo systemctl status music-sns
```

`active (running)` と出ればOKです。

ログを見たい場合:

```bash
journalctl -u music-sns -f
```

ログ表示を止めるときは `Ctrl + C` です。

### 2回目以降のデプロイ

誰かがGitHubにpushした最新版を、公開サーバーに反映する手順です。

自分のPCでpushしたあと、公開サーバーにSSHログインします。

```bash
ssh ubuntu@160.16.213.245
```

リポジトリへ移動します。

```bash
cd ~/music-sns
```

最新版を取得します。

```bash
git pull origin main
```

構文チェックをします。

```bash
npm run check
```

問題なければサービスを再起動します。

```bash
sudo systemctl restart music-sns
sudo systemctl status music-sns
```

ブラウザで確認します。

```text
http://160.16.213.245:5173/
```

### 公開サーバーで困ったとき

サーバーが起動しているか確認:

```bash
sudo systemctl status music-sns
```

ログを見る:

```bash
journalctl -u music-sns -n 80
```

5173番で待ち受けているか確認:

```bash
sudo ss -ltnp | grep 5173
```

サービスを再起動:

```bash
sudo systemctl restart music-sns
```

GitHubからpullできない:

- privateリポジトリにアクセスできるGitHubアカウントか確認する
- HTTPSでclone/pullする場合、GitHubの通常パスワードではなくPersonal Access Tokenを使う
- SSHキーを使う場合、サーバー側に秘密鍵、GitHub側に公開鍵が登録されているか確認する

ブラウザで開けない:

- URLが `http://160.16.213.245:5173/` になっているか確認する
- `sudo systemctl status music-sns` で起動中か確認する
- `sudo ufw status` で5173番が許可されているか確認する
- さくらVPSのパケットフィルターでTCP 5173が許可されているか確認する
- SpotifyのエラーならRedirect URIが `http://160.16.213.245:5173/` と完全一致しているか確認する

## 同期仕様

ウォッチパーティーの再生状態、曲キュー、コメントはNode.jsサーバーのメモリ上で共有されます。サーバーは `server-state.json` に状態を保存するため、プロセス再起動後も最後の状態を復元できます。

この実装は単一サーバー・単一Node.jsプロセス向けです。複数台構成や複数プロセス構成にスケールアウトする場合は、RedisやDBなどの共有ストアとPub/Subが必要です。
