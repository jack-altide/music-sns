# music-sns

音楽SNSのプロトタイプです。ブラウザで動く画面、iTunes曲検索、ウォッチパーティーの状態同期を試せます。

このREADMEは、チームメンバーが迷わず作業できるように、ローカル起動と公開サーバーへの反映手順を詳しめに書いています。

## まず読む

作業する場所は2種類あります。

- 自分のPC: コードを書く、ローカルで動かす、GitHubへpushする場所
- 公開サーバー: `160.16.213.245`。GitHubから最新版をpullして、外から見られる状態で動かす場所

ローカルで確認するURL:

```text
http://127.0.0.1:5173/
```

公開サーバーで画面だけ確認するURL:

```text
http://160.16.213.245:5173/
```

iTunes Search APIはログインやAPIキーなしで使えます。ローカル確認でも公開サーバーでも追加のDeveloper Dashboard設定は不要です。

## 実装している機能

- アカウント作成と操作アカウントの切り替え
- タイムラインでの音楽共有
- タイムライン用のデモ音源再生
- タイムラインでのライブ情報共有
- 音楽記事一覧とアカウントごとのコメント投稿
- 共同プレイリストへの曲追加と投票
- 共同プレイリストでのiTunes曲検索、ジャケット表示、iTunesリンク表示、短いプレビュー再生
- フェス予習用ウォッチパーティー
- 公開サーバー上での曲キュー共有、再生状態表示、リアルタイム風コメント
- iTunes Search APIで曲を検索し、候補をキューへ追加
- iTunes由来の曲はiTunesリンク、ジャケット、Apple提供の短いプレビューを表示・再生
- `localStorage` によるローカル保存
- Node.jsサーバーによる静的配信、ウォッチパーティー状態API、Server-Sent Events同期

## ローカルで起動する

普段の開発ではNode.jsサーバーで起動してください。ウォッチパーティーの同期APIも同じ条件で確認できます。

### 1. 必要なものを用意する

自分のPCに以下を入れてください。

- Git
- Node.js 18以上
- ブラウザ

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

### 4. 設定を確認する

曲検索はiTunes Search APIを直接使うため、`config.js` の設定や外部サービスのログインは不要です。

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
3. 曲名やアーティスト名で検索する
4. 検索結果から曲をキューに追加する

### 7. ローカル起動で困ったとき

`http://127.0.0.1:5173/` が開けない:

```powershell
npm start
```

を実行しているか確認してください。別のアプリが5173番ポートを使っている場合は、一度そのアプリを止めます。

iTunes検索でエラーが出る:

ネットワーク接続、ブラウザのコンソール、`https://itunes.apple.com/search` へのアクセス可否を確認してください。

iTunesプレビューの音が出ない:

- 検索結果から曲を追加し直して、キューに `previewUrl` が入る状態にしてください
- ブラウザのタブミュート、OS音量、iPhoneの消音モード、サイトの音声許可を確認してください
- ブラウザの自動再生制限があるため、必ず「追加して再生」「再生」「プレビュー確認」などのボタン操作から再生してください
- ネットワークから `https://audio-ssl.itunes.apple.com/` にアクセスできるか確認してください

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

## 曲検索設定

iTunes Search APIを使うため、APIキー、Client ID、OAuthログイン、Redirect URIは不要です。

このプロトタイプは外部サービスのフル再生を行いません。iTunesは曲検索、曲ID、iTunesリンク、ジャケット表示、Apple提供の短いプレビュー再生に使います。

iTunes検索結果に `previewUrl` が含まれる場合、ブラウザの `Audio` 要素でそのURLを直接再生します。プレビュー音源はApple側から配信される短い試聴用データで、アプリ内に曲ファイルを保存したり、曲本体を保有したりする設計ではありません。

Web Audio APIは、タイムラインなどの仮デモ音にだけ使います。iTunes検索から追加した曲の再生には使いません。

## 権利・外部カタログ対応

公開運用を前提に、以下の制限を入れています。

