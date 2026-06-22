// app.js — Odd One Out Game Logic
// ══════════════════════════════════════════════════════════════════

// ── STATE ─────────────────────────────────────────────────────────
const state = {
  playerId: null,       // unique ID for this browser session
  playerName: null,
  lobbyCode: null,
  isHost: false,
  currentScreen: 'home',
  myWord: null,
  myVote: null,
  timerInterval: null,
  voteTimerInterval: null,
  timerPaused: false,
  timerPauseRemaining: null,
  usedPairs: [],        // track used word pairs to avoid repeats
};

// ── FIREBASE REFERENCES ────────────────────────────────────────────
// db is initialized in firebase-config.js
let lobbyRef = null;   // set when lobby is created/joined

// ── UTILITIES ──────────────────────────────────────────────────────
function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function generateLobbyCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no confusing chars
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function getAvatarLetter(name) {
  return (name || '?')[0].toUpperCase();
}

function avatarColor(name) {
  const colors = ['#7c6af7','#f76a8a','#4ade80','#fbbf24','#60a5fa','#f97316','#a78bfa','#34d399'];
  let hash = 0;
  for (let c of name) hash = (hash * 31 + c.charCodeAt(0)) % colors.length;
  return colors[hash];
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + id).classList.add('active');
  state.currentScreen = id;
}

function setError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}

function clearError(id) { setError(id, ''); }

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// ── PLAYER ID (persisted per browser) ─────────────────────────────
function getOrCreatePlayerId() {
  // Use tab-specific storage so each tab is a unique player
  if (!window._tabPlayerId) {
    window._tabPlayerId = generateId();
  }
  return window._tabPlayerId;
}

// ══════════════════════════════════════════════════════════════════
// LOBBY CREATION
// ══════════════════════════════════════════════════════════════════
async function createLobby() {
  const name = document.getElementById('hostName').value.trim();
  if (!name) return setError('homeError', 'Please enter your name.');
  clearError('homeError');

  state.playerId   = getOrCreatePlayerId();
  state.playerName = name;
  state.isHost     = true;

  // Generate a unique lobby code (retry if collision)
  let code;
  let attempts = 0;
  do {
    code = generateLobbyCode();
    const snap = await db.ref('lobbies/' + code).once('value');
    if (!snap.exists()) break;
    attempts++;
  } while (attempts < 5);

  state.lobbyCode = code;
  lobbyRef = db.ref('lobbies/' + code);

  const lobbyData = {
    host: state.playerId,
    phase: 'lobby',
    round: 0,
    settings: {
      category: 'all',
      oddCount: 1,
      timerDuration: 120,
      votingTimer: 60,
      revealMode: 'word',
    },
    players: {
      [state.playerId]: {
        name,
        alive: true,
        ready: false,
        spectator: false,
        score: 0,
        joinedAt: Date.now(),
      }
    },
    votes: {},
    usedPairs: [],
    createdAt: Date.now(),
  };

  await lobbyRef.set(lobbyData);

  // Auto-cleanup lobby after 4 hours
  setTimeout(() => lobbyRef.remove(), 4 * 60 * 60 * 1000);

  enterLobby();
}

// ══════════════════════════════════════════════════════════════════
// LOBBY JOINING
// ══════════════════════════════════════════════════════════════════
async function joinLobby() {
  const name = document.getElementById('joinName').value.trim();
  const code = document.getElementById('joinCode').value.trim().toUpperCase();

  if (!name) return setError('homeError', 'Please enter your name.');
  if (!code || code.length < 4) return setError('homeError', 'Please enter the lobby code.');
  clearError('homeError');

  const snap = await db.ref('lobbies/' + code).once('value');
  if (!snap.exists()) return setError('homeError', 'Lobby not found. Check the code.');

  const lobby = snap.val();
  if (lobby.phase !== 'lobby') return setError('homeError', 'This game has already started.');

  const players = lobby.players || {};
  const playerCount = Object.keys(players).length;
  if (playerCount >= 10) return setError('homeError', 'This lobby is full (max 10 players).');

  // Check for duplicate names
  const names = Object.values(players).map(p => p.name.toLowerCase());
  if (names.includes(name.toLowerCase())) return setError('homeError', 'That name is taken. Try another.');

  state.playerId   = getOrCreatePlayerId();
  state.playerName = name;
  state.isHost     = false;
  state.lobbyCode  = code;
  lobbyRef         = db.ref('lobbies/' + code);

  await lobbyRef.child('players/' + state.playerId).set({
    name,
    alive: true,
    ready: false,
    spectator: false,
    score: 0,
    joinedAt: Date.now(),
  });

  enterLobby();
}

