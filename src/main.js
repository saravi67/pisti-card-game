// Pişti Game - Main Entry Point for PocketVibe Handheld
import { createHandheld } from './handheld.js';
import { Table3D } from './table3d.js';
import { PistiGame } from './game.js';
import { GAME_MODES, TARGET_SCORES } from './pistiRules.js';

const hh = createHandheld({ clearColor: 0x051008 });
const { input, hud } = hh;

const table3d = new Table3D(hh);
const game = new PistiGame(hh, table3d);

// UI State
let activeModal = 'title'; // 'title', 'roundSummary', 'matchOver', 'rules', null
let titleMenuIndex = 0;
let selectedTargetScoreIdx = 1; // 101 points default
let isRulesFromGame = false;

// Set up HUD DOM Structure
hud.innerHTML = `
  <div class="top-bar">
    <div id="mode-badge" class="badge mode-badge">🎴 TEKLİ (1v1)</div>
    <div id="round-badge" class="badge">Tur: 1</div>
    <div id="score-badge" class="badge score-badge">Biz: 0 · Rakip: 0</div>
    <div id="deck-badge" class="badge deck-badge">Deste: 52</div>
  </div>

  <!-- Opponent Display at Top -->
  <div id="opponent-container" class="opponent-container">
    <div id="opponent-label" class="opponent-label">
      <span id="turn-dot" style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#94a3b8;"></span>
      <span id="opponent-name-text">Ali (Rakip)</span>
    </div>
    <div id="opponent-mini-cards" class="mini-cards-row"></div>
  </div>

  <!-- Table Center Pile Info -->
  <div id="table-center-indicator" class="table-center-indicator">
    <span>Masa:</span>
    <span id="lbl-center-top-card" style="color:#fde047; font-size:14px;">Masa Boş</span>
    <span id="lbl-center-card-count" style="color:#94a3b8; font-size:12px;">(0 Kart)</span>
  </div>

  <!-- Center Celebratory Banner for Pişti -->
  <div id="center-banner" class="center-banner" style="display:none;"></div>

  <!-- Bottom Player Hand (DİK Kartlar) -->
  <div class="bottom-hand-section">
    <div class="action-row">
      <button id="btn-play-card" class="btn-play-card">🎴 KARTI AT (X / Tıkla)</button>
      <div id="hint-indicator" class="controls-hint-badge">◄ ► Seç · X / Tıkla Oyna · Y Kural</div>
    </div>
    <div id="player-hand-row" class="player-hand-row"></div>
  </div>

  <!-- Title Screen Modal -->
  <div id="modal-title" class="modal-overlay">
    <div class="modal-box">
      <div class="modal-title">🃏 PİŞTİ</div>
      <p style="font-size:14px; color:#94a3b8; margin-bottom:12px;">Google Play 4.6★ PocketVibe Handheld Edition</p>
      
      <div class="menu-list">
        <div id="menu-opt-0" class="menu-item selected">
          <span>⚡ Tekli Pişti (1v1)</span>
          <span style="font-size:13px; color:#38bdf8;">Sen vs Ali</span>
        </div>
        <div id="menu-opt-1" class="menu-item">
          <span>👥 Eşli Pişti (2v2)</span>
          <span style="font-size:13px; color:#38bdf8;">Sen & Ayşe vs Ali & Can</span>
        </div>
        <div id="menu-opt-2" class="menu-item">
          <span>🎯 Hedef Puan: <b id="lbl-target-score">101</b></span>
          <span style="font-size:12px; color:#cbd5e1;">◄ ► Değiştir</span>
        </div>
        <div id="menu-opt-3" class="menu-item">
          <span>📖 Kurallar & Puan Tablosu</span>
          <span style="font-size:13px; color:#38bdf8;">Y Tuşu</span>
        </div>
      </div>
      <div class="controls-hint-badge">▲ ▼ Seç · A / Enter Başla · ◄ ► Hedef</div>
    </div>
  </div>

  <!-- Round Summary Modal -->
  <div id="modal-summary" class="modal-overlay" style="display:none;">
    <div class="modal-box">
      <div class="modal-title" style="color:#fde047;">🏆 TUR TAMAMLANDI</div>
      <p id="summary-round-lbl" style="font-size:14px; color:#94a3b8; margin-bottom:8px;">Tur 1 Sonuçları</p>
      
      <table class="score-table">
        <thead>
          <tr>
            <th>Kategori</th>
            <th class="num">Bizim Takım</th>
            <th class="num">Rakip</th>
          </tr>
        </thead>
        <tbody id="summary-table-body"></tbody>
      </table>

      <button id="btn-next-round" class="btn-play-card" style="margin-top:8px;">A Sonraki Tura Başla</button>
    </div>
  </div>

  <!-- Match Over Modal -->
  <div id="modal-gameover" class="modal-overlay" style="display:none;">
    <div class="modal-box">
      <div id="gameover-title" class="modal-title" style="font-size:28px;">TEBRİKLER! KAZANDIN! 👑</div>
      <p id="gameover-desc" style="font-size:15px; color:#cbd5e1; margin:10px 0;">101 Puan Hedefine Ulaşıldı</p>
      <div id="gameover-scores" style="font-size:22px; font-weight:900; color:#fde047; margin-bottom:14px;">105 - 84</div>
      <button id="btn-rematch" class="btn-play-card">A Yeniden Oyna</button>
    </div>
  </div>

  <!-- Rules Modal -->
  <div id="modal-rules" class="modal-overlay" style="display:none;">
    <div class="modal-box" style="max-width:560px;">
      <div class="modal-title">📖 PİŞTİ KURALLARI & PUANLAR</div>
      <div style="font-size:13px; color:#cbd5e1; text-align:left; line-height:1.6; margin:8px 0; max-height:260px; overflow-y:auto; padding-right:8px;">
        <p>• <b>Pişti:</b> Masada tek bir kart varken aynı değerde kart atılırsa <b>+10 Puan</b> kazanılır.</p>
        <p>• <b>Çift Pişti (Vale Piştisi):</b> Masada tek Vale varken Vale atılırsa <b>+20 Puan</b> kazanılır.</p>
        <p>• <b>Vale (J):</b> Jokerdir. Masadaki tüm desteyi toplar.</p>
        <p>• <b>Özel Kart Puanları:</b></p>
        <p style="padding-left:14px;">- Karo 10 (♦10): <b>3 Puan</b></p>
        <p style="padding-left:14px;">- Sinek 2 (♣2): <b>2 Puan</b></p>
        <p style="padding-left:14px;">- Aslar (A): <b>1'er Puan</b></p>
        <p style="padding-left:14px;">- Valeler (J): <b>1'er Puan</b></p>
        <p>• <b>Kart Çoğunluğu:</b> Tur sonunda en çok kartı (27+) toplayan tarafa <b>+3 Puan</b> verilir.</p>
        <p>• <b>Son El:</b> Son turda kalan kartları en son eli alan oyuncu toplar.</p>
      </div>
      <button id="btn-close-rules" class="btn-play-card">B / Kapat</button>
    </div>
  </div>
`;

