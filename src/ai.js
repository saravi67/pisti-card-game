// Pişti Game - Advanced Artificial Intelligence Engine
// Modeled after the 4.6★ Google Play offline Pişti experience

export class PistiAI {
  constructor(playerIndex, name, difficulty = 'smart') {
    this.playerIndex = playerIndex;
    this.name = name;
    this.difficulty = difficulty; // 'easy', 'medium', 'smart'
    this.seenCards = new Set();   // Tracks all cards played/revealed so far
    this.rankCounts = new Map();  // How many times each rank has been seen
  }

  reset() {
    this.seenCards.clear();
    this.rankCounts.clear();
  }

  observeCard(card) {
    if (!card) return;
    this.seenCards.add(card.id);
    const count = this.rankCounts.get(card.rank) || 0;
    this.rankCounts.set(card.rank, count + 1);
  }

  /**
   * Selects the best card to play from the AI's current hand
   * @param {Array} hand - Array of card objects currently held
   * @param {Array} tablePile - Array of cards currently in the center pile
   * @param {Object} context - Game context (isCoop, partnerIndex, lastCapturePlayer)
   * @returns {Object} Selected card
   */
  chooseCard(hand, tablePile, context = {}) {
    if (hand.length === 1) return hand[0];

    const hasTable = tablePile && tablePile.length > 0;
    const topCard = hasTable ? tablePile[tablePile.length - 1] : null;

    // Helper to calculate total value of the current pile
    const pilePoints = hasTable
      ? tablePile.reduce((sum, c) => sum + (c.pistiPoints || 0), 0)
      : 0;
    const pileSize = hasTable ? tablePile.length : 0;

    // 1. Direct Match Check (Capturing the pile or scoring Pişti)
    if (topCard) {
      const matchCard = hand.find((c) => c.rank === topCard.rank);
      if (matchCard) {
        // Always take the pile with matching rank!
        return matchCard;
      }
    }

    // 2. Wild Jack (Vale) Strategy
    const jacks = hand.filter((c) => c.rank === 'J');
    const nonJacks = hand.filter((c) => c.rank !== 'J');

    if (hasTable && jacks.length > 0) {
      // Should we use a Jack?
      // - If pile has good points (>= 2)
      // - Or pile is large (>= 4 cards)
      // - Or we only have Jacks left in hand
      const isJuicyPile = pilePoints >= 2 || pileSize >= 4;
      if (isJuicyPile || nonJacks.length === 0) {
        return jacks[0];
      }
    }

    // 3. Safe Discard Strategy (When leading to empty table or cannot capture)
    // Avoid throwing high-point cards: ♦10 (+3), ♣2 (+2), A (+1), J (+1)
    const getCardDangerScore = (c) => {
      let danger = 0;
      if (c.rank === '10' && c.suit === 'diamonds') danger += 50;
      if (c.rank === '2' && c.suit === 'clubs') danger += 40;
      if (c.rank === 'A') danger += 30;
      if (c.rank === 'J') danger += 45; // Jacks are sacred

      // If empty table, check how many cards of this rank are already out.
      // If 3 cards of rank '7' have been played already, then throwing the 4th '7'
      // is 100% SAFE because no one else can possibly have a '7' to make a Pişti!
      const seenCount = this.rankCounts.get(c.rank) || 0;
      // Also count cards in AI's own hand
      const inHandCount = hand.filter((h) => h.rank === c.rank).length;
      const accountedFor = seenCount + inHandCount;

      if (accountedFor === 4) {
        // Completely dead rank for opponents! Best safe card.
        danger -= 25;
      } else if (accountedFor === 3) {
        danger -= 15;
      } else if (accountedFor === 1) {
        // Risky: 3 other cards of this rank could be in opponent's hand
        danger += 10;
      }

      return danger;
    };

    // Filter cards to avoid wasting Jacks if we have other options
    const candidates = nonJacks.length > 0 ? nonJacks : hand;

    // Sort by safest (lowest danger score)
    const sorted = [...candidates].sort((a, b) => getCardDangerScore(a) - getCardDangerScore(b));

    return sorted[0];
  }
}
