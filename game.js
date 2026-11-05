// ============================================================
// URNA ELETRÔNICA LIVE - 13 vs 22
// ============================================================

const state = {
  scoreLeft: 0,
  scoreRight: 0,
  winsLeft: 0,
  winsRight: 0,
  currentRound: 1,
  timeLeft: 300,
  gameOver: false,
  roundActive: true,
  config: null,
  leaderboard: { left: {}, right: {} }
};

let lastGiftTime = {};

// ÁUDIO
let audioContext = null;
function initAudio() {
  if (audioContext) return;
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {}
}
function playBeep(freq, dur, vol = 0.15) {
  if (!audioContext) return;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = 'square';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + dur);
  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.start();
  osc.stop(audioContext.currentTime + dur);
}
function playKeySound() { initAudio(); playBeep(880, 0.06, 0.1); }
function playConfirmSound() {
  initAudio();
  if (!audioContext) return;
  playBeep(1760, 0.12, 0.18);
  setTimeout(() => playBeep(1760, 0.12, 0.18), 180);
  setTimeout(() => playBeep(2200, 0.35, 0.2), 380);
}

// CONFIG
async function loadConfig() {
  try {
    const res = await fetch('/config/config.json');
    state.config = await res.json();
    state.timeLeft = state.config.settings?.roundDuration || 300;
  } catch (e) {
    state.config = { settings: { roundDuration: 300, roundsToWin: 3, cooldown: 100 } };
    state.timeLeft = 300;
  }
  updateAllUI();
}

// UI
function updateAllUI() {
  updateScores();
  updateTimer();
  updateWins();
  updateProgressBar();
  updateLeaderboards();
  const el = document.getElementById('current-round');
  if (el) el.textContent = state.currentRound;
}

function updateScores() {
  const sl = document.getElementById('score-left');
  const sr = document.getElementById('score-right');
  if (sl) sl.textContent = state.scoreLeft;
  if (sr) sr.textContent = state.scoreRight;

  const total = state.scoreLeft + state.scoreRight;
  const pl = document.getElementById('percent-left');
  const pr = document.getElementById('percent-right');
  if (total > 0) {
    const pctL = Math.round((state.scoreLeft / total) * 100);
    if (pl) pl.textContent = pctL + '%';
    if (pr) pr.textContent = (100 - pctL) + '%';
  } else {
    if (pl) pl.textContent = '50%';
    if (pr) pr.textContent = '50%';
  }
}

function updateTimer() {
  const min = Math.floor(state.timeLeft / 60);
  const sec = state.timeLeft % 60;
  const el = document.getElementById('timer');
  if (el) el.textContent = `${min}:${sec.toString().padStart(2, '0')}`;
}

function updateWins() {
  const wl = document.getElementById('wins-left');
  const wr = document.getElementById('wins-right');
  if (wl) wl.textContent = state.winsLeft;
  if (wr) wr.textContent = state.winsRight;
}

function updateProgressBar() {
  const total = state.scoreLeft + state.scoreRight;
  const barL = document.getElementById('bar-left');
  const barR = document.getElementById('bar-right');
  const advText = document.getElementById('advantage-text');

  if (!barL || !barR) return;

  if (total === 0) {
    barL.style.width = '50%';
    barR.style.width = '50%';
    if (advText) { advText.textContent = 'EMPATE'; advText.style.color = '#FFD700'; }
    return;
  }

  const pctL = (state.scoreLeft / total) * 100;
  barL.style.width = pctL + '%';
  barR.style.width = (100 - pctL) + '%';

  const diff = Math.abs(state.scoreLeft - state.scoreRight);
  if (advText) {
    if (diff === 0) { advText.textContent = 'EMPATE'; advText.style.color = '#FFD700'; }
    else if (state.scoreLeft > state.scoreRight) {
      advText.textContent = `13 NA FRENTE +${diff} de vantagem`;
      advText.style.color = '#ff6666';
    } else {
      advText.textContent = `22 NA FRENTE +${diff} de vantagem`;
      advText.style.color = '#66dd88';
    }
  }

  const badge = document.getElementById('na-frente-badge');
  if (badge) badge.style.display = state.scoreRight > state.scoreLeft ? 'block' : 'none';
}

function updateLeaderboards() {
  renderLB('left', 'leaderboard-left');
  renderLB('right', 'leaderboard-right');
}