// ══════════════════════════════════════════════════════════════════
// LOBBY SCREEN
// ══════════════════════════════════════════════════════════════════
function enterLobby() {
  showScreen('lobby');
  document.getElementById('lobbyCodeDisplay').textContent = state.lobbyCode;
  document.getElementById('hostSettingsCard').style.display = state.isHost ? 'block' : 'none';
  document.getElementById('guestWaitCard').style.display   = state.isHost ? 'none' : 'block';

  // Word category → show/hide custom box
  document.getElementById('wordCategory').addEventListener('change', function () {
    document.getElementById('customWordsBox').style.display = this.value === 'custom' ? 'block' : 'none';
  });

  // Listen to lobby changes
  lobbyRef.on('value', onLobbyUpdate);

  // Handle disconnect — remove player from lobby
  lobbyRef.child('players/' + state.playerId).onDisconnect().remove();
}

function onLobbyUpdate(snap) {
  if (!snap.exists()) {
    // Lobby was deleted
    lobbyRef.off();
    alert('The lobby was closed by the host.');
    location.reload();
    return;
  }

  const lobby = snap.val();

  // Route to correct screen based on game phase
  switch (lobby.phase) {
    case 'lobby':       renderLobbyScreen(lobby); break;
    case 'wordReveal':  goToWordReveal(lobby);     break;
    case 'discussion':  goToDiscussion(lobby);     break;
    case 'voting':      goToVoting(lobby);         break;
    case 'result':      goToResult(lobby);         break;
    case 'ended':       goToGameOver(lobby);       break;
  }
}

function renderLobbyScreen(lobby) {
  if (state.currentScreen !== 'lobby') showScreen('lobby');

  const players = lobby.players || {};
  const list = document.getElementById('playerList');
  const count = Object.keys(players).length;
  document.getElementById('playerCount').textContent = count + ' / 10';

  list.innerHTML = '';
  Object.entries(players)
    .sort((a, b) => a[1].joinedAt - b[1].joinedAt)
    .forEach(([id, p]) => {
      const isMe   = id === state.playerId;
      const isHost = id === lobby.host;
      const li = document.createElement('li');
      li.innerHTML = `
        <div class="player-avatar" style="background:${avatarColor(p.name)}">${getAvatarLetter(p.name)}</div>
        <span class="player-name">${p.name}</span>
        ${isHost ? '<span class="player-tag tag-host">HOST</span>' : ''}
        ${isMe   ? '<span class="player-tag tag-you">YOU</span>'  : ''}
      `;
      list.appendChild(li);
    });

  // Disable start if fewer than 3 players
  const startBtn = document.getElementById('btnStartGame');
  if (startBtn) {
    startBtn.disabled = count < 3;
  }

  // Disable 2 odd players if count < 5
  const oddSel = document.getElementById('oddCount');
  if (oddSel) {
    oddSel.querySelector('option[value="2"]').disabled = count < 5;
  }
}

