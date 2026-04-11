const PRICE_FORMATTER = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
});

const PRICE_INPUT_PATTERN = /^\d{0,3}([.,]\d{0,2})?$/;

export const MAX_REALISTIC_PRICE_EUR = 100;
export const MAX_REALISTIC_PRICE_INPUT = 99.99;
export const PRICE_VALIDATION_MESSAGE = 'Bitte gib einen realistischen Supermarkt-Preis ein (max. 100€).';
export const PRICE_DECIMAL_MESSAGE = 'Bitte gib maximal 2 Nachkommastellen ein.';

export const normalizePriceInput = (value = '') => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(',', '.').trim();
};

export const isPriceInputFormatAllowed = (value = '') => {
  const normalizedValue = normalizePriceInput(value);
  return normalizedValue === '' || PRICE_INPUT_PATTERN.test(normalizedValue);
};

export const parsePriceValue = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value * 100) / 100;
  }

  if (typeof value === 'string') {
    const normalizedValue = normalizePriceInput(value);

    if (!normalizedValue) {
      return null;
    }

    const parsedValue = Number.parseFloat(normalizedValue);
    return Number.isFinite(parsedValue) ? Math.round(parsedValue * 100) / 100 : null;
  }

  return null;
};

export const isDisplayablePrice = (value) => {
  const parsedValue = parsePriceValue(value);
  return parsedValue !== null && parsedValue > 0;
};

export const formatPriceDisplay = (value, fallback = 'Preis folgt.') => {
  const parsedValue = parsePriceValue(value);

  if (parsedValue === null || parsedValue <= 0) {
    return fallback;
  }

  return PRICE_FORMATTER.format(parsedValue);
};

export const validateRealisticPrice = (value, { allowEmpty = true } = {}) => {
  const isEmptyValue = value === '' || value === null || typeof value === 'undefined';

  if (isEmptyValue && allowEmpty) {
    return {
      isValid: true,
      parsed: null,
      message: '',
    };
  }

  const parsedValue = parsePriceValue(value);

  if (parsedValue === null || parsedValue <= 0 || parsedValue >= MAX_REALISTIC_PRICE_EUR) {
    return {
      isValid: false,
      parsed: null,
      message: PRICE_VALIDATION_MESSAGE,
    };
  }

  return {
    isValid: true,
    parsed: parsedValue,
    message: '',
  };
};