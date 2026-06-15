const STORAGE_KEY = "music-sns-state-v1";
const PARTY_CHANNEL_NAME = "music-sns-watch-party";
const PARTY_DURATION = 36;
const ITUNES_PREVIEW_DURATION = 30;
const CATALOG_CONTENT_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const AUDIO_FILE_URL_PATTERN = /https?:\/\/\S+\.(?:mp3|m4a|aac|wav|flac|ogg)(?:[?#]\S*)?/i;
const LYRICS_MARKER_PATTERN = /(?:^|\s)(?:歌詞|lyrics?)\s*[:：]/i;
const AudioContextClass = window.AudioContext || window.webkitAudioContext;

const seedState = {
  currentAccountId: "acct-rin",
  accounts: [
    {
      id: "acct-rin",
      name: "Rin",
      handle: "rin_vinyl",
      genre: "Indie Rock",
    },
    {
      id: "acct-kai",
      name: "Kai",
      handle: "kai_beats",
      genre: "Hip Hop",
    },
  ],
  posts: [
    {
      id: "post-1",
      type: "music",
      accountId: "acct-rin",
      body: "夜の散歩に合う軽いギター。サビ前のベースラインが気持ちいい。",
      createdAt: "2026-05-10T21:20:00+09:00",
      track: {
        title: "Night Walk",
        artist: "Blue Harbor",
      },
    },
    {
      id: "post-2",
      type: "live",
      accountId: "acct-kai",
      body: "小さめの会場で距離が近いライブ。終演後にDJタイムもあるらしい。",
      createdAt: "2026-05-11T13:45:00+09:00",
      live: {
        title: "Friday Session",
        date: "2026-05-15T19:30",
        venue: "Shibuya Room",
      },
    },
  ],
  articles: [
    {
      id: "article-1",
      tag: "Interview",
      title: "新しいリスナーコミュニティがアーティスト発見を変える",
      summary: "友人の一言、ライブ後の会話、共同プレイリストが音楽との出会いを広げる。",
      comments: [
        {
          id: "comment-1",
          accountId: "acct-kai",
          body: "共同プレイリストからライブに行く流れはかなり自然だと思う。",
        },
      ],
    },
    {
      id: "article-2",
      tag: "Review",
      title: "ホームリスニング向けのアルバムレビュー",
      summary: "派手さよりも余白と音像で聴かせる作品を、週末の時間帯別に紹介。",
      comments: [],
    },
    {
      id: "article-3",
      tag: "Live",
      title: "小規模ライブハウスで見つける次の推し",
      summary: "セットリスト、会場の音、物販まで含めて記録する楽しさを整理する。",
      comments: [
        {
          id: "comment-2",
          accountId: "acct-rin",
          body: "会場の音の違いを残せる機能も欲しい。",
        },
      ],
    },
  ],
  playlist: {
    name: "Weekend Listening Board",
    tracks: [
      {
        id: "track-1",
        title: "Slow Motion City",
        artist: "Lamp District",
        note: "夕方に流すと空気が変わる。",
        addedBy: "acct-rin",
        votes: 5,
      },
      {
        id: "track-2",
        title: "Signal Green",
        artist: "Odd Metro",
        note: "移動中のテンポに合う。",
        addedBy: "acct-kai",
        votes: 3,
      },
    ],
  },
  watchParty: {
    roomName: "GREEN FIELD FEST 2026 予習ルーム",
    festivalName: "フェス参加者の共同リスニング",
    queue: [
      {
        id: "party-track-1",
        title: "Sunset Gate",
        artist: "North Pier",
        note: "夕方のメインステージで流れそう。",
      },
      {
        id: "party-track-2",
        title: "Neon Tent",
        artist: "Soda Line",
        note: "深夜テントの転換中に合いそう。",
      },
      {
        id: "party-track-3",
        title: "River Crowd",
        artist: "Mellow Flags",
        note: "開場直後の空気に合う予想曲。",
      },
    ],
    playback: {
      trackId: "party-track-1",
      status: "paused",
      startedAt: null,
      pausedAt: 0,
      updatedAt: "2026-05-11T00:00:00.000Z",
      updatedBy: "acct-rin",
    },
    comments: [
      {
        id: "party-comment-1",
        accountId: "acct-rin",
        body: "この曲、夕方の入場待ちで聴きたい。",
        createdAt: "2026-05-11T09:00:00.000Z",
        trackId: "party-track-1",
        at: 6,
      },
      {
        id: "party-comment-2",
        accountId: "acct-kai",
        body: "サビ前で照明が上がる感じがある。",
        createdAt: "2026-05-11T09:01:00.000Z",
        trackId: "party-track-1",
        at: 14,
      },
    ],
  },
};

let state = loadState();
saveState();
let audioContext;
let activeOscillators = [];
let partyJoined = false;
let partyChannel = null;
let partyClockTimer = null;
let partyAudioElement = null;
let partyAudioSignature = "";
let partyLoopTimer = null;
let partyOscillators = [];
let lastAutoAdvanceKey = "";
let audioStatusMessage = "";
let partyServerSyncEnabled = false;
let partyServerVersion = 0;
let partyServerClockOffsetMs = 0;
let partyServerEventSource = null;
let musicSearchStatusMessage = "";

const views = {
  timeline: document.querySelector("#timeline-view"),
  party: document.querySelector("#party-view"),
  articles: document.querySelector("#articles-view"),
  playlist: document.querySelector("#playlist-view"),
};

const accountForm = document.querySelector("#account-form");
const accountSwitcher = document.querySelector("#account-switcher");
const postForm = document.querySelector("#post-form");
const postTypeInput = document.querySelector("#post-type");
const timelineList = document.querySelector("#timeline-list");
const articleGrid = document.querySelector("#article-grid");
const playlistForm = document.querySelector("#playlist-form");
const playlistTracks = document.querySelector("#playlist-tracks");
const playlistStats = document.querySelector("#playlist-stats");
const partyStatus = document.querySelector("#party-status");
const partyJoinButton = document.querySelector("#party-join");
const partyPlayButton = document.querySelector("#party-play");
const partyNextButton = document.querySelector("#party-next");
const partyAudioTestButton = document.querySelector("#party-audio-test");
const partyRoomName = document.querySelector("#party-room-name");
const partyTrackTitle = document.querySelector("#party-track-title");
const partyTrackMeta = document.querySelector("#party-track-meta");
const partyProgressBar = document.querySelector("#party-progress-bar");
const partyElapsed = document.querySelector("#party-elapsed");
const partyDuration = document.querySelector("#party-duration");
const partyComments = document.querySelector("#party-comments");
const partyCommentForm = document.querySelector("#party-comment-form");
const partyTrackForm = document.querySelector("#party-track-form");
const partyQueue = document.querySelector("#party-queue");
const partyArt = document.querySelector("#party-art");
const musicSearchStatus = document.querySelector("#spotify-status");
const musicSearchForm = document.querySelector("#spotify-search-form");
const musicSearchInput = document.querySelector("#spotify-search-input");
const musicSearchResults = document.querySelector("#spotify-results");
const musicSearchLilacButton = document.querySelector("#spotify-lilac");

document.querySelectorAll(".nav-tab").forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

document.querySelectorAll("[data-post-type]").forEach((button) => {
  button.addEventListener("click", () => setPostType(button.dataset.postType));
});

document.querySelector("#reset-data").addEventListener("click", () => {
  state = deepClone(seedState);
  commitState("reset");
  render();
  syncPartyAudio();
});

accountForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = document.querySelector("#account-name").value.trim();
  const handle = normalizeHandle(document.querySelector("#account-handle").value);
  const genre = document.querySelector("#account-genre").value;

  if (!name || !handle) return;
  if (state.accounts.some((account) => account.handle.toLowerCase() === handle.toLowerCase())) {
    alert("同じIDのアカウントが既にあります。");
    return;
  }

  const account = {
    id: makeId("acct"),
    name,
    handle,
    genre,
  };

  state.accounts.push(account);
  state.currentAccountId = account.id;
  accountForm.reset();
  commitState("account");
  render();
});