- ユーザー入力による外部音源URLの投稿・保存・再生は行いません。iTunes検索結果に含まれるApple提供のプレビューURLだけを再生対象にします。
- iTunes曲は検索結果からキューへ追加し、iTunesリンクを表示します。アプリから外部音源のフル再生や転送は行いません。
- iTunes由来のキュー情報は曲ID、iTunesリンク、プレビューURL、ジャケットURL、曲名、アーティスト名、プレビュー長、追加日時に絞って保存します。
- 外部カタログ由来のキュー情報は30日を超えると読み込み・保存時に破棄します。
- コメントやメモには、音源ファイルURLと `歌詞:` / `lyrics:` 形式の歌詞本文投稿を受け付けません。
- iTunes由来の曲表示にはiTunesへのリンクを付けます。公開前にAppleのiTunes Search API利用条件を再確認してください。

## 公開サーバーにデプロイする

公開サーバーでは、GitHubから最新版を取得して、Node.jsサーバーを常駐起動します。

サーバー情報:

```text
IPアドレス: 160.16.213.245
画面確認URL: http://160.16.213.245:5173/
HTTPS公開URL: https://160.16.213.245.sslip.io/
```

### 授業PDFのさくらVPSを使う場合

PDFの手順で作成したさくらVPSは、Ubuntu 24.04とApacheの実習環境を前提にしています。このアプリはNode.jsサーバーで動かすため、SSHログインとUbuntu上の作業はそのまま使えますが、Apache、`public_html`、CGI、SQLiteの手順は必須ではありません。

- 最初のログインユーザーが `ubuntu` の場合は `ssh ubuntu@160.16.213.245` で入ります。
- 別ユーザーで配置する場合は、以下の `<user>` をそのユーザー名に置き換えてください。
- PDFでApacheを入れていても、Node.jsを `5173` 番で動かすだけなら共存できます。Apacheは通常 `80` 番を使うため、このREADMEの `5173` 番起動とは競合しません。
- `http://160.16.213.245:5173/` で直接開くと画面確認できます。公開運用ではApacheやNginxでHTTPSのリバースプロキシを設定してください。応急対応では `160.16.213.245.sslip.io` を使います。
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

#### 4. 設定ファイルを確認する

曲検索はiTunes Search APIを使うため、追加設定は不要です。`config.js` は以下のままで構いません。

```js
window.MUSIC_SNS_CONFIG = {};
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

この手順は、`http://160.16.213.245:5173/` で直接画面確認したい場合だけ必要です。HTTPSリバースプロキシ構成にする場合、5173番は外部公開せず、Apache/Nginxから `127.0.0.1:5173` へ接続させます。

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

#### 8. HTTPSで公開する場合

本番運用では、公開URLをHTTPSにしてNode.jsへリバースプロキシする構成がおすすめです。

おすすめ構成:

```text
利用者のブラウザ
  ↓ https://160.16.213.245.sslip.io/
Apache または Nginx
  ↓ http://127.0.0.1:5173/
Node.js app
```

この構成では、5173番ポートを外部公開する必要はありません。Node.jsはサーバー内部だけで待ち受けます。

応急対応では `160.16.213.245.sslip.io` を使います。このドメインはIPアドレス `160.16.213.245` に解決されます。独自ドメインを取った場合は、以下の `160.16.213.245.sslip.io` を自分のドメインに置き換えてください。

Apacheを使う例です。

```bash
sudo apt update
sudo apt install -y apache2 certbot python3-certbot-apache
sudo a2enmod proxy proxy_http headers ssl rewrite
```

Apacheの設定ファイルを作ります。

```bash
sudo nano /etc/apache2/sites-available/music-sns.conf
```

中身:

```apache
<VirtualHost *:80>
    ServerName 160.16.213.245.sslip.io

    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:5173/
    ProxyPassReverse / http://127.0.0.1:5173/
</VirtualHost>
```

有効化します。

```bash
sudo a2ensite music-sns
sudo apache2ctl configtest
sudo systemctl reload apache2
```

HTTPS証明書を発行します。

```bash
sudo certbot --apache -d 160.16.213.245.sslip.io
```

