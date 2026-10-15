// Pişti Card Game - Card Engine and Canvas Texture Atlas
import * as THREE from 'three';

export const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
export const SUIT_SYMBOLS = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};
export const SUIT_NAMES_TR = {
  spades: 'Maça',
  hearts: 'Kupa',
  diamonds: 'Karo',
  clubs: 'Sinek',
};
export const SUIT_COLORS = {
  spades: '#1e293b',
  hearts: '#e11d48',
  diamonds: '#e11d48',
  clubs: '#1e293b',
};

export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const RANK_NAMES_TR = {
  'A': 'As', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7',
  '8': '8', '9': '9', '10': '10', 'J': 'Vale', 'Q': 'Kız', 'K': 'Papaz'
};

// Turkish Pişti Point values for specific cards
export function getCardPistiPoints(suit, rank) {
  if (rank === '10' && suit === 'diamonds') return 3; // Karo 10 = 3 puan
  if (rank === '2' && suit === 'clubs') return 2;      // Sinek 2 = 2 puan
  if (rank === 'A') return 1;                          // Aslar = 1 puan
  if (rank === 'J') return 1;                          // Valeler = 1 puan
  return 0;                                            // Diğer tüm kartlar = 0 puan
}

export function createDeck() {
  const deck = [];
  let id = 0;
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      const pistiPoints = getCardPistiPoints(suit, rank);
      deck.push({
        id: id++,
        suit,
        rank,
        pistiPoints,
        name: `${SUIT_NAMES_TR[suit]} ${RANK_NAMES_TR[rank]}`,
        symbol: SUIT_SYMBOLS[suit],
        color: SUIT_COLORS[suit],
      });
    }
  }
  return deck;
}

export function shuffleDeck(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Generate Card Texture Atlas (53 tiles: 52 cards + 1 back)
// Grid: 8 columns x 7 rows = 56 slots. Each card tile is 128x180 px.
export function createCardAtlas() {
  const tileW = 128;
  const tileH = 180;
  const cols = 8;
  const rows = 7;

  const canvas = document.createElement('canvas');
  canvas.width = cols * tileW;
  canvas.height = rows * tileH;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let tileIndex = 0;

  for (const suit of SUITS) {
    for (const rank of RANKS) {
      const col = tileIndex % cols;
      const row = Math.floor(tileIndex / cols);
      const x = col * tileW;
      const y = row * tileH;

      drawCardFace(ctx, x, y, tileW, tileH, suit, rank);
      tileIndex++;
    }
  }

  // Draw Card Back at index 52
  const backCol = 52 % cols;
  const backRow = Math.floor(52 / cols);
  drawCardBack(ctx, backCol * tileW, backRow * tileH, tileW, tileH);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  return { texture, cols, rows, tileW, tileH };
}

function drawCardFace(ctx, x, y, w, h, suit, rank) {
  const radius = 9;
  const pad = 2;
  const cx = x + pad;
  const cy = y + pad;
  const cw = w - pad * 2;
  const ch = h - pad * 2;

  // Background white card body with smooth rounded corners
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(cx, cy, cw, ch, radius);
  ctx.fillStyle = '#f8fafc';
  ctx.fill();

  // Thin card border
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#cbd5e1';
  ctx.stroke();

  // Highlight special Pişti point cards with subtle golden corner dots
  const isSpecial = (rank === '10' && suit === 'diamonds') || (rank === '2' && suit === 'clubs') || rank === 'A' || rank === 'J';
  if (isSpecial) {
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx + 4, cy + 4, cw - 8, ch - 8);
  }

  const color = SUIT_COLORS[suit];
  const symbol = SUIT_SYMBOLS[suit];

  // Top Left Rank & Symbol
  ctx.fillStyle = color;
  ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(rank, cx + 8, cy + 8);

  ctx.font = '18px serif';
  ctx.fillText(symbol, cx + 9, cy + 32);

  // Bottom Right (Inverted)
  ctx.save();
  ctx.translate(cx + cw - 8, cy + ch - 8);
  ctx.rotate(Math.PI);
  ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
  ctx.fillText(rank, 0, 0);
  ctx.font = '18px serif';
  ctx.fillText(symbol, 1, 24);
  ctx.restore();

  // Center Art
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (['J', 'Q', 'K'].includes(rank)) {
    // Face card frame
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx + 24, cy + 38, cw - 48, ch - 76);

    ctx.font = 'bold 36px serif';
    ctx.fillText(rank, cx + cw / 2, cy + ch / 2 - 8);
    ctx.font = '24px serif';
    ctx.fillText(symbol, cx + cw / 2, cy + ch / 2 + 24);
  } else if (rank === 'A') {
    ctx.font = '54px serif';
    ctx.fillText(symbol, cx + cw / 2, cy + ch / 2);
  } else {
    // Number card center symbol
    ctx.font = '40px serif';
    ctx.fillText(symbol, cx + cw / 2, cy + ch / 2);
  }

  // Small indicator badge for points (e.g. "+3p" on ♦10)
  const pts = getCardPistiPoints(suit, rank);
  if (pts > 0) {
    ctx.fillStyle = '#b45309';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillText(`+${pts}p`, cx + cw / 2, cy + ch - 18);
  }

  ctx.restore();
}

function drawCardBack(ctx, x, y, w, h) {
  const radius = 9;
  const pad = 2;
  const cx = x + pad;
  const cy = y + pad;
  const cw = w - pad * 2;
  const ch = h - pad * 2;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(cx, cy, cw, ch, radius);
  ctx.fillStyle = '#1e3a8a'; // Deep Navy Blue Back
  ctx.fill();

  ctx.lineWidth = 3;
  ctx.strokeStyle = '#f8fafc';
  ctx.stroke();

  // Elegant inner gold trim
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(cx + 6, cy + 6, cw - 12, ch - 12);

  // Geometric Diamond Pattern
  ctx.fillStyle = '#2563eb';
  const step = 14;
  for (let px = cx + 10; px < cx + cw - 10; px += step) {
    for (let py = cy + 10; py < cy + ch - 10; py += step) {
      ctx.beginPath();
      ctx.moveTo(px, py - 4);
      ctx.lineTo(px + 4, py);
      ctx.lineTo(px, py + 4);
      ctx.lineTo(px - 4, py);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Center emblem
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(cx + cw / 2, cy + ch / 2, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#1e3a8a';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('P', cx + cw / 2, cy + ch / 2);

  ctx.restore();
}

export function getCardUVs(suit, rank, cols = 8, rows = 7) {
  let index = 52; // Default to card back
  if (suit && rank) {
    const sIdx = SUITS.indexOf(suit);
    const rIdx = RANKS.indexOf(rank);
    if (sIdx !== -1 && rIdx !== -1) {
      index = sIdx * 13 + rIdx;
    }
  }

  const col = index % cols;
  const row = Math.floor(index / cols);

  const u0 = col / cols;
  const u1 = (col + 1) / cols;
  // Three.js UV origin is bottom-left, canvas origin is top-left
  const v1 = 1 - row / rows;
  const v0 = 1 - (row + 1) / rows;

  return [
    u0, v1, // Top-Left
    u1, v1, // Top-Right
    u0, v0, // Bottom-Left
    u1, v0, // Bottom-Right
  ];
}