function renderLB(side, elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.innerHTML = '';

  const sorted = Object.entries(state.leaderboard[side])
    .sort((a, b) => b[1].points - a[1].points)
    .slice(0, 3);

  if (sorted.length === 0) {
    el.innerHTML = '<div class="lb-empty">Aguardando...</div>';
    return;
  }

  sorted.forEach(([uid, data], idx) => {
    const row = document.createElement('div');
    row.className = 'lb-row';
    row.innerHTML = `
      <div class="lb-position">${idx + 1}º</div>
      <div class="lb-name">${data.name || 'Anônimo'}</div>
      <div class="lb-points">${data.points}</div>
    `;
    el.appendChild(row);
  });
}

// ============================================================
// ANIMAÇÃO DA URNA (com display digital no visor)
// ============================================================
function animateUrna(side, userName) {
  const num = side === 'left' ? '13' : '22';
  const d1 = num[0];
  const d2 = num[1];

  const status = document.getElementById(`status-${num}`);
  const urnaEl = document.getElementById(side === 'left' ? 'urna-13' : 'urna-22');
  const mao = document.getElementById(side === 'left' ? 'mao-13' : 'mao-22');
  const teclado = urnaEl?.querySelector('.urna-teclado-wrap');
  const overlay = document.getElementById(side === 'left' ? 'overlay-13' : 'overlay-22');

  // Referências do visor
  const visorDigit1 = document.getElementById(`digit1-${num}`);
  const visorDigit2 = document.getElementById(`digit2-${num}`);
  const visorMsg = document.getElementById(`visor-msg-${num}`);

  if (!status) return;

  // Reset do visor
  status.textContent = 'DIGITANDO...';
  status.classList.remove('confirmed');
  if (visorDigit1) { visorDigit1.textContent = '_'; visorDigit1.classList.remove('active'); }
  if (visorDigit2) { visorDigit2.textContent = '_'; visorDigit2.classList.remove('active'); }
  if (visorMsg) { visorMsg.textContent = ''; visorMsg.classList.remove('confirmed'); }

  // PASSO 1: primeiro dígito
  setTimeout(() => {
    const t1 = teclado?.querySelector(`.tecla[data-key="${d1}"]`);
    if (t1 && mao && teclado) {
      const rect = t1.getBoundingClientRect();
      const wrapRect = teclado.getBoundingClientRect();
      mao.style.left = (rect.left - wrapRect.left + rect.width / 2 - 14) + 'px';
      mao.style.top = (rect.top - wrapRect.top + rect.height / 2 - 20) + 'px';
      mao.classList.add('ativa', 'hand-click');
      t1.classList.add('pressed');
      playKeySound();
      setTimeout(() => { t1.classList.remove('pressed'); mao.classList.remove('hand-click'); }, 300);
    } else {
      playKeySound();
    }

    // Atualiza visor
    if (visorDigit1) {
      visorDigit1.textContent = d1;
      visorDigit1.classList.add('active');
    }
    if (visorMsg) visorMsg.textContent = 'DIGITANDO...';
  }, 250);

  // PASSO 2: segundo dígito
  setTimeout(() => {
    const t2 = teclado?.querySelector(`.tecla[data-key="${d2}"]`);
    if (t2 && mao && teclado) {
      const rect = t2.getBoundingClientRect();
      const wrapRect = teclado.getBoundingClientRect();
      mao.style.left = (rect.left - wrapRect.left + rect.width / 2 - 14) + 'px';
      mao.style.top = (rect.top - wrapRect.top + rect.height / 2 - 20) + 'px';
      mao.classList.add('ativa', 'hand-click');
      t2.classList.add('pressed');
      playKeySound();
      setTimeout(() => { t2.classList.remove('pressed'); mao.classList.remove('hand-click'); }, 300);
    } else {
      playKeySound();
    }

    // Atualiza visor
    if (visorDigit2) {
      visorDigit2.textContent = d2;
      visorDigit2.classList.add('active');
    }
  }, 850);

  // PASSO 3: CONFIRMA + mostra overlay
  setTimeout(() => {
    const tc = document.getElementById(`confirma-${num}`);
    if (tc && mao && teclado) {
      const rect = tc.getBoundingClientRect();
      const wrapRect = teclado.getBoundingClientRect();
      mao.style.left = (rect.left - wrapRect.left + rect.width / 2 - 14) + 'px';
      mao.style.top = (rect.top - wrapRect.top + rect.height / 2 - 20) + 'px';
      mao.classList.add('ativa', 'hand-click');
      tc.classList.add('pressed');
      playConfirmSound();
      setTimeout(() => tc.classList.remove('pressed'), 400);
    } else {
      playConfirmSound();
    }

    status.textContent = '✓ CONFIRMADO';
    status.classList.add('confirmed');

    // Atualiza visor
    if (visorMsg) {
      visorMsg.textContent = '✓ VOTO CONFIRMADO';
      visorMsg.classList.add('confirmed');
    }
    if (visorDigit1) visorDigit1.classList.remove('active');
    if (visorDigit2) visorDigit2.classList.remove('active');

    // Mostra overlay
    if (overlay) overlay.classList.add('ativa');

    if (urnaEl) {
      urnaEl.style.transition = 'box-shadow 0.2s';
      urnaEl.style.boxShadow = side === 'left'
        ? '0 0 30px #ff3333, inset 0 0 30px rgba(255,51,51,0.5)'
        : '0 0 30px #00bb55, inset 0 0 30px rgba(0,187,85,0.5)';
      setTimeout(() => { urnaEl.style.boxShadow = '0 6px 14px rgba(0,0,0,0.7)'; }, 600);
    }
  }, 1500);

  // PASSO 4: limpa visor
  setTimeout(() => {
    if (mao) mao.classList.remove('ativa', 'hand-click');
    status.textContent = 'AGUARDANDO';
    if (overlay) overlay.classList.remove('ativa');
    if (visorDigit1) { visorDigit1.textContent = '_'; visorDigit1.classList.remove('active'); }
    if (visorDigit2) { visorDigit2.textContent = '_'; visorDigit2.classList.remove('active'); }
    if (visorMsg) { visorMsg.textContent = ''; visorMsg.classList.remove('confirmed'); }
  }, 4500);
}

