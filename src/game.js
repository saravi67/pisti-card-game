// Pişti Game - Core State Machine & Round Logic
import * as THREE from 'three';
import { createDeck, shuffleDeck } from './cards.js';
import { PistiAI } from './ai.js';
import { evaluateCardPlay, calculateRoundScore, GAME_MODES } from './pistiRules.js';
import { sound } from './sound.js';

export const SEAT_POSITIONS = {
  0: new THREE.Vector3(0, 0.1, 3.2),   // South (Sen)
  1: new THREE.Vector3(-3.8, 0.1, -0.2), // West (Ali)
  2: new THREE.Vector3(0, 0.1, -3.6),  // North (Ayşe / Rakip Ali)
  3: new THREE.Vector3(3.8, 0.1, -0.2),  // East (Can)
};

export class PistiGame {
  constructor(hh, table3d) {
    this.hh = hh;
    this.table3d = table3d;

    // Game Mode & Settings
    this.mode = GAME_MODES.SINGLE; // 'single' or 'coop'
    this.targetScore = 101;        // 51, 101, 151
    this.gameSpeed = 'normal';     // 'fast' or 'normal'

    // Match Cumulative Scores
    this.matchScores = [0, 0]; // [Sen/Bizim Takım, Rakip/Rakip Takım]
    this.roundNumber = 1;
    this.isMatchOver = false;
    this.matchWinner = null;

    // Round State
    this.deck = [];
    this.tablePile = [];         // Cards currently in the center pile
    this.playerHands = [[], [], [], []];
    this.capturedCards = [[], [], [], []]; // Captured cards per player
    this.pistis = [{ normal: 0, jack: 0 }, { normal: 0, jack: 0 }]; // [Team 0, Team 1]
    this.lastCapturePlayer = null; // Who took the last trick

    // Turn & Interaction
    this.currentTurn = 0;        // Player index whose turn it is
    this.selectedCardIndex = 0;  // Selected card for human player (index 0)
    this.dealStep = 0;           // Current deal cycle
    this.maxDealSteps = 6;       // 6 for 1v1, 3 for 2v2
    this.isBusy = false;         // Animation / delay lock
    this.bannerText = '';
    this.bannerTimer = 0;

    // Callbacks
    this.onStateChange = null;
    this.onRoundEnd = null;

    // AI Bots
    this.bots = [
      null, // Player 0 is human
      new PistiAI(1, 'Ali', 'smart'),
      new PistiAI(2, 'Ayşe', 'smart'),
      new PistiAI(3, 'Can', 'smart'),
    ];
  }

  getPlayerCount() {
    return this.mode === GAME_MODES.COOP ? 4 : 2;
  }

  getTeamIndex(playerIdx) {
    if (this.mode === GAME_MODES.SINGLE) {
      return playerIdx === 0 ? 0 : 1;
    }
    return playerIdx % 2;
  }

  startNewMatch(mode = GAME_MODES.SINGLE, targetScore = 101) {
    this.mode = mode;
    this.targetScore = targetScore;
    this.matchScores = [0, 0];
    this.roundNumber = 1;
    this.isMatchOver = false;
    this.matchWinner = null;
    this.maxDealSteps = this.mode === GAME_MODES.COOP ? 3 : 6;

    this.startNewRound();
  }

  startNewRound() {
    this.table3d.clearAllCards();
    this.deck = shuffleDeck(createDeck());
    this.tablePile = [];
    this.playerHands = [[], [], [], []];
    this.capturedCards = [[], [], [], []];
    this.pistis = [{ normal: 0, jack: 0 }, { normal: 0, jack: 0 }];
    this.lastCapturePlayer = null;
    this.dealStep = 0;
    this.selectedCardIndex = 0;
    this.isBusy = true;

    this.bots.forEach((bot) => bot?.reset());

    // 1. Initial 4 Cards to Table (3 down, 1 up)
    const initialCards = this.deck.splice(0, 4);

    // Official Rule: If 4th open card is a Jack, swap with non-Jack in deck
    if (initialCards[3].rank === 'J') {
      const nonJackIdx = this.deck.findIndex((c) => c.rank !== 'J');
      if (nonJackIdx !== -1) {
        const temp = initialCards[3];
        initialCards[3] = this.deck[nonJackIdx];
        this.deck[nonJackIdx] = temp;
      }
    }

    this.tablePile = [...initialCards];
    this.bots.forEach((b) => b?.observeCard(initialCards[3]));

    sound.playDeal();
    this.table3d.dealInitialPile(initialCards, () => {
      // 2. Deal first 4 cards to each player
      this.dealHandsToPlayers(() => {
        this.currentTurn = 0; // Human leads first
        this.isBusy = false;
        this.notifyState();
      });
    });

    this.notifyState();
  }

