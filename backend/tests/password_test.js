// Simple runnable smoke test for backend/utils/password.js
// Run with: node tests/password_test.js

const assert = require('assert');
const {
  hashPassword,
  verifyPassword,
  looksHashed,
} = require('../utils/password');

(async function run() {
  console.log('Running password util smoke test...');
  const plain = 'S3cureP@ssw0rd!';
  const hashed = await hashPassword(plain);
  console.log(
    '  hashed length:',
    typeof hashed === 'string' ? hashed.length : 'n/a'
  );
  assert.strictEqual(
    looksHashed(hashed),
    true,
    'hashed should look like a bcrypt hash'
  );

  const ok = await verifyPassword(plain, hashed);
  assert.strictEqual(
    ok,
    true,
    'verifyPassword should return true for correct password'
  );

  const bad = await verifyPassword('wrong', hashed);
  assert.strictEqual(
    bad,
    false,
    'verifyPassword should return false for wrong password'
  );

  console.log('Password util smoke test: OK');
  process.exit(0);
})().catch((err) => {
  console.error('Password util smoke test: FAILED');
  console.error(err && err.stack ? err.stack : err);
  process.exit(2);
});
