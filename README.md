# music-sns

音楽SNSのローカルプロトタイプです。ブラウザで `index.html` を開くと動作します。

## 実装している機能

- アカウント作成と操作アカウントの切り替え
- タイムラインでの音楽共有
- 音源URLがある場合の再生、URLがない場合のデモ音源再生
- タイムラインでのライブ情報共有
- 音楽記事一覧とアカウントごとのコメント投稿
- 共同プレイリストへの曲追加と投票
- フェス予習用ウォッチパーティー
- 複数タブ間での同期再生、曲キュー共有、リアルタイム風コメント
- Spotify Authorization Code with PKCE によるブラウザ認証
- Spotify Web Playback SDKでのブラウザ内プレイヤー作成
- Spotify検索APIでMrs. GREEN APPLE「ライラック」を検索してウォッチパーティーで再生
- Spotify検索APIで任意の曲名やアーティスト名を検索してウォッチパーティーで再生
- `localStorage` によるローカル保存

## 使い方

`index.html` をブラウザで開いてください。追加したアカウント、投稿、コメント、プレイリストは同じブラウザに保存されます。

ウォッチパーティーは同じブラウザの複数タブで同期を確認できます。各タブで「参加して同期」を押すと、再生状態とコメントが `BroadcastChannel` と `localStorage` 経由で共有されます。

Spotify連携を使う場合はローカルサーバーから開いてください。Spotify Developer Dashboardで作成したアプリのRedirect URIに、画面に表示されるRedirect URIを完全一致で登録します。フル再生にはSpotify Premiumアカウントが必要です。