  dealHandsToPlayers(onComplete) {
    const pCount = this.getPlayerCount();
    const cardsPerPlayer = 4;

    for (let p = 0; p < pCount; p++) {
      const dealt = this.deck.splice(0, cardsPerPlayer);
      this.playerHands[p] = dealt;
    }

    this.dealStep++;
    this.selectedCardIndex = 0;
    sound.playDeal();

    this.notifyState();
    if (onComplete) onComplete();
  }

  selectNextCard(delta) {
    const hand = this.playerHands[0];
    if (!hand || hand.length === 0) return;

    this.selectedCardIndex = (this.selectedCardIndex + delta + hand.length) % hand.length;
    sound.playSelect();
    this.notifyState();
  }

  selectCardIndex(idx) {
    const hand = this.playerHands[0];
    if (!hand || idx < 0 || idx >= hand.length) return;

    this.selectedCardIndex = idx;
    sound.playSelect();
    this.notifyState();
  }

  playHumanCard() {
    if (this.isBusy || this.currentTurn !== 0 || this.isMatchOver) return;

    const hand = this.playerHands[0];
    if (!hand || hand.length === 0) return;

    const card = hand.splice(this.selectedCardIndex, 1)[0];
    if (this.selectedCardIndex >= hand.length) {
      this.selectedCardIndex = Math.max(0, hand.length - 1);
    }

    this.notifyState();
    this.executeCardPlay(0, card);
  }

  executeCardPlay(playerIndex, card) {
    this.isBusy = true;
    this.notifyState();

    this.bots.forEach((b) => b?.observeCard(card));

    let startPos = SEAT_POSITIONS[playerIndex];
    if (this.mode === GAME_MODES.SINGLE && playerIndex === 1) {
      startPos = SEAT_POSITIONS[2]; // Opponent in 1v1 sits across (North)
    }

    const evalResult = evaluateCardPlay(card, this.tablePile);

    this.table3d.animateCardToCenter(card, startPos, this.tablePile.length, () => {
      this.tablePile.push(card);

      if (evalResult.captured) {
        this.handleCapture(playerIndex, card, evalResult);
      } else {
        sound.playCardPlay();
        this.advanceTurn();
      }
    });
  }

  handleCapture(playerIndex, card, evalResult) {
    const teamIdx = this.getTeamIndex(playerIndex);
    this.lastCapturePlayer = playerIndex;

    const isPisti = evalResult.isPisti;
    const isJackPisti = evalResult.isJackPisti;

    if (isPisti) {
      if (isJackPisti) {
        this.pistis[teamIdx].jack++;
        sound.playDoublePisti();
        this.showBanner(teamIdx === 0 ? '💥 ÇİFT PİŞTİ! (+20)' : '⚠️ RAKİPTEN ÇİFT PİŞTİ! (+20)', 1.8);
      } else {
        this.pistis[teamIdx].normal++;
        sound.playPisti();
        this.showBanner(teamIdx === 0 ? '✨ PİŞTİ! (+10)' : '⚠️ RAKİP PİŞTİ YAPTI! (+10)', 1.5);
      }
    } else {
      sound.playCollect();
    }

    const pileToStash = [...this.tablePile];
    this.tablePile = [];
    this.capturedCards[playerIndex].push(...pileToStash);

    let targetPos = SEAT_POSITIONS[playerIndex];
    if (this.mode === GAME_MODES.SINGLE && playerIndex === 1) {
      targetPos = SEAT_POSITIONS[2];
    }

    const sweepDelay = isPisti ? 500 : 150;
    setTimeout(() => {
      this.table3d.animateCollectPile(targetPos, () => {
        this.advanceTurn();
      });
    }, sweepDelay);
  }