// ADD PONTOS
function addPoints(side, points, userId, userName) {
  if (state.gameOver || !state.roundActive) return;

  if (side === 'left') state.scoreLeft += points;
  else state.scoreRight += points;

  if (userId) {
    if (!state.leaderboard[side][userId]) {
      state.leaderboard[side][userId] = { name: userName, points: 0 };
    }
    state.leaderboard[side][userId].points += points;
  }

  updateScores();
  updateProgressBar();
  updateLeaderboards();
}

// FIM DE RODADA
function endRound() {
  state.roundActive = false;
  const screen = document.getElementById('round-end-screen');
  const wText = document.getElementById('round-winner-text');
  const wName = document.getElementById('round-winner-name');

  let winner = null;
  if (state.scoreLeft > state.scoreRight) {
    state.winsLeft++;
    winner = 'LULA (13)';
    wText.style.color = '#ff3333';
  } else if (state.scoreRight > state.scoreLeft) {
    state.winsRight++;
    winner = 'FLÁVIO (22)';
    wText.style.color = '#00bb55';
  } else {
    winner = 'EMPATE';
    wText.style.color = '#FFD700';
  }

  wText.textContent = '🏁 FIM DA RODADA!';
  wName.textContent = winner + ' venceu a rodada!';
  wName.style.color = wText.style.color;
  screen.classList.remove('hidden');
  updateWins();

  const rtw = state.config?.settings?.roundsToWin || 3;
  if (state.winsLeft >= rtw || state.winsRight >= rtw) {
    setTimeout(() => { screen.classList.add('hidden'); showMatchEnd(); }, 3000);
    return;
  }

  let cd = 5;
  const cdEl = document.getElementById('next-round-countdown');
  const itv = setInterval(() => {
    cd--;
    if (cdEl) cdEl.textContent = cd;
    if (cd <= 0) {
      clearInterval(itv);
      screen.classList.add('hidden');
      startNewRound();
    }
  }, 1000);
}

function startNewRound() {
  state.scoreLeft = 0;
  state.scoreRight = 0;
  state.currentRound++;
  state.timeLeft = state.config?.settings?.roundDuration || 300;
  state.leaderboard = { left: {}, right: {} };
  state.roundActive = true;
  updateAllUI();
}

function showMatchEnd() {
  const screen = document.getElementById('match-end-screen');
  const wName = document.getElementById('match-winner-name');
  let winner = '';
  if (state.winsLeft > state.winsRight) { winner = 'LULA (13)'; wName.style.color = '#ff3333'; }
  else { winner = 'FLÁVIO (22)'; wName.style.color = '#00bb55'; }
  wName.textContent = `${winner} venceu a disputa!`;
  screen.classList.remove('hidden');
  state.gameOver = true;
}

