/**
 * Compact, self-contained QR Code (Model 2) Generator in pure JavaScript.
 * Zero external dependencies. Generates 2D boolean matrices, SVG strings, and PNG data URLs.
 */

// Galois Field (GF(256)) tables for Reed-Solomon error correction
const GF256_EXP = new Uint8Array(512);
const GF256_LOG = new Uint8Array(256);

(function initGF() {
  let val = 1;
  for (let i = 0; i < 255; i++) {
    GF256_EXP[i] = val;
    GF256_EXP[i + 255] = val;
    GF256_LOG[val] = i;
    val = (val << 1) ^ (val & 0x80 ? 0x11d : 0);
  }
})();

function gfMultiply(a, b) {
  if (a === 0 || b === 0) return 0;
  return GF256_EXP[GF256_LOG[a] + GF256_LOG[b]];
}

function polyMultiply(p1, p2) {
  const result = new Uint8Array(p1.length + p2.length - 1);
  for (let i = 0; i < p1.length; i++) {
    for (let j = 0; j < p2.length; j++) {
      result[i + j] ^= gfMultiply(p1[i], p2[j]);
    }
  }
  return result;
}

function rsGeneratorPoly(degree) {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    poly = polyMultiply(poly, new Uint8Array([1, GF256_EXP[i]]));
  }
  return poly;
}

function rsComputeRemainder(data, numEcBytes) {
  const gen = rsGeneratorPoly(numEcBytes);
  const remainder = new Uint8Array(numEcBytes);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ remainder[0];
    remainder.copyWithin(0, 1);
    remainder[numEcBytes - 1] = 0;
    if (factor !== 0) {
      for (let j = 0; j < numEcBytes; j++) {
        remainder[j] ^= gfMultiply(gen[j + 1], factor);
      }
    }
  }
  return remainder;
}

// Table for versions 1 to 6 (sufficient for URLs up to ~130 chars)
// [version, totalCodewords, ecCodewordsPerBlock, numBlocks]
const VERSION_SPECS = [
  null,
  { version: 1, size: 21, dataCap: 16, ecBytes: 10, align: [] }, // V1-M: 16 data bytes
  { version: 2, size: 25, dataCap: 28, ecBytes: 16, align: [6, 18] }, // V2-M: 28 data bytes
  { version: 3, size: 29, dataCap: 44, ecBytes: 26, align: [6, 22] }, // V3-M: 44 data bytes
  { version: 4, size: 33, dataCap: 64, ecBytes: 36, align: [6, 26] }, // V4-M: 64 data bytes
  { version: 5, size: 37, dataCap: 86, ecBytes: 48, align: [6, 30] }, // V5-M: 86 data bytes
  { version: 6, size: 41, dataCap: 108, ecBytes: 64, align: [6, 34] }, // V6-M: 108 data bytes
];

function selectVersion(dataLength) {
  for (let v = 1; v <= 6; v++) {
    const spec = VERSION_SPECS[v];
    // 4 bits mode + 8 bits count + data
    const needed = dataLength + 2;
    if (needed <= spec.dataCap) return spec;
  }
  return VERSION_SPECS[6];
}

class BitBuffer {
  constructor() {
    this.buffer = [];
    this.length = 0;
  }
  put(val, len) {
    for (let i = 0; i < len; i++) {
      this.buffer.push((val >> (len - 1 - i)) & 1);
      this.length++;
    }
  }
  getBytes() {
    const bytes = new Uint8Array(Math.ceil(this.length / 8));
    for (let i = 0; i < this.length; i++) {
      bytes[i >> 3] |= this.buffer[i] << (7 - (i & 7));
    }
    return bytes;
  }
}