  showBanner(msg, duration = 1.2) {
    this.bannerText = msg;
    this.bannerTimer = duration;
    this.notifyState();
  }

  advanceTurn() {
    const pCount = this.getPlayerCount();
    this.currentTurn = (this.currentTurn + 1) % pCount;

    // Check if current hand round is finished (all 4 cards played by each player)
    const allHandsEmpty = this.playerHands.slice(0, pCount).every((h) => h.length === 0);

    if (allHandsEmpty) {
      if (this.deck.length > 0) {
        // Next 4-card deal cycle
        setTimeout(() => {
          this.dealHandsToPlayers(() => {
            this.isBusy = false;
            this.notifyState();
            this.checkBotTurn();
          });
        }, 400);
      } else {
        // Round Finished! All 52 cards played
        this.finishRound();
      }
    } else {
      this.isBusy = false;
      this.notifyState();
      this.checkBotTurn();
    }
  }

  checkBotTurn() {
    if (this.currentTurn !== 0 && !this.isBusy && !this.isMatchOver) {
      this.isBusy = true;
      const bot = this.bots[this.currentTurn];
      const botHand = this.playerHands[this.currentTurn];

      const delay = this.gameSpeed === 'fast' ? 300 : 650;
      setTimeout(() => {
        const chosenCard = bot.chooseCard(botHand, this.tablePile, {
          isCoop: this.mode === GAME_MODES.COOP,
          partnerIndex: (this.currentTurn + 2) % 4,
          lastCapturePlayer: this.lastCapturePlayer,
        });

        const idx = botHand.indexOf(chosenCard);
        if (idx !== -1) botHand.splice(idx, 1);

        this.notifyState();
        this.executeCardPlay(this.currentTurn, chosenCard);
      }, delay);
    }
  }

  finishRound() {
    this.isBusy = true;

    // Last player to capture sweeps remaining cards in pile
    if (this.tablePile.length > 0 && this.lastCapturePlayer !== null) {
      const remaining = [...this.tablePile];
      this.tablePile = [];
      this.capturedCards[this.lastCapturePlayer].push(...remaining);

      let targetPos = SEAT_POSITIONS[this.lastCapturePlayer];
      if (this.mode === GAME_MODES.SINGLE && this.lastCapturePlayer === 1) {
        targetPos = SEAT_POSITIONS[2];
      }
      this.table3d.animateCollectPile(targetPos);
    }

    let team0Cards = [];
    let team1Cards = [];

    if (this.mode === GAME_MODES.SINGLE) {
      team0Cards = this.capturedCards[0];
      team1Cards = this.capturedCards[1];
    } else {
      team0Cards = [...this.capturedCards[0], ...this.capturedCards[2]];
      team1Cards = [...this.capturedCards[1], ...this.capturedCards[3]];
    }

    const team0Majority = team0Cards.length > 26;
    const team1Majority = team1Cards.length > 26;

    const roundScore0 = calculateRoundScore(
      team0Cards,
      this.pistis[0].normal,
      this.pistis[0].jack,
      team0Majority
    );

    const roundScore1 = calculateRoundScore(
      team1Cards,
      this.pistis[1].normal,
      this.pistis[1].jack,
      team1Majority
    );

    this.lastRoundStats = {
      team0: roundScore0,
      team1: roundScore1,
    };

    this.matchScores[0] += roundScore0.total;
    this.matchScores[1] += roundScore1.total;

    const target = this.targetScore;
    const team0Won = this.matchScores[0] >= target;
    const team1Won = this.matchScores[1] >= target;

    if (team0Won || team1Won) {
      this.isMatchOver = true;
      if (this.matchScores[0] > this.matchScores[1]) {
        this.matchWinner = 0;
        sound.playWin();
      } else if (this.matchScores[1] > this.matchScores[0]) {
        this.matchWinner = 1;
        sound.playLose();
      } else {
        this.isMatchOver = false;
        this.roundNumber++;
      }
    } else {
      this.roundNumber++;
    }

    this.notifyState();
    if (this.onRoundEnd) {
      this.onRoundEnd();
    }
  }

  notifyState() {
    if (this.onStateChange) {
      this.onStateChange();
    }
  }

  update(dt) {
    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) {
        this.bannerText = '';
        this.notifyState();
      }
    }
  }
}