accountSwitcher.addEventListener("change", (event) => {
  state.currentAccountId = event.target.value;
  commitState("account-switch");
  render();
});

postForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const account = getCurrentAccount();
  if (!account) {
    alert("先にアカウントを作成してください。");
    return;
  }

  const type = postTypeInput.value;
  const body = document.querySelector("#post-body").value.trim();
  const post = {
    id: makeId("post"),
    type,
    accountId: account.id,
    body,
    createdAt: new Date().toISOString(),
  };

  if (type === "music") {
    const title = document.querySelector("#track-title").value.trim();
    const artist = document.querySelector("#track-artist").value.trim();
    if (!title || !artist) {
      alert("曲名とアーティストを入力してください。");
      return;
    }
    if (!ensureUserContentAllowed(body, title, artist)) return;
    post.track = { title, artist };
  } else {
    const title = document.querySelector("#live-title").value.trim();
    const date = document.querySelector("#live-date").value;
    const venue = document.querySelector("#live-venue").value.trim();
    if (!title || !date || !venue) {
      alert("イベント名、日時、会場を入力してください。");
      return;
    }
    if (!ensureUserContentAllowed(body, title, venue)) return;
    post.live = { title, date, venue };
  }

  state.posts.unshift(post);
  postForm.reset();
  setPostType(type);
  commitState("post");
  renderTimeline();
});

playlistForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const account = getCurrentAccount();
  if (!account) {
    alert("先にアカウントを作成してください。");
    return;
  }

  const title = document.querySelector("#playlist-title-input").value.trim();
  const artist = document.querySelector("#playlist-artist-input").value.trim();
  const note = document.querySelector("#playlist-note-input").value.trim();
  if (!title || !artist) return;
  if (!ensureUserContentAllowed(title, artist, note)) return;

  state.playlist.tracks.push({
    id: makeId("track"),
    title,
    artist,
    note,
    addedBy: account.id,
    votes: 0,
  });

  playlistForm.reset();
  commitState("playlist");
  renderPlaylist();
});

partyJoinButton.addEventListener("click", () => {
  partyJoined = true;
  renderParty();
  syncPartyAudio();
});

partyPlayButton.addEventListener("click", () => {
  partyJoined = true;

  const playback = state.watchParty.playback;
  if (playback.status === "playing") {
    pausePartyPlayback();
  } else {
    playPartyPlayback();
  }
});

partyNextButton.addEventListener("click", () => {
  partyJoined = true;
  advancePartyTrack(false);
});

partyAudioTestButton.addEventListener("click", async () => {
  partyJoined = true;
  await playAudioTestPreview();
  renderParty();
});

partyCommentForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const account = getCurrentAccount();
  if (!account) {
    alert("先にアカウントを作成してください。");
    return;
  }

  const input = document.querySelector("#party-comment-input");
  const body = input.value.trim();
  if (!body) return;
  if (!ensureUserContentAllowed(body)) return;

  const playback = state.watchParty.playback;
  state.watchParty.comments.push({
    id: makeId("party-comment"),
    accountId: account.id,
    authorName: account.name,
    authorHandle: account.handle,
    body,
    createdAt: new Date().toISOString(),
    trackId: playback.trackId,
    at: Math.floor(getPartyPosition()),
  });

  input.value = "";
  commitState("party-comment");
  renderParty();
});

partyTrackForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const account = getCurrentAccount();
  if (!account) {
    alert("先にアカウントを作成してください。");
    return;
  }

  const title = document.querySelector("#party-track-input").value.trim();
  const artist = document.querySelector("#party-artist-input").value.trim();
  const note = document.querySelector("#party-note-input").value.trim();
  if (!title || !artist) return;
  if (!ensureUserContentAllowed(title, artist, note)) return;

  state.watchParty.queue.push({
    id: makeId("party-track"),
    title,
    artist,
    note: note || `${account.name}がフェス予習用に追加`,
  });

  partyTrackForm.reset();
  commitState("party-track");
  renderParty();
});

musicSearchForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const query = musicSearchInput.value.trim();
  if (!query) return;

  try {
    await searchMusicAndRenderResults(query);
  } catch (errorObject) {
    musicSearchStatusMessage = `iTunes検索に失敗しました: ${errorObject.message}`;
    renderMusicSearchPanel();
  }
});

musicSearchLilacButton.addEventListener("click", async () => {
  try {
    await searchLilacAndRenderResults();
  } catch (errorObject) {
    musicSearchStatusMessage = `iTunes検索に失敗しました: ${errorObject.message}`;
    renderMusicSearchPanel();
  }
});

if ("BroadcastChannel" in window) {
  partyChannel = new BroadcastChannel(PARTY_CHANNEL_NAME);
  partyChannel.addEventListener("message", (event) => {
    if (event.data?.type !== "state" || !event.data.state) return;
    state = normalizeState(event.data.state);
    render();
    syncPartyAudio();
  });
}

window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_KEY || !event.newValue) return;

  try {
    state = normalizeState(JSON.parse(event.newValue));
    render();
    syncPartyAudio();
  } catch {
    state = normalizeState(state);
  }
});

function initPartyServerSync() {
  if (window.location.protocol === "file:") return;

  fetch("/api/watch-party", { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error("watch party sync unavailable");
      return response.json();
    })
    .then((payload) => {
      partyServerSyncEnabled = true;
      if (payload.watchParty) {
        applyPartyServerPayload(payload);
      } else {
        void publishWatchPartyToServer("party-init");
      }
      connectPartyServerEvents();
    })
    .catch(() => {
      partyServerSyncEnabled = false;
    });
}

function connectPartyServerEvents() {
  if (!partyServerSyncEnabled || partyServerEventSource) return;

  partyServerEventSource = new EventSource("/api/watch-party/events");
  partyServerEventSource.addEventListener("message", (event) => {
    try {
      applyPartyServerPayload(JSON.parse(event.data));
    } catch {
      // Ignore malformed event payloads.
    }
  });
  partyServerEventSource.addEventListener("error", () => {
    partyServerSyncEnabled = false;
  });
  partyServerEventSource.addEventListener("open", () => {
    partyServerSyncEnabled = true;
  });
}

function applyPartyServerPayload(payload) {
  if (!payload?.watchParty) return;
  if (payload.serverNow) {
    partyServerClockOffsetMs = Date.now() - payload.serverNow;
  }
  if (payload.version && payload.version < partyServerVersion) return;

  partyServerVersion = payload.version || partyServerVersion;
  state.watchParty = normalizeWatchParty(payload.watchParty, seedState.watchParty);
  saveState();
  renderParty();
  syncPartyAudio();
}