function resetMatch() {
  state.scoreLeft = 0;
  state.scoreRight = 0;
  state.winsLeft = 0;
  state.winsRight = 0;
  state.currentRound = 1;
  state.timeLeft = state.config?.settings?.roundDuration || 300;
  state.gameOver = false;
  state.roundActive = true;
  state.leaderboard = { left: {}, right: {} };

  document.getElementById('match-end-screen').classList.add('hidden');
  document.getElementById('round-end-screen').classList.add('hidden');

  document.getElementById('overlay-13').classList.remove('ativa');
  document.getElementById('overlay-22').classList.remove('ativa');

  // Reset visores
  ['13', '22'].forEach(n => {
    const st = document.getElementById(`status-${n}`);
    if (st) { st.textContent = 'AGUARDANDO'; st.classList.remove('confirmed'); }
    const d1 = document.getElementById(`digit1-${n}`);
    const d2 = document.getElementById(`digit2-${n}`);
    const msg = document.getElementById(`visor-msg-${n}`);
    if (d1) { d1.textContent = '_'; d1.classList.remove('active'); }
    if (d2) { d2.textContent = '_'; d2.classList.remove('active'); }
    if (msg) { msg.textContent = ''; msg.classList.remove('confirmed'); }
  });

  updateAllUI();
}

// NOTIFICAÇÃO
function showGiftNotification(user, gift) {
  const n = document.getElementById('gift-notification');
  document.getElementById('notif-user').textContent = user;
  document.getElementById('notif-gift').textContent = gift;
  n.classList.remove('hidden');
  n.style.animation = 'none';
  void n.offsetWidth;
  n.style.animation = 'notifPop 0.4s ease-out';
  setTimeout(() => n.classList.add('hidden'), 2500);
}

// CRONÔMETRO
setInterval(() => {
  if (state.gameOver || !state.roundActive) return;
  state.timeLeft--;
  updateTimer();
  if (state.timeLeft <= 0) endRound();
}, 1000);

// WEBSOCKET
let socket = null;
function connectWebSocket() {
  socket = new WebSocket('ws://localhost:8080');
  socket.addEventListener('open', () => console.log('[WS] Conectado'));
  socket.addEventListener('close', () => {
    console.log('[WS] Desconectado. Reconectando...');
    setTimeout(connectWebSocket, 3000);
  });
  socket.addEventListener('message', (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'init') {
        if (data.config && data.config.sides) {
          state.config = data.config;
          state.timeLeft = data.config.settings.roundDuration || 300;
          updateAllUI();
        }
      } else if (data.type === 'gift') {
        handleGiftEvent(data);
      }
    } catch (e) { console.error('[WS] Erro:', e); }
  });
}

function handleGiftEvent(data) {
  const { side, points, nickname, gift } = data;
  const userKey = data.user || nickname || 'anon';

  const now = Date.now();
  const cd = state.config?.settings?.cooldown || 100;
  if (lastGiftTime[userKey] && now - lastGiftTime[userKey] < cd) return;
  lastGiftTime[userKey] = now;

  console.log(`🗳️ ${nickname} votou ${side.toUpperCase()} +${points}`);
  showGiftNotification(nickname, gift);
  animateUrna(side, nickname);
  addPoints(side, points || 1, userKey, nickname);
}

// TOGGLE DO PAINEL DE TESTE (tecla H)
let panelVisible = true;
function toggleTestPanel() {
  panelVisible = !panelVisible;
  const panel = document.getElementById('test-panel');
  if (panel) panel.style.display = panelVisible ? 'flex' : 'none';
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'h' || e.key === 'H') toggleTestPanel();
});

// PAINEL DE TESTE
document.querySelectorAll('#test-panel button[data-side]').forEach(btn => {
  btn.addEventListener('click', () => {
    initAudio();
    const side = btn.dataset.side;
    const action = btn.dataset.action;
    const userKey = 'test_' + Date.now();
    const userName = 'Teste';

    if (action === 'vote') {
      animateUrna(side, userName);
      addPoints(side, 1, userKey, userName);
      showGiftNotification(userName, side === 'left' ? '🌹 Rosa' : '🤍 Rosa Branca');
    } else if (action === 'points') {
      animateUrna(side, userName);
      addPoints(side, 10, userKey, userName);
    }
  });
});

document.getElementById('reset-btn').addEventListener('click', resetMatch);
document.getElementById('restart-match').addEventListener('click', resetMatch);
document.body.addEventListener('click', initAudio, { once: true });

// INICIA
loadConfig();
connectWebSocket();