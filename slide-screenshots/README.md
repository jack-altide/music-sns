# スライド用スクリーンショット対応表

発表スライド構成案に対して、画面があると説明しやすい箇所だけをPlaywrightで撮影した。

NotebookLMに渡す場合、Markdown内のファイル名だけでは画像本体は読めない。画像を参照させたい場合は、このREADMEや `systemsummary.md` と一緒にPNGファイル自体もアップロードする。PNGをアップロードしない場合でも内容が分かるように、下の表では画像内容を文章で説明している。

## 撮影方針

- 16:9スライドに貼りやすいよう、基本は `1600 x 900` のデスクトップ画面で撮影。
- 画面説明に不要なスライド、例えば課題・技術構成・制約・まとめはスクリーンショットなしでよい。
- `slide07_itunes_search_results.png` と `slide09_demo_after_itunes_add.png` は、外部ネットワーク制限のためPlaywrightで `/api/music-search` の応答を固定して撮影した。UI確認用の検索結果であり、実APIの取得結果そのものではない。

## ファイル一覧

| 画像ID | ファイル名 | 推奨スライド | 画像内容 |
| --- | --- | --- | --- |
| 画像A | `slide01_title_overview.png` | 1. タイトル | SoundCircle全体像。サイドバー、投稿フォーム、タイムラインが見える。 |
| 画像B | `slide04_timeline_posting.png` | 4. 主な機能 / 5. 操作フロー | 音楽投稿と、投稿からプレイリスト・パーティーへ展開できる導線。 |
| 画像C | `slide04_playlist_voting.png` | 4. 主な機能 / 5. 操作フロー | 共同プレイリスト、iTunes検索による曲追加、投票機能。 |
| 画像D | `slide04_articles_comments.png` | 4. 主な機能 | 音楽記事とコメント投稿機能。 |
| 画像E | `slide04_watch_party_player.png` | 4. 主な機能 / 9. デモ | ウォッチパーティーの再生画面、コメント、曲検索入口。 |
| 画像F | `slide07_itunes_search_results.png` | 7. 工夫点 / 9. デモ | iTunes Search APIを使った曲検索結果UI。 |
| 画像G | `slide09_demo_after_itunes_add.png` | 9. デモ | 検索した曲をウォッチパーティーに追加した後の状態。 |

## スクリーンショット不要のスライド

- 2. 課題: テキスト中心で説明する方が分かりやすい。
- 3. 解決案: `slide01_title_overview.png` か4機能の画面を小さく並べれば足りる。
- 6. 技術構成: 画面ではなく構成図や箇条書きが適している。
- 8. 制約: 誤解を避けるため、テキストで明確に書く方がよい。
- 10. まとめ: 画面を使うなら `slide01_title_overview.png` の再利用で十分。
