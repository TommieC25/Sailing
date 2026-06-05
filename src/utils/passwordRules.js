export const PASSWORD_MIN_LENGTH = 12;

const UPPERCASE = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijkmnopqrstuvwxyz';
const DIGITS = '23456789';
const SYMBOLS = '!@#$%&*?';
const ALL_PASSWORD_CHARS = `${UPPERCASE}${LOWERCASE}${DIGITS}${SYMBOLS}`;

const randomChar = (chars) => {
  const bytes = new Uint8Array(1);
  window.crypto.getRandomValues(bytes);
  return chars[bytes[0] % chars.length];
};

const shuffleSecure = (chars) => {
  const result = [...chars];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const bytes = new Uint8Array(1);
    window.crypto.getRandomValues(bytes);
    const j = bytes[0] % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result.join('');
};

export const generateStrongPassword = () => {
  const requiredChars = [
    randomChar(UPPERCASE),
    randomChar(LOWERCASE),
    randomChar(DIGITS),
    randomChar(SYMBOLS),
  ];

  const remaining = Array.from({ length: 14 }, () => randomChar(ALL_PASSWORD_CHARS));
  return shuffleSecure([...requiredChars, ...remaining]);
};

export const getPasswordValidationMessage = (password) => {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must include at least one uppercase letter';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must include at least one lowercase letter';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must include at least one number';
  }
  if (!/[!@#$%&*?]/.test(password)) {
    return 'Password must include at least one symbol';
  }
  return '';
};

export const friendlyPasswordError = (err) => {
  const message = err?.message || '';
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('password')) {
    if (lowerMessage.includes('weak') || lowerMessage.includes('strength')) {
      return 'That password is too weak. Use the Generate Strong Password button, or choose at least 12 characters with uppercase, lowercase, a number, and a symbol.';
    }
    if (lowerMessage.includes('should be at least') || lowerMessage.includes('at least')) {
      return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
    }
  }

  return '';
};
