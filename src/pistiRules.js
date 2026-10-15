// Pişti Game - Official Rules, Scoring and Match Mechanics

export const GAME_MODES = {
  SINGLE: 'single', // 1v1 Tekli (Sen vs Bot)
  COOP: 'coop',     // 2v2 Eşli (Sen & Kuzey vs Doğu & Batı)
};

export const TARGET_SCORES = [51, 101, 151];

export const SCORING_RULES = {
  PISTI_NORMAL: 10,       // Normal Pişti: 10 Puan
  PISTI_JACK: 20,         // Vale ile Pişti (Çift Pişti): 20 Puan
  DIAMOND_10: 3,          // Karo 10: 3 Puan
  CLUB_2: 2,              // Sinek 2: 2 Puan
  ACE: 1,                 // Aslar: 1'er Puan (Toplam 4)
  JACK: 1,                // Valeler: 1'er Puan (Toplam 4)
  CARD_MAJORITY: 3,       // Kart Çoğunluğu (27+ kart): 3 Puan
};

/**
 * Evaluates points for a collected pile of cards
 * @param {Array} cards - All captured cards in the round
 * @param {number} normalPistis - Count of regular pistis
 * @param {number} jackPistis - Count of jack pistis
 * @param {boolean} hasMajority - Whether this player/team has card majority (>26)
 */
export function calculateRoundScore(cards, normalPistis = 0, jackPistis = 0, hasMajority = false) {
  let cardPoints = 0;
  let aceCount = 0;
  let jackCount = 0;
  let hasDiamond10 = false;
  let hasClub2 = false;

  for (const c of cards) {
    if (c.rank === '10' && c.suit === 'diamonds') {
      cardPoints += SCORING_RULES.DIAMOND_10;
      hasDiamond10 = true;
    } else if (c.rank === '2' && c.suit === 'clubs') {
      cardPoints += SCORING_RULES.CLUB_2;
      hasClub2 = true;
    } else if (c.rank === 'A') {
      cardPoints += SCORING_RULES.ACE;
      aceCount++;
    } else if (c.rank === 'J') {
      cardPoints += SCORING_RULES.JACK;
      jackCount++;
    }
  }

  const majorityPoints = hasMajority ? SCORING_RULES.CARD_MAJORITY : 0;
  const pistiPoints = (normalPistis * SCORING_RULES.PISTI_NORMAL) + (jackPistis * SCORING_RULES.PISTI_JACK);
  const total = cardPoints + majorityPoints + pistiPoints;

  return {
    total,
    cardPoints,
    majorityPoints,
    pistiPoints,
    normalPistis,
    jackPistis,
    cardCount: cards.length,
    aceCount,
    jackCount,
    hasDiamond10,
    hasClub2,
  };
}

/**
 * Checks if playing `playedCard` captures the pile
 * @param {Object} playedCard 
 * @param {Array} tablePile 
 * @returns {{ captured: boolean, isPisti: boolean, isJackPisti: boolean }}
 */
export function evaluateCardPlay(playedCard, tablePile) {
  if (!tablePile || tablePile.length === 0) {
    return { captured: false, isPisti: false, isJackPisti: false };
  }

  const topCard = tablePile[tablePile.length - 1];

  // Jack captures any pile!
  if (playedCard.rank === 'J') {
    // If the pile had exactly 1 card and it was also a Jack -> Çift Pişti (20 pts)
    if (tablePile.length === 1 && topCard.rank === 'J') {
      return { captured: true, isPisti: true, isJackPisti: true };
    }
    // If pile had 1 card but top was not Jack -> not a pisti, just normal Jack capture
    return { captured: true, isPisti: false, isJackPisti: false };
  }

  // Matching rank captures the pile
  if (playedCard.rank === topCard.rank) {
    // If exactly 1 card was on the table -> PİŞTİ! (10 pts)
    if (tablePile.length === 1) {
      return { captured: true, isPisti: true, isJackPisti: false };
    }
    return { captured: true, isPisti: false, isJackPisti: false };
  }

  return { captured: false, isPisti: false, isJackPisti: false };
}