// ══════════════════════════════════════════════════════════════════
// HOST: START GAME
// ══════════════════════════════════════════════════════════════════
async function startGame() {
  const snap = await lobbyRef.once('value');
  const lobby = snap.val();
  const players = lobby.players || {};
  const count   = Object.keys(players).length;
  if (count < 3) return setError('lobbyError', 'Need at least 3 players!');

  // Read settings
  const category    = document.getElementById('wordCategory').value;
  const oddCount    = parseInt(document.getElementById('oddCount').value);
  const timerDur    = parseInt(document.getElementById('timerSetting').value);
  const votingTimer = parseInt(document.getElementById('votingTimerSetting').value);
  const revealMode  = document.getElementById('revealMode').value;

  // Parse custom words if needed
  let customPairs = [];
  if (category === 'custom') {
    const raw = document.getElementById('customWords').value.trim();
    customPairs = raw.split('\n')
      .map(line => line.split(',').map(w => w.trim()))
      .filter(pair => pair.length === 2 && pair[0] && pair[1]);
    if (customPairs.length === 0) return setError('lobbyError', 'Add at least one word pair for custom mode.');
    WORD_PAIRS.custom = customPairs;
  }

  clearError('lobbyError');

  // Get a word pair
  const usedPairs = lobby.usedPairs ? Object.values(lobby.usedPairs) : [];
  const pair = getRandomPair(category, usedPairs);
  const pairKey = pair[0] + '|' + pair[1];

  // Assign words — most get pair[0], odd ones get pair[1]
  const playerIds = Object.keys(players);
  const shuffled  = [...playerIds].sort(() => Math.random() - 0.5);
  const oddIds    = shuffled.slice(0, oddCount);

  const wordAssignments = {};
  playerIds.forEach(id => {
    wordAssignments[id] = {
      word: oddIds.includes(id) ? pair[1] : pair[0],
      isOdd: oddIds.includes(id),
    };
  });

  // Reset ready & vote states
  const playerUpdates = {};
  playerIds.forEach(id => {
    playerUpdates[id] = {
      ...players[id],
      ready: false,
      alive: lobby.round === 0 ? true : players[id].alive, // keep alive from prev round
      vote: null,
    };
  });

  await lobbyRef.update({
    phase: 'wordReveal',
    round: (lobby.round || 0) + 1,
    settings: { category, oddCount, timerDuration: timerDur, votingTimer, revealMode },
    wordAssignments,
    votes: {},
    currentPair: pairKey,
    players: playerUpdates,
    timerState: null,
  });

  // Add used pair
  await lobbyRef.child('usedPairs').push(pairKey);
}

// ══════════════════════════════════════════════════════════════════
// WORD REVEAL SCREEN
// ══════════════════════════════════════════════════════════════════
function goToWordReveal(lobby) {

if (state.currentScreen === 'word') {
  const readyBtn = document.getElementById('btnReady');
  if (readyBtn) {
    readyBtn.disabled = false;
    readyBtn.textContent = "✅ I've Seen It — Ready";
  }

  state.myReady = false;
  updateReadyList(lobby);
  return;
}

  stopAllTimers();
  showScreen('word');
  document.getElementById('roundNumber').textContent = lobby.round;

  // Get my word
  const assignment = lobby.wordAssignments?.[state.playerId];
  state.myWord = assignment?.word || '???';

  const wordEl    = document.getElementById('yourWord');
  const overlayEl = document.getElementById('wordBlurOverlay');
  const cardEl    = document.getElementById('wordRevealCard');

  wordEl.textContent = state.myWord;
  overlayEl.classList.remove('hidden');

  // Tap to reveal
  let revealed = false;
  cardEl.onclick = () => {
    if (!revealed) {
      overlayEl.classList.add('hidden');
      revealed = true;
      document.getElementById('tapHint') && (document.getElementById('tapHint').style.display = 'none');
    }
  };

const readyBtn = document.getElementById('btnReady');
if (readyBtn) {
  readyBtn.disabled = false;
  readyBtn.textContent = "✅ I've Seen It — Ready";
}

state.myReady = false;
updateReadyList(lobby);
}