// References
const modeBadge = document.getElementById('mode-badge');
const roundBadge = document.getElementById('round-badge');
const scoreBadge = document.getElementById('score-badge');
const deckBadge = document.getElementById('deck-badge');
const centerBanner = document.getElementById('center-banner');
const opponentContainer = document.getElementById('opponent-container');
const opponentNameText = document.getElementById('opponent-name-text');
const opponentMiniCards = document.getElementById('opponent-mini-cards');
const turnDot = document.getElementById('turn-dot');
const lblCenterTopCard = document.getElementById('lbl-center-top-card');
const lblCenterCardCount = document.getElementById('lbl-center-card-count');
const playerHandRow = document.getElementById('player-hand-row');
const btnPlayCard = document.getElementById('btn-play-card');

const modalTitle = document.getElementById('modal-title');
const modalSummary = document.getElementById('modal-summary');
const modalGameOver = document.getElementById('modal-gameover');
const modalRules = document.getElementById('modal-rules');
const lblTargetScore = document.getElementById('lbl-target-score');
const summaryTableBody = document.getElementById('summary-table-body');
const summaryRoundLbl = document.getElementById('summary-round-lbl');
const gameoverTitle = document.getElementById('gameover-title');
const gameoverDesc = document.getElementById('gameover-desc');
const gameoverScores = document.getElementById('gameover-scores');