async function publishWatchPartyToServer(reason) {
  if (window.location.protocol === "file:") return;
  if (!shouldPublishWatchParty(reason)) return;

  try {
    const response = await fetch("/api/watch-party", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reason,
        clientNow: getSyncedNow(),
        watchParty: state.watchParty,
      }),
    });
    if (!response.ok) throw new Error("watch party sync failed");

    partyServerSyncEnabled = true;
    applyPartyServerPayload(await response.json());
    connectPartyServerEvents();
  } catch {
    partyServerSyncEnabled = false;
  }
}

function shouldPublishWatchParty(reason) {
  return (
    reason === "reset" ||
    reason === "music-search" ||
    reason === "spotify-search" ||
    reason === "party-init" ||
    reason.startsWith("party-")
  );
}

function setView(viewName) {
  document.querySelectorAll(".nav-tab").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === viewName);
  });

  Object.entries(views).forEach(([key, view]) => {
    view.classList.toggle("is-active", key === viewName);
  });
}

function setPostType(type) {
  postTypeInput.value = type;
  document.querySelectorAll("[data-post-type]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.postType === type);
  });

  document.querySelectorAll(".music-field").forEach((field) => {
    field.classList.toggle("is-hidden", type !== "music");
  });

  document.querySelectorAll(".live-field").forEach((field) => {
    field.classList.toggle("is-hidden", type !== "live");
  });
}

function render() {
  renderAccounts();
  renderTimeline();
  renderArticles();
  renderPlaylist();
  renderParty();
  renderMusicSearchPanel();
}

function renderAccounts() {
  accountSwitcher.innerHTML = "";

  state.accounts.forEach((account) => {
    const option = document.createElement("option");
    option.value = account.id;
    option.textContent = `${account.name} / @${account.handle}`;
    option.selected = account.id === state.currentAccountId;
    accountSwitcher.append(option);
  });
}

function renderTimeline() {
  timelineList.innerHTML = "";

  if (!state.posts.length) {
    timelineList.append(createEmptyState("まだ投稿がありません。音楽やライブ情報を共有してください。"));
    return;
  }

  state.posts.forEach((post) => {
    const account = findAccount(post.accountId);
    const template = document.querySelector("#post-template");
    const card = template.content.firstElementChild.cloneNode(true);
    const cover = card.querySelector(".post-cover");
    const title = card.querySelector("h3");
    const meta = card.querySelector(".muted");
    const text = card.querySelector(".post-text");
    const type = card.querySelector(".post-type");
    const actions = card.querySelector(".post-actions");

    if (post.type === "music") {
      const track = post.track;
      title.textContent = `${track.title} / ${track.artist}`;
      type.textContent = "音楽";
      actions.append(createPlayControl(post));
      actions.append(createPlaylistShortcut(track));
      actions.append(createPartyShortcut(track));
    } else {
      const live = post.live;
      cover.classList.add("cover-live");
      title.textContent = live.title;
      type.textContent = "ライブ";
      actions.append(createInfoPill(formatLiveDate(live.date)));
      actions.append(createInfoPill(live.venue));
    }

    meta.textContent = `${account.name} @${account.handle} / ${formatRelativeTime(post.createdAt)}`;
    text.textContent = post.body || "コメントなし";
    timelineList.append(card);
  });
}

function renderArticles() {
  articleGrid.innerHTML = "";

  state.articles.forEach((article) => {
    const card = document.createElement("article");
    card.className = "article-card";
    card.innerHTML = `
      <div class="article-art" aria-hidden="true"></div>
      <div class="article-content">
        <div>
          <p class="eyebrow"></p>
          <h3></h3>
        </div>
        <p class="article-summary"></p>
        <div class="comment-list"></div>
        <form class="comment-form">
          <input type="text" maxlength="120" placeholder="コメントを書く" aria-label="記事にコメントを書く" required />
          <button class="primary-button" type="submit">送信</button>
        </form>
      </div>
    `;

    card.querySelector(".eyebrow").textContent = article.tag;
    card.querySelector("h3").textContent = article.title;
    card.querySelector(".article-summary").textContent = article.summary;

    const comments = card.querySelector(".comment-list");
    renderComments(comments, article.comments);

    card.querySelector(".comment-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const account = getCurrentAccount();
      if (!account) {
        alert("先にアカウントを作成してください。");
        return;
      }

      const input = event.currentTarget.querySelector("input");
      const body = input.value.trim();
      if (!body) return;
      if (!ensureUserContentAllowed(body)) return;

      article.comments.push({
        id: makeId("comment"),
        accountId: account.id,
        body,
      });

      input.value = "";
      commitState("article-comment");
      renderArticles();
    });

    articleGrid.append(card);
  });
}

function renderComments(container, comments) {
  container.innerHTML = "";

  if (!comments.length) {
    container.append(createEmptyState("まだコメントがありません。"));
    return;
  }

  comments.forEach((comment) => {
    const account = findAccount(comment.accountId);
    const row = document.createElement("div");
    row.className = "comment";
    row.innerHTML = `<strong></strong><span></span>`;
    row.querySelector("strong").textContent = `${account.name} @${account.handle}`;
    row.querySelector("span").textContent = comment.body;
    container.append(row);
  });
}

function renderPlaylist() {
  const tracks = state.playlist.tracks;
  const contributors = new Set(tracks.map((track) => track.addedBy));
  const totalVotes = tracks.reduce((sum, track) => sum + track.votes, 0);
  playlistStats.textContent = `${tracks.length}曲 / ${contributors.size}人が参加 / ${totalVotes}票`;
  playlistTracks.innerHTML = "";

  if (!tracks.length) {
    playlistTracks.append(createEmptyState("まだ曲がありません。最初の1曲を追加してください。"));
    return;
  }

  tracks
    .slice()
    .sort((a, b) => b.votes - a.votes)
    .forEach((track, index) => {
      const account = findAccount(track.addedBy);
      const row = document.createElement("div");
      row.className = "track-row";
      row.innerHTML = `
        <div class="track-number"></div>
        <div class="track-title">
          <strong></strong>
          <span></span>
        </div>
        <div class="track-added"></div>
        <button class="icon-button vote-button" type="button" aria-label="この曲に投票">+</button>
      `;

      row.querySelector(".track-number").textContent = index + 1;
      row.querySelector(".track-title strong").textContent = track.title;
      row.querySelector(".track-title span").textContent = `${track.artist}${track.note ? ` / ${track.note}` : ""}`;
      row.querySelector(".track-added").textContent = `追加: ${account.name} / ${track.votes}票`;
      row.querySelector("button").addEventListener("click", () => {
        track.votes += 1;
        commitState("playlist-vote");
        renderPlaylist();
      });

      playlistTracks.append(row);
    });
}