function updateReadyList(lobby) {
  const players   = lobby.players || {};
  const readyList = document.getElementById('readyList');
  const readyCount = Object.values(players).filter(p => p.ready).length;
  const total      = Object.keys(players).length;

  document.getElementById('readyCountBadge').textContent = readyCount + ' / ' + total + ' ready';

  readyList.innerHTML = '';
  Object.entries(players).forEach(([id, p]) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="player-avatar" style="background:${avatarColor(p.name)}">${getAvatarLetter(p.name)}</div>
      <span class="player-name">${p.name}</span>
      <span class="player-tag ${p.ready ? 'tag-ready' : 'tag-waiting'}">${p.ready ? '✓ Ready' : 'Waiting'}</span>
    `;
    readyList.appendChild(li);
  });

  // Auto-advance to discussion when ALL are ready (host triggers)
  if (state.isHost && readyCount === total && total >= 3) {
    startDiscussion(lobby);
  }
}

async function markReady() {
  if (state.myReady) return;
  state.myReady = true;
  document.getElementById('btnReady').disabled = true;
  document.getElementById('btnReady').textContent = '✅ Ready!';
  await lobbyRef.child('players/' + state.playerId + '/ready').set(true);
}

// ══════════════════════════════════════════════════════════════════
// DISCUSSION SCREEN
// ══════════════════════════════════════════════════════════════════
async function startDiscussion(lobby) {
  const settings = lobby.settings || {};
  const duration = settings.timerDuration || 0;

  await lobbyRef.update({
    phase: 'discussion',
    timerState: duration > 0 ? {
      startedAt: Date.now(),
      duration,
      paused: false,
      remaining: duration,
    } : null,
  });
}

function goToDiscussion(lobby) {
  if (state.currentScreen !== 'discussion') {
    stopAllTimers();
    showScreen('discussion');
  }

  document.getElementById('roundNumberDisc').textContent = lobby.round;
  document.getElementById('hostDiscControls').style.display = state.isHost ? 'block' : 'none';

  renderAliveList(lobby, 'aliveListDiscussion');

  const ts = lobby.timerState;
  if (!ts) {
    document.getElementById('timerDisplay').textContent = '--:--';
    document.getElementById('timerBarFill').style.width = '100%';
    return;
  }

  runDiscussionTimer(ts, lobby.settings.timerDuration);
}

function runDiscussionTimer(ts, totalDuration) {
  clearInterval(state.timerInterval);

  function tick() {
    if (ts.paused) {
      const rem = ts.remaining;
      updateTimerDisplay(rem, totalDuration, 'timerDisplay', 'timerBarFill');
      return;
    }
    const elapsed  = Math.floor((Date.now() - ts.startedAt) / 1000);
    const remaining = Math.max(0, ts.duration - elapsed);
    updateTimerDisplay(remaining, totalDuration, 'timerDisplay', 'timerBarFill');

    if (remaining <= 0) {
      clearInterval(state.timerInterval);
      if (state.isHost) beginVoting();
    }
  }

  tick();
  state.timerInterval = setInterval(tick, 1000);
}

function updateTimerDisplay(remaining, total, displayId, barId) {
  const el  = document.getElementById(displayId);
  const bar = document.getElementById(barId);
  if (!el) return;

  el.textContent = formatTime(remaining);
  el.classList.remove('warning', 'danger');
  bar && bar.classList.remove('warning', 'danger');

  const pct = total > 0 ? (remaining / total) * 100 : 100;
  if (bar) bar.style.width = pct + '%';

  if (remaining <= 30 && remaining > 0) {
    el.classList.add('danger');
    bar && bar.classList.add('danger');
  } else if (remaining <= 60) {
    el.classList.add('warning');
    bar && bar.classList.add('warning');
  }
}

async function pauseTimer() {
  const snap = await lobbyRef.child('timerState').once('value');
  const ts = snap.val();
  if (!ts || ts.paused) return;

  const elapsed   = Math.floor((Date.now() - ts.startedAt) / 1000);
  const remaining = Math.max(0, ts.duration - elapsed);

  await lobbyRef.child('timerState').update({ paused: true, remaining });
  document.getElementById('btnPauseTimer').style.display  = 'none';
  document.getElementById('btnResumeTimer').style.display = 'block';
}

async function resumeTimer() {
  const snap = await lobbyRef.child('timerState').once('value');
  const ts = snap.val();
  if (!ts || !ts.paused) return;

  await lobbyRef.child('timerState').update({
    paused: false,
    startedAt: Date.now(),
    duration: ts.remaining,
  });
  document.getElementById('btnPauseTimer').style.display  = 'block';
  document.getElementById('btnResumeTimer').style.display = 'none';
}

// ══════════════════════════════════════════════════════════════════
// VOTING SCREEN
// ══════════════════════════════════════════════════════════════════
async function beginVoting() {
  const snap = await lobbyRef.once('value');
  const lobby = snap.val();
  const votingTimer = lobby.settings?.votingTimer || 0;

  await lobbyRef.update({
    phase: 'voting',
    votes: {},
    voteTimerState: votingTimer > 0 ? {
      startedAt: Date.now(),
      duration: votingTimer,
    } : null,
  });
}

function goToVoting(lobby) {
  if (state.currentScreen !== 'voting') {
    stopTimerOnly();
    showScreen('voting');
    state.myVote = null;
  }

  document.getElementById('roundNumberVote').textContent = lobby.round;
  document.getElementById('hostVoteControls').style.display = state.isHost ? 'block' : 'none';

  renderVoteOptions(lobby);
  updateVoteProgress(lobby);

  const vts = lobby.voteTimerState;
  if (vts) {
    runVoteTimer(vts, vts.duration);
  } else {
    document.getElementById('votingTimerDisplay').textContent = '--:--';
  }
}

function renderVoteOptions(lobby) {
  const players = lobby.players || {};
  const myPlayer = players[state.playerId];
  const list = document.getElementById('voteOptions');
  list.innerHTML = '';

  // Can't vote if eliminated
  if (myPlayer && !myPlayer.alive) {
    list.innerHTML = '<li style="color:var(--text-faint);padding:12px 0;text-align:center;">You were eliminated — spectating only.</li>';
    return;
  }

  Object.entries(players)
    .filter(([id, p]) => id !== state.playerId && p.alive)
    .sort((a, b) => a[1].name.localeCompare(b[1].name))
    .forEach(([id, p]) => {
      const li = document.createElement('li');
      const isSelected = state.myVote === id;
      const btn = document.createElement('button');
      btn.className = isSelected ? 'selected' : '';
      btn.innerHTML = `
        <div class="vote-avatar" style="background:${avatarColor(p.name)}">${getAvatarLetter(p.name)}</div>
        <span class="vote-name">${p.name}</span>
        ${isSelected ? '<span class="vote-check">✓</span>' : ''}
      `;
      btn.onclick = () => castVote(id, lobby);
      li.appendChild(btn);
      list.appendChild(li);
    });
}

async function castVote(targetId, lobby) {
  if (state.myVote === targetId) return; // already voted this
  state.myVote = targetId;

  await lobbyRef.child('votes/' + state.playerId).set(targetId);

  const snap = await lobbyRef.once('value');
  renderVoteOptions(snap.val());
  updateVoteProgress(snap.val());
  document.getElementById('myVoteStatus').textContent = '✅ Vote cast! Waiting for others...';
}

function updateVoteProgress(lobby) {
  const players = lobby.players || {};
  const votes   = lobby.votes   || {};
  const alivePlayers = Object.entries(players).filter(([, p]) => p.alive);
  const voteCount    = Object.keys(votes).length;
  const total        = alivePlayers.length;

  document.getElementById('voteCountStatus').textContent = `${voteCount} / ${total} votes cast`;
  const pct = total > 0 ? (voteCount / total) * 100 : 0;
  document.getElementById('voteProgressFill').style.width = pct + '%';

  // Auto tally when all alive players voted
  if (state.isHost && voteCount >= total) {
    setTimeout(() => tallyVotes(), 800);
  }
}

function runVoteTimer(vts, totalDuration) {
  clearInterval(state.voteTimerInterval);

  function tick() {
    const elapsed   = Math.floor((Date.now() - vts.startedAt) / 1000);
    const remaining = Math.max(0, vts.duration - elapsed);
    updateTimerDisplay(remaining, totalDuration, 'votingTimerDisplay', 'voteTimerBarFill');

    if (remaining <= 0) {
      clearInterval(state.voteTimerInterval);
      if (state.isHost) tallyVotes();
    }
  }

  tick();
  state.voteTimerInterval = setInterval(tick, 1000);
}

// ══════════════════════════════════════════════════════════════════
// TALLY VOTES & RESULT
// ══════════════════════════════════════════════════════════════════
async function tallyVotes() {
  const snap  = await lobbyRef.once('value');
  const lobby = snap.val();
  const votes   = lobby.votes   || {};
  const players = lobby.players || {};
  const assignments = lobby.wordAssignments || {};

  // Count votes per player
  const tally = {};
  Object.values(votes).forEach(targetId => {
    tally[targetId] = (tally[targetId] || 0) + 1;
  });

  const alivePlayers = Object.keys(players).filter(id => players[id].alive);

  // Find max votes
  let maxVotes = 0;
  alivePlayers.forEach(id => { if ((tally[id] || 0) > maxVotes) maxVotes = tally[id] || 0; });

  // Who has max votes (tie check)
  const topVoted = alivePlayers.filter(id => (tally[id] || 0) === maxVotes);

  let eliminatedId;
  if (topVoted.length === 1) {
    eliminatedId = topVoted[0];
  } else if (topVoted.length > 1 && maxVotes > 0) {
    // Tie → random among tied
    eliminatedId = topVoted[Math.floor(Math.random() * topVoted.length)];
  } else {
    // No votes cast → random
    eliminatedId = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
  }

  const wasOdd = assignments[eliminatedId]?.isOdd || false;
  const eliminatedWord =
  assignments[eliminatedId]?.word || '?';

  // Scoring: +1 to each alive player who voted correctly
  const playerUpdates = { ...players };
  alivePlayers.forEach(id => {
    if (id !== eliminatedId && votes[id] === eliminatedId) {
      playerUpdates[id] = { ...playerUpdates[id], score: (playerUpdates[id].score || 0) + 1 };
    }
  });
  // If odd one was caught, odd one loses a point
  if (wasOdd) {
    playerUpdates[eliminatedId] = { ...playerUpdates[eliminatedId], score: Math.max(0, (playerUpdates[eliminatedId].score || 0) - 1) };
  }
  // Mark eliminated
  playerUpdates[eliminatedId] = { ...playerUpdates[eliminatedId], alive: false };

  // Check game over conditions
  const remainingAlive  = Object.entries(playerUpdates).filter(([, p]) => p.alive);
  const remainingOdds   = remainingAlive.filter(([id]) => assignments[id]?.isOdd);
  const remainingNormal = remainingAlive.filter(([id]) => !assignments[id]?.isOdd);

  let gameOver = false;
  let winnerTeam = null;
  if (remainingOdds.length === 0) { gameOver = true; winnerTeam = 'normal'; }  // all odd ones caught
  if (remainingOdds.length >= remainingNormal.length) { gameOver = true; winnerTeam = 'odd'; } // odd ones take over

  const [majorityWord, oddWord] = (lobby.currentPair || '|').split('|');

  await lobbyRef.update({
    phase: 'result',
    players: playerUpdates,
    lastResult: {
      eliminatedId,
      eliminatedName: players[eliminatedId]?.name || '?',
      eliminatedWord,
      wasOdd,
      tally,
      majorityWord,
      oddWord,
      tie: topVoted.length > 1,
    },
    gameOver,
    winnerTeam,
  });
}

// ══════════════════════════════════════════════════════════════════
// RESULT SCREEN
// ══════════════════════════════════════════════════════════════════
function goToResult(lobby) {
  stopAllTimers();
  if (state.currentScreen !== 'result') showScreen('result');

  const result   = lobby.lastResult || {};
  const players  = lobby.players    || {};
  const settings = lobby.settings   || {};
  const reveal   = settings.revealMode || 'word';

  // ── Result card ──
  const card = document.getElementById('resultCard');
  const wasTie = result.tie ? '⚖️ It was a tie! Random elimination.' : '';
  let outcomeHtml = '';

  if (result.wasOdd) {
    outcomeHtml = `<div class="result-outcome outcome-caught">🎉 The Odd One was caught!</div>`;
  } else {
    outcomeHtml = `<div class="result-outcome outcome-wrong">😬 Oops! Wrong person eliminated.</div>`;
  }

  let revealHtml = '';
  if (reveal === 'word') {

  const oddPlayers = Object.entries(lobby.wordAssignments || {})
    .filter(([id, data]) => data.isOdd)
    .map(([id]) => lobby.players[id]?.name || 'Unknown');

  revealHtml = `
    <div class="word-reveal-result">
      Everyone's word: <span>${result.majorityWord || '?'}</span><br/>
      Odd Word: <span>${result.oddWord || '?'}</span><br/>
      Odd Player(s): <span>${oddPlayers.join(', ')}</span><br/>
      ${result.eliminatedName}'s word: <span>${result.eliminatedWord || '?'}</span>
    </div>`;
    
} else if (reveal === 'identity') {

  const oddPlayers = Object.entries(lobby.wordAssignments || {})
    .filter(([id, data]) => data.isOdd)
    .map(([id]) => lobby.players[id]?.name || 'Unknown');

  revealHtml = `
    <div class="word-reveal-result">
      ${result.eliminatedName} was ${result.wasOdd ? 'the Odd One' : 'a normal player'}.
      <br/>
      Odd Player(s): <strong>${oddPlayers.join(', ')}</strong>
    </div>`;
}

  card.innerHTML = `
    <p class="result-label">Eliminated</p>
    <div class="result-eliminated-name" style="color:${avatarColor(result.eliminatedName || '')}">${result.eliminatedName || '?'}</div>
    ${wasTie ? `<p style="color:var(--text-dim);font-size:0.82rem;margin-top:4px;">${wasTie}</p>` : ''}
    ${outcomeHtml}
    ${revealHtml}
  `;

  // ── Scoreboard ──
  const scoreList = document.getElementById('scoreList');
  scoreList.innerHTML = '';
  Object.entries(players)
    .sort((a, b) => (b[1].score || 0) - (a[1].score || 0))
    .forEach(([id, p]) => {
      const li = document.createElement('li');
      const isMe = id === state.playerId;
      li.innerHTML = `
        <div class="player-avatar" style="background:${avatarColor(p.name)}">${getAvatarLetter(p.name)}</div>
        <span class="player-name">${p.name}${isMe ? ' <span class="player-tag tag-you" style="margin-left:4px">YOU</span>' : ''}</span>
        <span class="score-val">${p.score || 0} pts</span>
      `;
      li.classList.add('score-list');
      scoreList.appendChild(li);
    });

  // ── Game over ──
  const gameOverCard = document.getElementById('gameOverCard');
  if (lobby.gameOver) {
    gameOverCard.style.display = 'block';
    const title = document.getElementById('gameOverTitle');
    const detail = document.getElementById('gameOverDetail');
    if (lobby.winnerTeam === 'normal') {
      document.getElementById('gameOverEmoji').textContent = '🏆';
      title.textContent = 'Normal Players Win!';
      detail.textContent = 'All the Odd Ones have been eliminated!';
    } else {
      document.getElementById('gameOverEmoji').textContent = '🕵️';
      title.textContent = 'Odd Ones Win!';
      detail.textContent = 'The Odd Ones outnumbered the group!';
    }
    document.getElementById('hostResultControls').style.display = 'none';
    document.getElementById('btnBackToLobby').style.display = 'block';
  } else {
    gameOverCard.style.display = 'none';
    document.getElementById('hostResultControls').style.display = state.isHost ? 'block' : 'none';
    document.getElementById('btnBackToLobby').style.display = 'none';
  }
}

function goToGameOver(lobby) {
  goToResult(lobby); // same screen, game over state handles it
}

// ══════════════════════════════════════════════════════════════════
// HOST: NEXT ROUND / END GAME
// ══════════════════════════════════════════════════════════════════
async function nextRound() {
  // Revive all players for the next round
  const snap = await lobbyRef.once('value');
  const players = snap.val().players || {};
  const updates = {};
  Object.entries(players).forEach(([id, p]) => {
    updates[id] = { ...p, alive: true, ready: false, vote: null };
  });
  await lobbyRef.update({ phase: 'lobby', players: updates, lastResult: null, wordAssignments: null });
}

async function endGame() {
  await lobbyRef.update({ phase: 'ended' });
}

async function backToLobby() {
  const snap = await lobbyRef.once('value');
  const lobby = snap.val();
  const players = lobby.players || {};
  const updates = {};
  Object.entries(players).forEach(([id, p]) => {
    updates[id] = { ...p, alive: true, ready: false };
  });
  await lobbyRef.update({ phase: 'lobby', players: updates, gameOver: false, winnerTeam: null, wordAssignments: null, lastResult: null, round: 0 });
}

// ══════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════
function renderAliveList(lobby, listId) {
  const players = lobby.players || {};
  const list = document.getElementById(listId);
  if (!list) return;
  list.innerHTML = '';
  Object.entries(players)
    .sort((a, b) => a[1].name.localeCompare(b[1].name))
    .forEach(([id, p]) => {
      const isMe = id === state.playerId;
      const li = document.createElement('li');
      li.innerHTML = `
        <div class="player-avatar" style="background:${avatarColor(p.name)}">${getAvatarLetter(p.name)}</div>
        <span class="player-name">${p.name}</span>
        ${isMe ? '<span class="player-tag tag-you">YOU</span>' : ''}
        <span class="player-tag ${p.alive ? 'tag-alive' : 'tag-eliminated'}">${p.alive ? '● Alive' : '✗ Out'}</span>
      `;
      list.appendChild(li);
    });
}

function stopTimerOnly() { clearInterval(state.timerInterval); }
function stopAllTimers()  {
  clearInterval(state.timerInterval);
  clearInterval(state.voteTimerInterval);
}

async function leaveLobby() {
  if (confirm('Leave the lobby?')) {
    lobbyRef.off();
    await lobbyRef.child('players/' + state.playerId).remove();
    // If host leaves, delete lobby
    if (state.isHost) await lobbyRef.remove();
    location.reload();
  }
}

// ══════════════════════════════════════════════════════════════════
// COPY CODE
// ══════════════════════════════════════════════════════════════════
function copyCode() {
  const code = document.getElementById('lobbyCodeDisplay').textContent;
  navigator.clipboard.writeText(code).then(() => {
    const btn = document.getElementById('btnCopyCode');
    btn.textContent = '✅';
    setTimeout(() => (btn.textContent = '📋'), 1500);
  });
}

// ══════════════════════════════════════════════════════════════════
// EVENT LISTENERS (bound after DOM ready)
// ══════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  // Home
  document.getElementById('btnCreateLobby').onclick = createLobby;
  document.getElementById('btnJoinLobby').onclick   = joinLobby;

  // Lobby
  document.getElementById('btnStartGame').onclick   = startGame;
  document.getElementById('btnLeaveLobby').onclick  = leaveLobby;
  document.getElementById('btnCopyCode').onclick    = copyCode;

  // Word reveal
  document.getElementById('btnReady').onclick = markReady;

  // Discussion
  document.getElementById('btnPauseTimer').onclick  = pauseTimer;
  document.getElementById('btnResumeTimer').onclick = resumeTimer;
  document.getElementById('btnSkipToVote').onclick  = beginVoting;

  // Voting
  document.getElementById('btnForceTally').onclick = tallyVotes;

  // Result
  document.getElementById('btnNextRound').onclick  = nextRound;
  document.getElementById('btnEndGame').onclick    = endGame;
  document.getElementById('btnBackToLobby').onclick = backToLobby;

  // Enter key on join inputs
  document.getElementById('joinCode').addEventListener('keydown', e => {
    if (e.key === 'Enter') joinLobby();
  });
  document.getElementById('joinName').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('joinCode').focus();
  });
  document.getElementById('hostName').addEventListener('keydown', e => {
    if (e.key === 'Enter') createLobby();
  });

  // Auto uppercase lobby code input
  document.getElementById('joinCode').addEventListener('input', function () {
    this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  });
});