// Click listener on Action button
btnPlayCard.addEventListener('click', () => {
  if (activeModal === null && game.currentTurn === 0) {
    game.playHumanCard();
  }
});

document.getElementById('btn-next-round').addEventListener('click', () => {
  modalSummary.style.display = 'none';
  activeModal = null;
  game.startNewRound();
});

document.getElementById('btn-rematch').addEventListener('click', () => {
  modalGameOver.style.display = 'none';
  activeModal = null;
  game.startNewMatch(game.mode, game.targetScore);
});

document.getElementById('btn-close-rules').addEventListener('click', () => {
  modalRules.style.display = 'none';
  if (isRulesFromGame) {
    activeModal = null;
  } else {
    modalTitle.style.display = 'flex';
    activeModal = 'title';
  }
});

// Direct number keys 1, 2, 3, 4 and Spacebar support
window.addEventListener('keydown', (e) => {
  if (activeModal !== null) return;
  if (['1', '2', '3', '4'].includes(e.key)) {
    const idx = parseInt(e.key, 10) - 1;
    if (idx < game.playerHands[0].length) {
      game.selectCardIndex(idx);
    }
  } else if (e.code === 'Space') {
    game.playHumanCard();
  }
});

// Render Upright Cards in Hand
function renderPlayerUprightHand() {
  playerHandRow.innerHTML = '';
  const hand = game.playerHands[0] || [];

  if (hand.length === 0) {
    playerHandRow.innerHTML = `<div style="color:#94a3b8; font-weight:700; font-size:14px; margin-bottom:20px;">Kartlar dağıtılıyor...</div>`;
    btnPlayCard.style.display = 'none';
    return;
  }

  btnPlayCard.style.display = game.currentTurn === 0 ? 'block' : 'none';

  hand.forEach((card, idx) => {
    const isSelected = idx === game.selectedCardIndex;
    const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
    const suitClass = isRed ? 'suit-red' : 'suit-black';

    const cardDiv = document.createElement('div');
    cardDiv.className = `upright-card ${isSelected ? 'selected' : ''}`;

    let pointBadge = '';
    if (card.pistiPoints > 0) {
      pointBadge = `<span class="card-point-pill">+${card.pistiPoints}p</span>`;
    } else if (card.rank === 'J') {
      pointBadge = `<span class="card-point-pill">JOKER</span>`;
    }

    cardDiv.innerHTML = `
      <div class="card-top">
        <div class="card-rank-col ${suitClass}">
          <span>${card.rank}</span>
          <span class="card-suit-small">${card.symbol}</span>
        </div>
        <span class="card-shortcut-key">${idx + 1}</span>
      </div>
      <div class="card-center ${suitClass}">
        ${card.symbol}
      </div>
      <div class="card-bottom">
        ${pointBadge}
        <div class="card-inverted ${suitClass}">
          <span>${card.rank}</span>
          <span class="card-suit-small">${card.symbol}</span>
        </div>
      </div>
    `;

    // Click on card selects it; clicking already selected plays it
    cardDiv.addEventListener('click', (e) => {
      e.stopPropagation();
      if (game.currentTurn !== 0 || activeModal !== null) return;

      if (game.selectedCardIndex === idx) {
        game.playHumanCard();
      } else {
        game.selectCardIndex(idx);
      }
    });

    playerHandRow.appendChild(cardDiv);
  });
}

// Render Opponent Face-down Hand
function renderOpponentDisplay() {
  const isCoop = game.mode === GAME_MODES.COOP;
  const oppHand = game.playerHands[isCoop ? 2 : 1] || [];
  const isOpponentTurn = game.currentTurn !== 0;

  opponentNameText.textContent = isCoop ? 'Ayşe (Ortak) & Rakipler' : 'Ali (Rakip)';
  opponentContainer.classList.toggle('active-turn', isOpponentTurn);
  turnDot.style.background = isOpponentTurn ? '#38bdf8' : '#22c55e';

  opponentMiniCards.innerHTML = '';
  const count = Math.min(oppHand.length, 4);
  for (let i = 0; i < count; i++) {
    const mini = document.createElement('div');
    mini.className = 'mini-card-back';
    opponentMiniCards.appendChild(mini);
  }
}