function renderParty() {
  const party = state.watchParty;
  const playback = party.playback;
  const track = getPartyTrack(playback.trackId) || party.queue[0];
  const updatedBy = findAccount(playback.updatedBy);
  const updatedByName = updatedBy.id === "missing" ? playback.updatedByName || "参加者" : updatedBy.name;

  if (!track) {
    partyTrackTitle.textContent = "再生キューが空です";
    partyTrackMeta.textContent = "流れそうな曲を追加してください。";
    renderPartyCover(null);
    renderPartyComments();
    renderPartyQueue();
    updatePartyClock();
    return;
  }

  partyRoomName.textContent = party.roomName;
  partyTrackTitle.textContent = `${track.title} / ${track.artist}`;
  const sourceLabel = getTrackAudioLabel(track);
  partyTrackMeta.textContent = `${party.festivalName} / ${track.note || "フェスで流れそうな候補曲"}${sourceLabel} / 操作: ${updatedByName}`;
  partyStatus.textContent = partyJoined ? audioStatusMessage || "同期中" : "未参加";
  partyStatus.classList.toggle("is-live", partyJoined);
  partyJoinButton.textContent = partyJoined ? "同期中" : "参加して同期";
  partyPlayButton.textContent = playback.status === "playing" ? "一時停止" : "再生";
  partyDuration.textContent = formatDuration(getPartyDuration(track));
  renderPartyCover(track);

  renderPartyComments();
  renderPartyQueue();
  updatePartyClock();
}

function renderPartyCover(track) {
  if (!partyArt) return;

  partyArt.innerHTML = "";
  partyArt.classList.remove("has-cover", "has-spotify-cover");
  partyArt.style.backgroundImage = "";

  if (isExternalCatalogTrack(track)) {
    partyArt.classList.add("has-spotify-cover");

    const imageUrl = getTrackArtworkUrl(track);
    if (imageUrl) {
      partyArt.classList.add("has-cover");
      const image = document.createElement("img");
      image.src = imageUrl;
      image.alt = "";
      partyArt.append(image);
    } else {
      const placeholder = document.createElement("div");
      placeholder.className = "spotify-cover-placeholder";
      placeholder.textContent = getTrackSourceName(track);
      partyArt.append(placeholder);
    }

    const externalUrl = getExternalTrackUrl(track);
    if (externalUrl) {
      const link = document.createElement("a");
      link.className = "spotify-attribution";
      link.href = externalUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = `${getTrackSourceName(track)}で開く`;
      partyArt.append(link);
    }
    return;
  }

  const disc = document.createElement("div");
  disc.className = "vinyl-disc";
  partyArt.append(disc);
}

function renderMusicSearchPanel() {
  musicSearchForm.querySelector("button").disabled = false;
  musicSearchLilacButton.disabled = false;
  musicSearchStatus.textContent =
    musicSearchStatusMessage || "iTunes Search APIで曲を検索できます。ログインやPremium契約は不要です。";
}

function renderPartyComments() {
  partyComments.innerHTML = "";

  const comments = state.watchParty.comments.slice(-30);
  if (!comments.length) {
    partyComments.append(createEmptyState("まだコメントがありません。曲を聴きながら話してみてください。"));
    return;
  }

  comments.forEach((comment) => {
    const account = findAccount(comment.accountId);
    const authorName = account.id === "missing" ? comment.authorName || "Unknown" : account.name;
    const authorHandle = account.id === "missing" ? comment.authorHandle || "unknown" : account.handle;
    const track = getPartyTrack(comment.trackId);
    const row = document.createElement("div");
    row.className = "party-comment";
    row.innerHTML = `<strong></strong><span></span><small></small>`;
    row.querySelector("strong").textContent = `${authorName} @${authorHandle}`;
    row.querySelector("span").textContent = comment.body;
    row.querySelector("small").textContent = `${formatDuration(comment.at || 0)} / ${track ? track.title : "再生曲"}`;
    partyComments.append(row);
  });

  partyComments.scrollTop = partyComments.scrollHeight;
}

function renderPartyQueue() {
  partyQueue.innerHTML = "";

  if (!state.watchParty.queue.length) {
    partyQueue.append(createEmptyState("キューが空です。フェスで流れそうな曲を追加してください。"));
    return;
  }

  state.watchParty.queue.forEach((track, index) => {
    const row = document.createElement("div");
    row.className = "track-row party-queue-row";
    row.classList.toggle("is-current", track.id === state.watchParty.playback.trackId);
    row.innerHTML = `
      <div class="track-number"></div>
      <div class="track-title">
        <strong></strong>
        <span></span>
      </div>
      <div class="track-added"></div>
      <button class="icon-button" type="button">再生</button>
    `;

    row.querySelector(".track-number").textContent = index + 1;
    row.querySelector(".track-title strong").textContent = track.title;
    row.querySelector(".track-title span").textContent = `${track.artist}${track.note ? ` / ${track.note}` : ""}`;
    const status = row.querySelector(".track-added");
    status.textContent = track.id === state.watchParty.playback.trackId ? "再生中" : "待機中";
    const externalUrl = getExternalTrackUrl(track);
    if (externalUrl) {
      const link = document.createElement("a");
      link.href = externalUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = getTrackSourceName(track);
      status.append(" / ", link);
    }
    row.querySelector("button").addEventListener("click", () => {
      partyJoined = true;
      selectPartyTrack(track.id, true);
    });

    partyQueue.append(row);
  });
}

function createPlayControl(post) {
  const button = document.createElement("button");
  button.className = "icon-button";
  button.type = "button";
  button.setAttribute("aria-label", "デモ音源を再生");
  button.textContent = "▶ デモ";

  button.addEventListener("click", async () => {
    if (!(await ensureAudioContextReady())) return;
    playGeneratedPreview(post.track.title + post.track.artist);
  });

  return button;
}

function createPlaylistShortcut(track) {
  const button = document.createElement("button");
  button.className = "icon-button";
  button.type = "button";
  button.setAttribute("aria-label", "共同プレイリストに追加");
  button.textContent = "+ プレイリスト";

  button.addEventListener("click", () => {
    const account = getCurrentAccount();
    if (!account) {
      alert("先にアカウントを作成してください。");
      return;
    }

    state.playlist.tracks.push({
      id: makeId("track"),
      title: track.title,
      artist: track.artist,
      note: "タイムラインから追加",
      addedBy: account.id,
      votes: 0,
    });
    commitState("playlist-add");
    renderPlaylist();
    setView("playlist");
  });

  return button;
}

function createPartyShortcut(track) {
  const button = document.createElement("button");
  button.className = "icon-button";
  button.type = "button";
  button.setAttribute("aria-label", "ウォッチパーティーに追加");
  button.textContent = "+ パーティー";

  button.addEventListener("click", () => {
    state.watchParty.queue.push({
      id: makeId("party-track"),
      title: track.title,
      artist: track.artist,
      note: "タイムラインからフェス予習キューへ追加",
    });
    commitState("party-track");
    renderParty();
    setView("party");
  });

  return button;
}

function createInfoPill(text) {
  const pill = document.createElement("span");
  pill.className = "post-type";
  pill.textContent = text;
  return pill;
}

function createEmptyState(message) {
  const empty = document.createElement("div");
  empty.className = "empty-state";
  empty.textContent = message;
  return empty;
}

function ensureUserContentAllowed(...values) {
  const violation = values.map(getContentPolicyViolation).find(Boolean);
  if (!violation) return true;

  alert(violation);
  return false;
}

function getContentPolicyViolation(value) {
  const text = String(value || "");
  if (AUDIO_FILE_URL_PATTERN.test(text)) {
    return "音源ファイルURLは投稿できません。曲検索のiTunesリンクまたはプレビューを使ってください。";
  }

  if (LYRICS_MARKER_PATTERN.test(text)) {
    return "歌詞本文の投稿はできません。曲名や感想として共有してください。";
  }

  return "";
}

function isExternalCatalogTrack(track) {
  return track?.source === "itunes" || track?.source === "spotify";
}

function getTrackArtworkUrl(track) {
  return track?.artworkUrl || "";
}

