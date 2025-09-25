const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10; // good balance for dev/prod

async function hashPassword(plain) {
  if (!plain || typeof plain !== 'string') throw new Error('Invalid password');
  return bcrypt.hash(plain, SALT_ROUNDS);
}

async function verifyPassword(plain, hash) {
  if (!plain || !hash) return false;
  try {
    return await bcrypt.compare(plain, hash);
  } catch (_e) {
    return false;
  }
}

function looksHashed(str) {
  return typeof str === 'string' && /^\$2[aby]\$/.test(str);
}

module.exports = { hashPassword, verifyPassword, looksHashed };
