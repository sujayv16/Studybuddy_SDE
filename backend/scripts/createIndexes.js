// Run this once (or at startup) to ensure recommended indexes exist
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../user.model');
const Match = require('../match.model');

// Small helper to inspect which indexes would be created from schemas
function listPlannedIndexes() {
  console.log('\nPlanned User schema indexes:');
  try {
    const uidx = User.schema.indexes();
    if (uidx && uidx.length)
      uidx.forEach((i) => console.log(' -', JSON.stringify(i)));
    else console.log(' - (none)');
  } catch (e) {
    console.log(' - could not enumerate User indexes', e.message);
  }
  console.log('\nPlanned Match collection indexes:');
  console.log(' - { userSent: 1 }');
  console.log(' - { userTo: 1 }');
}

// Prefer explicit env vars; if none provided assume a local MongoDB for developer convenience
let envUseLocal = process.env.LOCAL_MONGO === 'true';
let envLocalUrl = process.env.MONGO_URL_LOCAL;
let envRemoteUrl = process.env.MONGO_URL;
const defaultLocal = 'mongodb://127.0.0.1:27017/studdybuddy';
let useLocal = false;
let mongoUrl;
if (envUseLocal) {
  // explicit request to use local
  mongoUrl = envLocalUrl || defaultLocal;
  useLocal = true;
} else if (envRemoteUrl) {
  mongoUrl = envRemoteUrl;
  useLocal = false;
} else if (envLocalUrl) {
  mongoUrl = envLocalUrl;
  useLocal = true;
} else {
  // default to local for developer convenience
  mongoUrl = defaultLocal;
  useLocal = true;
}

// parse simple CLI flags
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const skipOnFail =
  process.env.SKIP_INDEXES_ON_FAIL === 'true' ||
  args.includes('--skip-on-fail');

(async function () {
  try {
    if (dryRun) {
      console.log(
        'Dry-run mode: listing planned indexes without connecting to DB.'
      );
      listPlannedIndexes();
      process.exit(0);
    }

    console.log('Connecting to', mongoUrl, '...');
    // short timeout so failures are fast and informative
    await mongoose.connect(mongoUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });
    console.log('Connected to DB for index creation');
    // Ensure indexes defined on schemas are created
    await User.syncIndexes();
    console.log('User indexes synced');
    // Match schema simple indexes
    await Match.collection.createIndex({ userSent: 1 });
    await Match.collection.createIndex({ userTo: 1 });
    console.log('Match indexes ensured');
    process.exit(0);
  } catch (e) {
    console.error('\nError creating indexes:', e && e.message ? e.message : e);
    console.error('\nCommon causes:');
    console.error(
      ' - Using MongoDB Atlas: your current IP may not be whitelisted. Add your IP in the Atlas Network Access settings.'
    );
    console.error(' - MONGO_URL may be incorrect or missing credentials.');
    console.error('\nWhat you can do:');
    console.error(
      ' - For local testing, set LOCAL_MONGO=true and MONGO_URL_LOCAL to your local MongoDB connection string and re-run.'
    );
    console.error(
      ' - Or run this script in dry-run mode to see planned indexes: node scripts/createIndexes.js --dry-run'
    );
    if (skipOnFail) {
      console.log(
        '\nSKIP_INDEXES_ON_FAIL=true set; skipping failure and exiting 0.'
      );
      process.exit(0);
    }
    process.exit(2);
  }
})();