function getExternalTrackUrl(track) {
  if (track?.source === "itunes") return track.itunesUrl || "";
  if (track?.source === "spotify") return track.spotifyUrl || "";
  return "";
}

function getTrackPreviewUrl(track) {
  if (track?.source !== "itunes") return "";
  return normalizeITunesPreviewUrl(track.previewUrl);
}

function getTrackSourceName(track) {
  if (track?.source === "itunes") return "iTunes";
  if (track?.source === "spotify") return "Spotify";
  return "外部リンク";
}

function getTrackAudioLabel(track) {
  if (track?.source === "itunes") {
    return getTrackPreviewUrl(track) ? " / iTunesプレビュー再生" : " / iTunesリンクのみ";
  }

  if (isExternalCatalogTrack(track)) return " / 外部カタログ";
  return " / デモ再生";
}

function playPartyPlayback() {
  const playback = state.watchParty.playback;
  const duration = getPartyDuration();
  const position = getPartyPosition() >= duration ? 0 : getPartyPosition();
  const account = getCurrentAccount();

  state.watchParty.playback = {
    ...playback,
    status: "playing",
    startedAt: getSyncedNow() - position * 1000,
    pausedAt: position,
    updatedAt: new Date().toISOString(),
    updatedBy: account?.id || playback.updatedBy,
    updatedByName: account?.name || playback.updatedByName,
  };

  commitState("party-play");
  renderParty();
  syncPartyAudio();
}

function pausePartyPlayback() {
  const playback = state.watchParty.playback;
  const account = getCurrentAccount();

  state.watchParty.playback = {
    ...playback,
    status: "paused",
    startedAt: null,
    pausedAt: getPartyPosition(),
    updatedAt: new Date().toISOString(),
    updatedBy: account?.id || playback.updatedBy,
    updatedByName: account?.name || playback.updatedByName,
  };

  commitState("party-pause");
  renderParty();
  syncPartyAudio();
}

function selectPartyTrack(trackId, shouldPlay) {
  const account = getCurrentAccount();

  state.watchParty.playback = {
    trackId,
    status: shouldPlay ? "playing" : "paused",
    startedAt: shouldPlay ? getSyncedNow() : null,
    pausedAt: 0,
    updatedAt: new Date().toISOString(),
    updatedBy: account?.id || state.watchParty.playback.updatedBy,
    updatedByName: account?.name || state.watchParty.playback.updatedByName,
  };

  commitState("party-select");
  renderParty();
  syncPartyAudio();
}

function advancePartyTrack(isAuto) {
  const queue = state.watchParty.queue;
  if (!queue.length) return;

  const playback = state.watchParty.playback;
  if (isAuto) {
    const key = `${playback.trackId}-${playback.startedAt}`;
    if (lastAutoAdvanceKey === key) return;
    lastAutoAdvanceKey = key;
  }

  const currentIndex = Math.max(0, queue.findIndex((track) => track.id === playback.trackId));
  const nextTrack = queue[(currentIndex + 1) % queue.length];
  selectPartyTrack(nextTrack.id, true);
}

function getPartyTrack(trackId) {
  return state.watchParty.queue.find((track) => track.id === trackId);
}

function getPartyDuration(track = getPartyTrack(state.watchParty.playback.trackId)) {
  if (getTrackPreviewUrl(track)) return ITUNES_PREVIEW_DURATION;

  if (track?.durationMs) {
    return Math.max(1, Math.round(track.durationMs / 1000));
  }

  return PARTY_DURATION;
}

function getPartyPosition() {
  const playback = state.watchParty.playback;
  const duration = getPartyDuration();
  if (playback.status === "playing" && playback.startedAt) {
    return Math.min(duration, Math.max(0, (getSyncedNow() - playback.startedAt) / 1000));
  }

  return Math.min(duration, Math.max(0, playback.pausedAt || 0));
}

function getSyncedNow() {
  return Date.now() - partyServerClockOffsetMs;
}

function updatePartyClock() {
  const playback = state.watchParty.playback;
  const position = getPartyPosition();
  const duration = getPartyDuration();
  const progress = duration ? (position / duration) * 100 : 0;

  partyProgressBar.style.width = `${Math.min(100, progress)}%`;
  partyElapsed.textContent = formatDuration(position);

  if (playback.status === "playing" && position >= duration) {
    advancePartyTrack(true);
  }
}

function startPartyClock() {
  if (partyClockTimer) return;
  partyClockTimer = window.setInterval(updatePartyClock, 500);
}

function syncPartyAudio() {
  const playback = state.watchParty.playback;
  const track = getPartyTrack(playback.trackId);
  const previewUrl = getTrackPreviewUrl(track);

  if (!partyJoined || !track) {
    stopPartyAudio();
    return;
  }

  if (playback.status !== "playing") {
    stopPartyAudio();
    return;
  }

  const signature = `${track.id}-${playback.startedAt}-${previewUrl || "generated"}`;
  if (signature === partyAudioSignature) return;

  stopPartyAudio();
  partyAudioSignature = signature;

  if (previewUrl) {
    startPartyPreviewAudio(track, previewUrl);
    return;
  }

  startGeneratedPartyLoop(track);
}

function startPartyPreviewAudio(track, previewUrl) {
  stopGeneratedPreview();

  const audio = new Audio(previewUrl);
  const position = Math.max(0, Math.min(getPartyPosition(), getPartyDuration(track) - 0.25));

  partyAudioElement = audio;
  audio.preload = "auto";
  audio.volume = 0.9;

  if (position > 0) {
    audio.addEventListener(
      "loadedmetadata",
      () => {
        try {
          audio.currentTime = Math.min(position, Math.max(0, audio.duration - 0.25));
        } catch {
          // Some browsers only allow seeking after more media data is loaded.
        }
      },
      { once: true },
    );
  }

  audio.addEventListener(
    "ended",
    () => {
      if (partyAudioElement === audio) advancePartyTrack(true);
    },
    { once: true },
  );

  audio.addEventListener(
    "error",
    () => {
      if (partyAudioElement !== audio) return;
      audioStatusMessage = "プレビュー再生エラー";
      partyAudioSignature = "";
      renderParty();
    },
    { once: true },
  );

  void audio
    .play()
    .then(() => {
      if (partyAudioElement !== audio) return;
      audioStatusMessage = "";
      renderParty();
    })
    .catch(() => {
      if (partyAudioElement !== audio) return;
      audioStatusMessage = "音声ブロック中";
      partyAudioSignature = "";
      renderParty();
    });
}

function startGeneratedPartyLoop(track) {
  if (!ensureAudioContext()) return;

  if (audioContext.state !== "running") {
    void audioContext.resume().then(() => {
      if (audioContext.state !== "running") return;
      partyAudioSignature = "";
      syncPartyAudio();
    });
    return;
  }

  schedulePartyNotes(track);
  partyLoopTimer = window.setInterval(() => schedulePartyNotes(track), 1800);
}

function schedulePartyNotes(track) {
  if (!audioContext) return;

  const now = audioContext.currentTime;
  const position = getPartyPosition();
  const scale = makeScale(track.title + track.artist);
  const startIndex = Math.floor(position / 0.3) % scale.length;
  const master = audioContext.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.32, now + 0.04);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 1.7);
  master.connect(audioContext.destination);
  partyOscillators.push(master);

  for (let index = 0; index < 6; index += 1) {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const start = now + index * 0.3;
    const frequency = scale[(startIndex + index) % scale.length];
    oscillator.type = index % 3 === 0 ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.42, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.26);
    oscillator.connect(gain).connect(master);
    oscillator.start(start);
    oscillator.stop(start + 0.3);
    partyOscillators.push(oscillator);
  }
}