// Render Center Table Top Card Indicator
function renderCenterTableInfo() {
  const pile = game.tablePile || [];
  if (pile.length === 0) {
    lblCenterTopCard.textContent = 'Masa Boş';
    lblCenterTopCard.style.color = '#94a3b8';
    lblCenterCardCount.textContent = '(0 Kart)';
  } else {
    const topCard = pile[pile.length - 1];
    lblCenterTopCard.textContent = `${topCard.symbol} ${topCard.name}`;
    const isRed = topCard.suit === 'hearts' || topCard.suit === 'diamonds';
    lblCenterTopCard.style.color = isRed ? '#f87171' : '#fde047';
    lblCenterCardCount.textContent = `(${pile.length} Kart)`;
  }
}

// Full State Refresh
function renderUI() {
  const isCoop = game.mode === GAME_MODES.COOP;
  modeBadge.textContent = isCoop ? '👥 EŞLİ (2v2)' : '🎴 TEKLİ (1v1)';
  roundBadge.textContent = `Tur: ${game.roundNumber} (Hedef: ${game.targetScore})`;
  scoreBadge.textContent = `Biz: ${game.matchScores[0]} · Rakip: ${game.matchScores[1]}`;
  deckBadge.textContent = `Deste: ${game.deck.length} kart`;

  renderPlayerUprightHand();
  renderOpponentDisplay();
  renderCenterTableInfo();

  if (game.bannerText) {
    centerBanner.style.display = 'block';
    centerBanner.textContent = game.bannerText;
  } else {
    centerBanner.style.display = 'none';
  }
}

game.onStateChange = renderUI;

game.onRoundEnd = () => {
  if (game.isMatchOver) {
    showGameOverModal();
  } else {
    showRoundSummaryModal();
  }
};

function updateTitleMenuDisplay() {
  for (let i = 0; i <= 3; i++) {
    const el = document.getElementById(`menu-opt-${i}`);
    if (el) el.classList.toggle('selected', i === titleMenuIndex);
  }
  lblTargetScore.textContent = TARGET_SCORES[selectedTargetScoreIdx];
}

function showRoundSummaryModal() {
  activeModal = 'roundSummary';
  modalSummary.style.display = 'flex';

  const stats = game.lastRoundStats;
  const t0 = stats.team0;
  const t1 = stats.team1;

  summaryRoundLbl.textContent = `Tur ${game.roundNumber - 1} Puan Özeti`;

  summaryTableBody.innerHTML = `
    <tr><td>Normal Pişti (${t0.normalPistis} vs ${t1.normalPistis})</td><td class="num">${t0.normalPistis * 10}</td><td class="num">${t1.normalPistis * 10}</td></tr>
    <tr><td>Çift / Vale Pişti (${t0.jackPistis} vs ${t1.jackPistis})</td><td class="num">${t0.jackPistis * 20}</td><td class="num">${t1.jackPistis * 20}</td></tr>
    <tr><td>Karo 10 (${t0.hasDiamond10 ? 'Var' : '-'} vs ${t1.hasDiamond10 ? 'Var' : '-'})</td><td class="num">${t0.hasDiamond10 ? 3 : 0}</td><td class="num">${t1.hasDiamond10 ? 3 : 0}</td></tr>
    <tr><td>Sinek 2 (${t0.hasClub2 ? 'Var' : '-'} vs ${t1.hasClub2 ? 'Var' : '-'})</td><td class="num">${t0.hasClub2 ? 2 : 0}</td><td class="num">${t1.hasClub2 ? 2 : 0}</td></tr>
    <tr><td>Aslar & Valeler</td><td class="num">${t0.aceCount + t0.jackCount}</td><td class="num">${t1.aceCount + t1.jackCount}</td></tr>
    <tr><td>Kart Sayısı & Çoğunluk (${t0.cardCount} vs ${t1.cardCount})</td><td class="num">${t0.majorityPoints ? '+3' : '0'}</td><td class="num">${t1.majorityPoints ? '+3' : '0'}</td></tr>
    <tr class="total-row"><td>Tur Puanı / Toplam</td><td class="num">+${t0.total} (${game.matchScores[0]})</td><td class="num">+${t1.total} (${game.matchScores[1]})</td></tr>
  `;
}

