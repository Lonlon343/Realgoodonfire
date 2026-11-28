// EAN-13 helpers for the demo video: check digit and the 95 bar modules.
// Demo products use the GS1 prefix 20 (in-store numbers), so no demo barcode
// belongs to a real product.

const L_CODES = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const G_CODES = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'];
const R_CODES = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100'];
const PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];

export const ean13CheckDigit = (first12) => {
  if (!/^\d{12}$/.test(first12)) {
    throw new Error(`EAN-13 needs 12 digits before the check digit, got "${first12}"`);
  }

  const sum = Array.from(first12).reduce(
    (total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3),
    0
  );
  return String((10 - (sum % 10)) % 10);
};

export const ean13 = (first12) => `${first12}${ean13CheckDigit(first12)}`;

// Returns the 95 modules as a string of '1' (bar) and '0' (space).
export const ean13Modules = (code) => {
  if (!/^\d{13}$/.test(code) || ean13CheckDigit(code.slice(0, 12)) !== code[12]) {
    throw new Error(`Invalid EAN-13: ${code}`);
  }

  const digits = Array.from(code, Number);
  const parity = PARITY[digits[0]];
  const left = digits.slice(1, 7)
    .map((digit, index) => (parity[index] === 'L' ? L_CODES : G_CODES)[digit])
    .join('');
  const right = digits.slice(7).map((digit) => R_CODES[digit]).join('');

  return `101${left}01010${right}101`;
};

// Guard bars (start, centre, end) are drawn longer than the data bars.
export const isGuardModule = (index) => index < 3 || (index >= 45 && index < 50) || index >= 92;