function stopPartyAudio() {
  if (partyLoopTimer) {
    window.clearInterval(partyLoopTimer);
    partyLoopTimer = null;
  }

  if (partyAudioElement) {
    partyAudioElement.pause();
    partyAudioElement.removeAttribute("src");
    partyAudioElement.load();
    partyAudioElement = null;
  }

  partyOscillators.forEach((node) => {
    try {
      node.stop();
    } catch {
      try {
        node.disconnect();
      } catch {
        // Already disconnected.
      }
    }
  });

  partyOscillators = [];
  partyAudioSignature = "";
}

function playGeneratedPreview(seed) {
  stopGeneratedPreview();

  if (!ensureAudioContext()) return;
  if (audioContext.state !== "running") {
    void audioContext.resume().then(() => {
      if (audioContext.state === "running") {
        playGeneratedPreview(seed);
      }
    });
    return;
  }

  const now = audioContext.currentTime;
  const notes = makeScale(seed);
  const master = audioContext.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.3, now + 0.04);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 4.8);
  master.connect(audioContext.destination);
  activeOscillators.push(master);

  notes.concat(notes.slice(0, 6)).forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const start = now + index * 0.32;
    oscillator.type = index % 2 === 0 ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.38, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
    oscillator.connect(gain).connect(master);
    oscillator.start(start);
    oscillator.stop(start + 0.32);
    activeOscillators.push(oscillator);
  });

  window.setTimeout(stopGeneratedPreview, 5000);
}

function stopGeneratedPreview() {
  activeOscillators.forEach((node) => {
    try {
      node.stop();
    } catch {
      try {
        node.disconnect();
      } catch {
        // Already disconnected.
      }
    }
  });
  activeOscillators = [];
}

async function playAudioTestPreview() {
  stopGeneratedPreview();
  stopPartyAudio();

  const track = getPartyTrack(state.watchParty.playback.trackId);
  const previewUrl = getTrackPreviewUrl(track);

  if (!previewUrl) {
    audioStatusMessage = "iTunesプレビューなし";
    return false;
  }

  const audio = new Audio(previewUrl);
  partyAudioElement = audio;
  partyAudioSignature = `test-${track.id}-${Date.now()}`;
  audio.preload = "auto";
  audio.volume = 0.9;
  audioStatusMessage = "プレビュー確認中";

  audio.addEventListener(
    "ended",
    () => {
      if (partyAudioElement !== audio) return;
      audioStatusMessage = "";
      partyAudioSignature = "";
      renderParty();
    },
    { once: true },
  );

  try {
    await audio.play();
    return true;
  } catch {
    if (partyAudioElement === audio) {
      audioStatusMessage = "音声ブロック中";
      partyAudioSignature = "";
    }
    return false;
  }
}

function ensureAudioContext() {
  if (!AudioContextClass) {
    alert("このブラウザはWeb Audio APIに対応していません。");
    return false;
  }

  audioContext = audioContext || new AudioContextClass();
  if (audioContext.state === "suspended") {
    void audioContext.resume().catch(() => {});
  }
  return true;
}

async function ensureAudioContextReady() {
  if (!ensureAudioContext()) return false;

  if (audioContext.state !== "running") {
    try {
      await audioContext.resume();
    } catch {
      // The browser can reject resume() when audio is blocked by policy.
    }
  }

  const isRunning = audioContext.state === "running";
  audioStatusMessage = isRunning ? "" : "音声ブロック中";
  return isRunning;
}

function initMusicSearchIntegration() {
  renderMusicSearchPanel();
}

async function searchMusicAndRenderResults(query) {
  musicSearchStatusMessage = `iTunesで「${query}」を検索しています。`;
  renderMusicSearchPanel();

  const tracks = await searchITunesTracks(query);
  if (!tracks.length) {
    musicSearchStatusMessage = `「${query}」に一致する曲が見つかりませんでした。`;
    renderMusicSearchResults([], query);
    renderMusicSearchPanel();
    return;
  }

  musicSearchStatusMessage = `「${query}」の検索結果から曲を選んでください。`;
  musicSearchInput.value = query;
  renderMusicSearchResults(tracks, query);
  renderMusicSearchPanel();
}

async function addSelectedITunesTrack(itunesTrack, query) {
  partyJoined = true;

  const partyTrack = makePartyTrackFromITunes(itunesTrack, query);
  const existingTrack = state.watchParty.queue.find(
    (track) => track.itunesId === partyTrack.itunesId || track.itunesUrl === partyTrack.itunesUrl,
  );
  const trackToSelect = existingTrack || partyTrack;

  if (existingTrack && partyTrack.previewUrl && !existingTrack.previewUrl) {
    existingTrack.previewUrl = partyTrack.previewUrl;
    existingTrack.artworkUrl = partyTrack.artworkUrl || existingTrack.artworkUrl;
    existingTrack.durationMs = partyTrack.durationMs;
    existingTrack.itunesAddedAt = partyTrack.itunesAddedAt;
  }

  const canPlayPreview = Boolean(getTrackPreviewUrl(trackToSelect));

  if (!existingTrack) {
    state.watchParty.queue.unshift(partyTrack);
  }

  state.watchParty.playback = {
    trackId: trackToSelect.id,
    status: canPlayPreview ? "playing" : "paused",
    startedAt: canPlayPreview ? getSyncedNow() : null,
    pausedAt: 0,
    updatedAt: new Date().toISOString(),
    updatedBy: getCurrentAccount()?.id || state.watchParty.playback.updatedBy,
    updatedByName: getCurrentAccount()?.name || state.watchParty.playback.updatedByName,
  };

  audioStatusMessage = canPlayPreview ? "" : "iTunesプレビューなし";
  musicSearchStatusMessage = existingTrack
    ? `追加済みの曲をキューで選択しました: ${trackToSelect.title}`
    : `iTunesプレビューをキューに追加しました: ${trackToSelect.title}`;
  commitState("music-search");
  musicSearchInput.value = query;
  render();
  syncPartyAudio();
  setView("party");
}

async function searchLilacAndRenderResults() {
  await searchMusicAndRenderResults("ライラック Mrs. GREEN APPLE");
}

async function searchITunesTracks(query) {
  const params = new URLSearchParams({
    q: query,
  });

  const response = await fetch(`/api/music-search?${params}`);
  const body = await readResponseBody(response);

  if (!response.ok) {
    throw new Error(getResponseErrorMessage(response, body));
  }

  if (!body || typeof body !== "object" || !Array.isArray(body.results)) {
    throw new Error("iTunes Search APIから想定外の応答が返りました。");
  }

  return body.results.slice(0, 8);
}