function showGameOverModal() {
  activeModal = 'matchOver';
  modalGameOver.style.display = 'flex';

  const won = game.matchWinner === 0;
  gameoverTitle.textContent = won ? '🎉 TEBRİKLER! KAZANDIN! 🎉' : 'MAÇI KAYBETTİN! 😔';
  gameoverTitle.style.color = won ? '#4ade80' : '#f87171';
  gameoverDesc.textContent = `${game.targetScore} Puan Barajı Aşıldı (${game.roundNumber} Tur)`;
  gameoverScores.textContent = `Bizim Skor: ${game.matchScores[0]}  —  Rakip Skor: ${game.matchScores[1]}`;
}

// Game Loop
hh.run((delta) => {
  game.update(delta);
  table3d.update(delta);

  // 1. Modals Input Handling
  if (activeModal === 'title') {
    if (input.pressed('UP')) {
      titleMenuIndex = (titleMenuIndex - 1 + 4) % 4;
      updateTitleMenuDisplay();
    } else if (input.pressed('DOWN')) {
      titleMenuIndex = (titleMenuIndex + 1) % 4;
      updateTitleMenuDisplay();
    } else if (input.pressed('LEFT')) {
      if (titleMenuIndex === 2) {
        selectedTargetScoreIdx = (selectedTargetScoreIdx - 1 + TARGET_SCORES.length) % TARGET_SCORES.length;
        updateTitleMenuDisplay();
      }
    } else if (input.pressed('RIGHT')) {
      if (titleMenuIndex === 2) {
        selectedTargetScoreIdx = (selectedTargetScoreIdx + 1) % TARGET_SCORES.length;
        updateTitleMenuDisplay();
      }
    } else if (input.pressed('A') || input.pressed('START')) {
      if (titleMenuIndex === 0) {
        modalTitle.style.display = 'none';
        activeModal = null;
        game.startNewMatch(GAME_MODES.SINGLE, TARGET_SCORES[selectedTargetScoreIdx]);
      } else if (titleMenuIndex === 1) {
        modalTitle.style.display = 'none';
        activeModal = null;
        game.startNewMatch(GAME_MODES.COOP, TARGET_SCORES[selectedTargetScoreIdx]);
      } else if (titleMenuIndex === 2) {
        selectedTargetScoreIdx = (selectedTargetScoreIdx + 1) % TARGET_SCORES.length;
        updateTitleMenuDisplay();
      } else if (titleMenuIndex === 3) {
        modalTitle.style.display = 'none';
        modalRules.style.display = 'flex';
        activeModal = 'rules';
        isRulesFromGame = false;
      }
    } else if (input.pressed('Y')) {
      modalTitle.style.display = 'none';
      modalRules.style.display = 'flex';
      activeModal = 'rules';
      isRulesFromGame = false;
    }
    return;
  }

  if (activeModal === 'roundSummary') {
    if (input.pressed('A') || input.pressed('B') || input.pressed('START')) {
      modalSummary.style.display = 'none';
      activeModal = null;
      game.startNewRound();
    }
    return;
  }

  if (activeModal === 'matchOver') {
    if (input.pressed('A')) {
      modalGameOver.style.display = 'none';
      activeModal = null;
      game.startNewMatch(game.mode, game.targetScore);
    } else if (input.pressed('B') || input.pressed('START')) {
      modalGameOver.style.display = 'none';
      modalTitle.style.display = 'flex';
      activeModal = 'title';
    }
    return;
  }

  if (activeModal === 'rules') {
    if (input.pressed('A') || input.pressed('B') || input.pressed('Y') || input.pressed('START')) {
      modalRules.style.display = 'none';
      if (isRulesFromGame) {
        activeModal = null;
      } else {
        modalTitle.style.display = 'flex';
        activeModal = 'title';
      }
    }
    return;
  }

  // 2. In-Game Handheld Controller Inputs
  if (input.pressed('LEFT')) {
    game.selectNextCard(-1);
  } else if (input.pressed('RIGHT')) {
    game.selectNextCard(1);
  } else if (input.pressed('A')) {
    game.playHumanCard();
  } else if (input.pressed('Y')) {
    modalRules.style.display = 'flex';
    activeModal = 'rules';
    isRulesFromGame = true;
  } else if (input.pressed('START')) {
    modalTitle.style.display = 'flex';
    activeModal = 'title';
  }
});