export function encodeQrMatrix(text) {
  const utf8 = new TextEncoder().encode(text);
  const spec = selectVersion(utf8.length);
  const bb = new BitBuffer();

  // Byte mode indicator: 0100
  bb.put(0x4, 4);
  // Character count (8 bits for versions 1-9 in byte mode)
  bb.put(utf8.length, 8);
  for (let i = 0; i < utf8.length; i++) {
    bb.put(utf8[i], 8);
  }

  // Terminator
  const maxBits = spec.dataCap * 8;
  const termLen = Math.min(4, maxBits - bb.length);
  if (termLen > 0) bb.put(0, termLen);

  // Pad to byte boundary
  if (bb.length % 8 !== 0) {
    bb.put(0, 8 - (bb.length % 8));
  }

  // Pad bytes 0xEC, 0x11
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bb.length < maxBits) {
    bb.put(padBytes[padIdx % 2], 8);
    padIdx++;
  }

  const dataBytes = bb.getBytes();
  const ecBytes = rsComputeRemainder(dataBytes, spec.ecBytes);

  // Final codeword stream: data + EC
  const codewords = new Uint8Array(dataBytes.length + ecBytes.length);
  codewords.set(dataBytes, 0);
  codewords.set(ecBytes, dataBytes.length);

  // Initialize matrix: null = unset, 1 = black, 0 = white
  const size = spec.size;
  const matrix = Array.from({ length: size }, () => Array(size).fill(null));
  const isFunction = Array.from({ length: size }, () => Array(size).fill(false));

  function setModule(r, c, val, func = true) {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      matrix[r][c] = val ? 1 : 0;
      if (func) isFunction[r][c] = true;
    }
  }

  // 1. Finder patterns at (0,0), (0, size-7), (size-7, 0)
  const finders = [
    [0, 0],
    [0, size - 7],
    [size - 7, 0],
  ];
  for (const [row, col] of finders) {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        setModule(row + r, col + c, isBorder || isCenter);
      }
    }
    // Separator borders
    for (let i = 0; i < 8; i++) {
      setModule(row - 1, col + i, 0);
      setModule(row + 7, col + i, 0);
      setModule(row + i, col - 1, 0);
      setModule(row + i, col + 7, 0);
    }
  }

  // 2. Timing patterns
  for (let i = 8; i < size - 8; i++) {
    const val = i % 2 === 0;
    if (matrix[6][i] === null) setModule(6, i, val);
    if (matrix[i][6] === null) setModule(i, 6, val);
  }

  // 3. Dark module
  setModule(size - 8, 8, 1);

  // 4. Alignment patterns
  if (spec.align.length > 0) {
    for (const r of spec.align) {
      for (const c of spec.align) {
        if (matrix[r][c] !== null) continue; // Skip if collides with finder
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const isBorder = Math.abs(dr) === 2 || Math.abs(dc) === 2;
            const isCenter = dr === 0 && dc === 0;
            setModule(r + dr, c + dc, isBorder || isCenter);
          }
        }
      }
    }
  }

  // Reserve format information area
  for (let i = 0; i < 9; i++) {
    if (i !== 6) {
      isFunction[8][i] = true;
      isFunction[i][8] = true;
    }
  }
  for (let i = 0; i < 8; i++) {
    isFunction[8][size - 1 - i] = true;
    isFunction[size - 1 - i][8] = true;
  }

  // 5. Place data bits (Mask pattern 0: (row + col) % 2 === 0)
  let bitIdx = 0;
  const totalBits = codewords.length * 8;
  let dir = -1; // moving upwards
  let r = size - 1;
  let c = size - 1;

  while (c > 0) {
    if (c === 6) c--; // Skip vertical timing column
    for (let step = 0; step < size; step++) {
      const row = r + (dir === -1 ? -step : step);
      for (let colOffset = 0; colOffset < 2; colOffset++) {
        const col = c - colOffset;
        if (!isFunction[row][col]) {
          let bit = 0;
          if (bitIdx < totalBits) {
            bit = (codewords[bitIdx >> 3] >> (7 - (bitIdx & 7))) & 1;
            bitIdx++;
          }
          // Apply mask 0: flip if (row + col) % 2 === 0
          const mask = (row + col) % 2 === 0;
          matrix[row][col] = bit ^ (mask ? 1 : 0);
        }
      }
    }
    dir = -dir;
    r = dir === -1 ? size - 1 : 0;
    c -= 2;
  }

  // 6. Write format info (EC Level M = 00, Mask 0 = 000 => 00000, BCH code => 0x4aa5 ^ 0x5412)
  // Precomputed 15-bit format for (EC = M, Mask = 0) with XOR mask 0x5412: 101010000010010
  const formatBits = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0];
  // Around top-left finder
  setModule(8, 0, formatBits[0]);
  setModule(8, 1, formatBits[1]);
  setModule(8, 2, formatBits[2]);
  setModule(8, 3, formatBits[3]);
  setModule(8, 4, formatBits[4]);
  setModule(8, 5, formatBits[5]);
  setModule(8, 7, formatBits[6]);
  setModule(8, 8, formatBits[7]);
  setModule(7, 8, formatBits[8]);
  setModule(5, 8, formatBits[9]);
  setModule(4, 8, formatBits[10]);
  setModule(3, 8, formatBits[11]);
  setModule(2, 8, formatBits[12]);
  setModule(1, 8, formatBits[13]);
  setModule(0, 8, formatBits[14]);

  // Around other finders
  for (let i = 0; i < 7; i++) {
    setModule(size - 1 - i, 8, formatBits[i]);
  }
  for (let i = 0; i < 8; i++) {
    setModule(8, size - 8 + i, formatBits[7 + i]);
  }

  return matrix;
}

/**
 * Returns clean SVG markup string for a given text.
 */
export function generateQrSvg(text, options = {}) {
  const matrix = encodeQrMatrix(text);
  const size = matrix.length;
  const margin = options.margin != null ? options.margin : 2;
  const viewBoxSize = size + margin * 2;
  const darkColor = options.darkColor || "#0f172a";
  const lightColor = options.lightColor || "#ffffff";

  let pathD = "";
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c] === 1) {
        pathD += `M${c + margin},${r + margin}h1v1h-1z `;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}" width="100%" height="100%" shape-rendering="crispEdges">
  <rect width="100%" height="100%" fill="${lightColor}"/>
  <path d="${pathD.trim()}" fill="${darkColor}"/>
</svg>`;
}

/**
 * Returns a data URL (PNG) via an HTML canvas, if available in the execution environment.
 */
export function generateQrDataUrl(text, sizePx = 300) {
  if (typeof document === "undefined") return "";
  const matrix = encodeQrMatrix(text);
  const matrixSize = matrix.length;
  const margin = 2;
  const totalCols = matrixSize + margin * 2;
  const scale = Math.floor(sizePx / totalCols);
  const finalSize = totalCols * scale;

  const canvas = document.createElement("canvas");
  canvas.width = finalSize;
  canvas.height = finalSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, finalSize, finalSize);

  ctx.fillStyle = "#0f172a";
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (matrix[r][c] === 1) {
        ctx.fillRect((c + margin) * scale, (r + margin) * scale, scale, scale);
      }
    }
  }

  return canvas.toDataURL("image/png");
}