function renderMusicSearchResults(tracks, query) {
  musicSearchResults.innerHTML = "";

  if (!tracks.length) {
    musicSearchResults.append(createEmptyState("検索結果がありません。別の曲名やアーティスト名で検索してください。"));
    return;
  }

  tracks.forEach((track) => {
    const row = document.createElement("div");
    const image = document.createElement("img");
    const title = document.createElement("div");
    const name = document.createElement("strong");
    const meta = document.createElement("span");
    const externalLink = document.createElement("a");
    const button = document.createElement("button");
    const hasPreview = Boolean(normalizeITunesPreviewUrl(track.previewUrl));

    row.className = "spotify-result";
    title.className = "spotify-result-title";
    image.alt = "";
    image.src = getHighResolutionArtworkUrl(track.artworkUrl100 || track.artworkUrl60 || "");
    name.textContent = track.trackName || "曲名不明";
    meta.textContent = `${track.artistName || "アーティスト不明"} / ${track.collectionName || "iTunes"}`;
    externalLink.className = "spotify-content-link";
    externalLink.href = track.trackViewUrl || "#";
    externalLink.target = "_blank";
    externalLink.rel = "noopener noreferrer";
    externalLink.textContent = "iTunesで開く";
    button.className = "icon-button";
    button.type = "button";
    button.textContent = hasPreview ? "追加して再生" : "追加";
    if (!hasPreview) button.title = "この検索結果にはiTunesプレビューURLがありません。";
    button.addEventListener("click", async () => {
      try {
        await addSelectedITunesTrack(track, query);
      } catch (errorObject) {
        musicSearchStatusMessage = `iTunes曲の追加に失敗しました: ${errorObject.message}`;
        renderMusicSearchPanel();
      }
    });

    title.append(name, meta, externalLink);
    row.append(image, title, button);
    musicSearchResults.append(row);
  });
}

function makePartyTrackFromITunes(track, query) {
  const itunesId = String(track.trackId || "");
  const artworkUrl = getHighResolutionArtworkUrl(track.artworkUrl100 || track.artworkUrl60 || "");
  const previewUrl = normalizeITunesPreviewUrl(track.previewUrl);
  return {
    id: `itunes-${itunesId || makeId("track")}`,
    title: track.trackName || "曲名不明",
    artist: track.artistName || "アーティスト不明",
    note: `iTunesから追加: ${query}`,
    source: "itunes",
    itunesId,
    itunesUrl: track.trackViewUrl || "",
    previewUrl,
    artworkUrl,
    durationMs: previewUrl ? ITUNES_PREVIEW_DURATION * 1000 : undefined,
    trackDurationMs: Number.isFinite(track.trackTimeMillis) ? track.trackTimeMillis : undefined,
    itunesAddedAt: new Date().toISOString(),
  };
}

function getHighResolutionArtworkUrl(value) {
  return String(value || "").replace(/\/\d+x\d+bb\.(jpg|png|webp)$/i, "/600x600bb.$1");
}

async function readResponseBody(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getResponseErrorMessage(response, body) {
  if (body && typeof body === "object") {
    return body.error_description || body.error?.message || body.error || `${response.status} ${response.statusText}`;
  }

  const text = String(body || "").trim();
  if (text) return `${response.status} ${response.statusText}: ${text.slice(0, 160)}`;

  return `${response.status} ${response.statusText}`;
}

function makeScale(seed) {
  const scale = [220, 246.94, 277.18, 329.63, 369.99, 415.3, 493.88, 554.37];
  const hash = [...seed].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return Array.from({ length: 8 }, (_, index) => scale[(hash + index * 3) % scale.length]);
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return normalizeState(saved ? JSON.parse(saved) : deepClone(seedState));
  } catch {
    return deepClone(seedState);
  }
}

function normalizeState(value) {
  const fallback = deepClone(seedState);
  if (!value || typeof value !== "object") return fallback;

  const next = {
    currentAccountId: value.currentAccountId || fallback.currentAccountId,
    accounts: Array.isArray(value.accounts) && value.accounts.length ? value.accounts : fallback.accounts,
    posts: Array.isArray(value.posts) ? value.posts.map(normalizePost).filter(Boolean) : fallback.posts,
    articles: Array.isArray(value.articles) ? value.articles.map(normalizeArticle).filter(Boolean) : fallback.articles,
    playlist: normalizePlaylist(value.playlist, fallback.playlist),
    watchParty: normalizeWatchParty(value.watchParty, fallback.watchParty),
  };

  if (!next.accounts.some((account) => account.id === next.currentAccountId)) {
    next.currentAccountId = next.accounts[0]?.id || fallback.currentAccountId;
  }

  return next;
}

function normalizePost(post) {
  if (!post || typeof post !== "object") return null;
  const body = normalizeText(post.body, 280);
  if (getContentPolicyViolation(body)) return null;

  if (post.type === "music" && post.track) {
    const title = normalizeText(post.track.title, 80);
    const artist = normalizeText(post.track.artist, 80);
    if (!title || !artist || getContentPolicyViolation(title) || getContentPolicyViolation(artist)) return null;

    return {
      ...post,
      type: "music",
      body,
      track: {
        title,
        artist,
      },
    };
  }

  if (post.type === "live" && post.live) {
    const title = normalizeText(post.live.title, 100);
    const venue = normalizeText(post.live.venue, 100);
    if (!title || !venue || getContentPolicyViolation(title) || getContentPolicyViolation(venue)) return null;

    return {
      ...post,
      type: "live",
      body,
      live: {
        title,
        date: post.live.date || "",
        venue,
      },
    };
  }

  return null;
}

function normalizeArticle(article) {
  if (!article || typeof article !== "object") return null;

  return {
    ...article,
    comments: Array.isArray(article.comments)
      ? article.comments.map(normalizeArticleComment).filter(Boolean)
      : [],
  };
}

function normalizeArticleComment(comment) {
  if (!comment || typeof comment !== "object") return null;
  const body = normalizeText(comment.body, 140);
  if (!body || getContentPolicyViolation(body)) return null;

  return {
    id: normalizeText(comment.id, 80) || makeId("comment"),
    accountId: normalizeText(comment.accountId, 80),
    body,
  };
}

function normalizePlaylist(value, fallback) {
  if (!value || !Array.isArray(value.tracks)) return fallback;

  return {
    ...fallback,
    ...value,
    tracks: value.tracks.map(normalizePlaylistTrack).filter(Boolean),
  };
}

function normalizePlaylistTrack(track) {
  if (!track || typeof track !== "object") return null;
  const title = normalizeText(track.title, 80);
  const artist = normalizeText(track.artist, 80);
  const note = normalizeText(track.note, 120);
  if (
    !title ||
    !artist ||
    getContentPolicyViolation(title) ||
    getContentPolicyViolation(artist) ||
    getContentPolicyViolation(note)
  ) {
    return null;
  }

  return {
    id: normalizeText(track.id, 80) || makeId("track"),
    title,
    artist,
    note,
    addedBy: normalizeText(track.addedBy, 80),
    votes: Number.isFinite(track.votes) ? track.votes : 0,
  };
}

function normalizeWatchParty(value, fallback) {
  if (!value || typeof value !== "object") return fallback;

  const fallbackQueue = Array.isArray(fallback.queue)
    ? fallback.queue.map(normalizePartyTrack).filter(Boolean)
    : [];
  const queue = Array.isArray(value.queue)
    ? value.queue.map(normalizePartyTrack).filter(Boolean)
    : [];
  const activeQueue = queue.length ? queue : fallbackQueue;
  const fallbackPlayback = {
    ...fallback.playback,
    trackId: activeQueue[0]?.id || fallback.playback.trackId,
  };
  const playback = value.playback || fallbackPlayback;
  const trackExists = activeQueue.some((track) => track.id === playback.trackId);

  return {
    roomName: value.roomName || fallback.roomName,
    festivalName: value.festivalName || fallback.festivalName,
    queue: activeQueue,
    playback: {
      ...fallbackPlayback,
      ...playback,
      trackId: trackExists ? playback.trackId : activeQueue[0]?.id || fallbackPlayback.trackId,
      status: playback.status === "playing" ? "playing" : "paused",
      pausedAt: Number.isFinite(playback.pausedAt) ? playback.pausedAt : 0,
      updatedByName: playback.updatedByName || "",
    },
    comments: Array.isArray(value.comments)
      ? value.comments.map(normalizePartyComment).filter(Boolean).slice(-200)
      : fallback.comments,
  };
}