systemdのNode起動設定は、外部公開ではなく内部待ち受けに変えるのがおすすめです。

```ini
Environment=HOST=127.0.0.1
Environment=PORT=5173
```

変更したら再起動します。

```bash
sudo systemctl daemon-reload
sudo systemctl restart music-sns
sudo systemctl reload apache2
```

その後、ブラウザで以下を開いて画面と曲検索を確認します。

```text
https://160.16.213.245.sslip.io/
```

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
https://160.16.213.245.sslip.io/
```

HTTPS化していない場合は `http://160.16.213.245:5173/` で画面確認できます。

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

- HTTPS化済みならURLが `https://160.16.213.245.sslip.io/` になっているか確認する
- HTTPS化していない画面確認だけならURLが `http://160.16.213.245:5173/` になっているか確認する
- `sudo systemctl status music-sns` で起動中か確認する
- `sudo ufw status` で5173番が許可されているか確認する
- さくらVPSのパケットフィルターでTCP 5173が許可されているか確認する
- iTunes検索のエラーならサーバーやブラウザから `https://itunes.apple.com/search` にアクセスできるか確認する

HTTPS URLで `Service Unavailable` や「一時的に利用できない」という表示になる:

この場合、ApacheやHTTPSまでは動いていますが、裏側のNode.jsアプリ `http://127.0.0.1:5173/` にApacheが接続できていない可能性が高いです。容量不足ではなく、Nodeサービス停止やsystemd設定ミスが原因になりやすいです。

まず確認します。

```bash
ssh ubuntu@160.16.213.245

sudo systemctl status music-sns --no-pager
curl -i http://127.0.0.1:5173/api/health
sudo ss -ltnp | grep 5173
```

`curl` で `{"ok":true,...}` が返らない場合は、Nodeアプリ側が動いていません。以下で復旧します。

```bash
cd ~/music-sns
git pull origin main
npm run check
sudo systemctl restart music-sns
sudo systemctl status music-sns --no-pager
curl -i http://127.0.0.1:5173/api/health
```

最後の `curl` で `{"ok":true,...}` が返れば、ブラウザで開き直します。

```text
https://160.16.213.245.sslip.io/
```

`Unit music-sns.service could not be found` と出る場合は、systemdサービスがまだ作成されていません。上の「systemdで常駐化する」手順を先に実行してください。

`Unit music-sns.service could not be found` と出たときの作成手順:

まず、サーバー上でリポジトリの場所と `npm` の場所を確認します。

```bash
cd ~/music-sns
pwd
npm run check
which npm
```

`pwd` が `/home/ubuntu/music-sns`、`which npm` が `/usr/bin/npm` なら、以下の内容でサービスファイルを作成します。

```bash
sudo nano /etc/systemd/system/music-sns.service
```

```ini
[Unit]
Description=Music SNS prototype
After=network.target

[Service]
WorkingDirectory=/home/ubuntu/music-sns
Environment=HOST=127.0.0.1
Environment=PORT=5173
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=3
User=ubuntu

[Install]
WantedBy=multi-user.target
```

保存したら、systemdに読み込ませて起動します。

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now music-sns
sudo systemctl status music-sns --no-pager
curl -i http://127.0.0.1:5173/api/health
```

`curl` で `{"ok":true,...}` が返ればNode側は起動できています。最後にApacheを再読み込みします。

```bash
sudo systemctl reload apache2
```

その後、ブラウザで開き直します。

```text
https://160.16.213.245.sslip.io/
```

`which npm` が `/usr/bin/npm` 以外の場合は、サービスファイルの `ExecStart=/usr/bin/npm start` を、`which npm` で表示されたパスに変更してください。

## 同期仕様

ウォッチパーティーの再生状態、曲キュー、コメントはNode.jsサーバーのメモリ上で共有されます。サーバーは `server-state.json` に状態を保存するため、プロセス再起動後も最後の状態を復元できます。

この実装は単一サーバー・単一Node.jsプロセス向けです。複数台構成や複数プロセス構成にスケールアウトする場合は、RedisやDBなどの共有ストアとPub/Subが必要です。