function normalizePartyTrack(track) {
  if (!track || typeof track !== "object") return null;

  const title = normalizeText(track.title, 80);
  const artist = normalizeText(track.artist, 80);
  const note = normalizeText(track.note, 140);
  if (
    !title ||
    !artist ||
    getContentPolicyViolation(title) ||
    getContentPolicyViolation(artist) ||
    getContentPolicyViolation(note)
  ) {
    return null;
  }

  const source = getCatalogTrackSource(track);
  const base = {
    id: normalizeText(track.id, 100) || makeId("party-track"),
    title,
    artist,
    note,
  };

  if (!source) return base;

  const normalized = source === "itunes" ? normalizeITunesPartyTrack(track, base) : normalizeSpotifyPartyTrack(track, base);
  if (!normalized) return null;

  if (Number.isFinite(track.durationMs)) {
    normalized.durationMs = track.durationMs;
  }

  if (Number.isFinite(track.trackDurationMs)) {
    normalized.trackDurationMs = track.trackDurationMs;
  }

  return isFreshCatalogTrack(normalized) ? normalized : null;
}

function getCatalogTrackSource(track) {
  if (track.source === "itunes" || track.itunesId || track.itunesUrl) return "itunes";
  if (track.source === "spotify" || track.spotifyUri || track.spotifyId) return "spotify";
  return "";
}

function normalizeITunesPartyTrack(track, base) {
  const itunesId = getITunesTrackId(track);
  const itunesUrl = normalizeITunesUrl(track.itunesUrl || track.trackViewUrl);
  if (!itunesId && !itunesUrl) return null;

  return {
    ...base,
    id: base.id.startsWith("itunes-") ? base.id : `itunes-${itunesId || makeId("track")}`,
    source: "itunes",
    itunesId,
    itunesUrl,
    previewUrl: normalizeITunesPreviewUrl(track.previewUrl),
    artworkUrl: normalizeImageUrl(track.artworkUrl),
    itunesAddedAt: normalizeIsoDate(track.itunesAddedAt || track.addedAt, new Date().toISOString()),
  };
}

function normalizeSpotifyPartyTrack(track, base) {
  const spotifyId = getSpotifyTrackId(track);
  if (!spotifyId) return null;

  return {
    ...base,
    id: base.id.startsWith("spotify-") ? base.id : `spotify-${spotifyId}`,
    source: "spotify",
    spotifyId,
    spotifyUri: `spotify:track:${spotifyId}`,
    spotifyUrl: normalizeSpotifyUrl(track.spotifyUrl, spotifyId),
    spotifyAddedAt: normalizeIsoDate(track.spotifyAddedAt || track.addedAt, new Date().toISOString()),
  };
}

function normalizePartyComment(comment) {
  if (!comment || typeof comment !== "object") return null;
  const body = normalizeText(comment.body, 140);
  if (!body || getContentPolicyViolation(body)) return null;

  return {
    id: normalizeText(comment.id, 80) || makeId("party-comment"),
    accountId: normalizeText(comment.accountId, 80),
    authorName: normalizeText(comment.authorName, 80),
    authorHandle: normalizeText(comment.authorHandle, 80),
    body,
    createdAt: normalizeIsoDate(comment.createdAt, new Date().toISOString()),
    trackId: normalizeText(comment.trackId, 100),
    at: Number.isFinite(comment.at) ? comment.at : 0,
  };
}

function normalizeText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function normalizeIsoDate(value, fallback) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function getITunesTrackId(track) {
  if (track.itunesId) return String(track.itunesId);
  if (track.trackId) return String(track.trackId);

  const idMatch = String(track.id || "").match(/^itunes-(\d+)$/);
  return idMatch ? idMatch[1] : "";
}

function getSpotifyTrackId(track) {
  if (track.spotifyId) return String(track.spotifyId);

  const uriMatch = String(track.spotifyUri || "").match(/^spotify:track:([A-Za-z0-9]+)$/);
  if (uriMatch) return uriMatch[1];

  const idMatch = String(track.id || "").match(/^spotify-([A-Za-z0-9]+)$/);
  return idMatch ? idMatch[1] : "";
}

function normalizeITunesUrl(value) {
  try {
    const url = new URL(String(value || ""));
    if (url.protocol === "https:" && /(^|\.)apple\.com$/.test(url.hostname)) {
      return url.toString();
    }
  } catch {
    // Fall through to an empty URL.
  }

  return "";
}

function normalizeITunesPreviewUrl(value) {
  try {
    const url = new URL(String(value || ""));
    const isApplePreviewHost =
      /(^|\.)itunes\.apple\.com$/.test(url.hostname) || /(^|\.)mzstatic\.com$/.test(url.hostname);
    if (url.protocol === "https:" && isApplePreviewHost) return url.toString();
  } catch {
    // Fall through to an empty URL.
  }

  return "";
}

function normalizeSpotifyUrl(value, spotifyId) {
  try {
    const url = new URL(String(value || ""));
    if (url.hostname === "open.spotify.com" && url.pathname.startsWith("/track/")) {
      return url.toString();
    }
  } catch {
    // Fall through to the canonical URL below.
  }

  return `https://open.spotify.com/track/${spotifyId}`;
}

function normalizeImageUrl(value) {
  try {
    const url = new URL(String(value || ""));
    if (url.protocol === "https:") return url.toString();
  } catch {
    // Fall through to an empty URL.
  }

  return "";
}

function isFreshCatalogTrack(track) {
  const addedAt = Date.parse(track.itunesAddedAt || track.spotifyAddedAt || "");
  return Number.isFinite(addedAt) && Date.now() - addedAt <= CATALOG_CONTENT_TTL_MS;
}

function commitState(reason) {
  state = normalizeState(state);
  saveState();

  if (partyChannel) {
    partyChannel.postMessage({
      type: "state",
      reason,
      state,
    });
  }

  void publishWatchPartyToServer(reason);
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function findAccount(accountId) {
  return (
    state.accounts.find((account) => account.id === accountId) || {
      id: "missing",
      name: "Unknown",
      handle: "unknown",
      genre: "",
    }
  );
}

function getCurrentAccount() {
  return state.accounts.find((account) => account.id === state.currentAccountId) || state.accounts[0];
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeHandle(value) {
  return value
    .trim()
    .replace(/^@/, "")
    .replace(/\s+/g, "_")
    .replace(/[^\w-]/g, "")
    .slice(0, 18);
}

function formatRelativeTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "いま";
  if (minutes < 60) return `${minutes}分前`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}時間前`;

  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatLiveDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDuration(value) {
  const totalSeconds = Math.max(0, Math.floor(value));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

initMusicSearchIntegration();
render();
startPartyClock();
initPartyServerSync();
