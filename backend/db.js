require('dotenv').config();
const mongoose = require('mongoose');

// Set strictQuery option to avoid deprecation warning
mongoose.set('strictQuery', false);

// Determine which MongoDB to use
const useLocalMongo = process.env.LOCAL_MONGO === 'true';
const mongoUrl = useLocalMongo ? process.env.MONGO_URL_LOCAL : process.env.MONGO_URL;

if (!mongoUrl) {
  throw new Error('MongoDB URL environment variable is not set');
}

console.log(`🔄 Attempting to connect to ${useLocalMongo ? 'Local MongoDB' : 'MongoDB Atlas'}...`);

// Connection options based on environment
const connectionOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

// Add SSL options only for Atlas connections
if (!useLocalMongo) {
  connectionOptions.ssl = true;
  connectionOptions.tlsAllowInvalidCertificates = true;
  connectionOptions.tlsInsecure = true;
  connectionOptions.serverSelectionTimeoutMS = 30000;
  connectionOptions.connectTimeoutMS = 30000;
}

connectionOptions.socketTimeoutMS = 45000;
connectionOptions.bufferCommands = false;
connectionOptions.bufferMaxEntries = 0;

mongoose.connect(mongoUrl, connectionOptions);

const db = mongoose.connection;
db.on('error', (error) => {
  console.error('❌ MongoDB connection error:', error.message);
  if (error.message.includes('IP')) {
    console.log('💡 Tip: Make sure your IP address is whitelisted in MongoDB Atlas Network Access');
  }
  if (error.message.includes('ECONNREFUSED') && useLocalMongo) {
    console.log('💡 Tip: Make sure MongoDB is running locally on port 27017');
    console.log('   Install: https://www.mongodb.com/docs/manual/installation/');
    console.log('   Or try: mongod --dbpath ./data/db');
  }
});

db.on('disconnected', () => {
  console.log('🔌 Mongoose disconnected from MongoDB');
});

db.once('open', () => {
  console.log(`✅ Connected to ${useLocalMongo ? 'Local MongoDB' : 'MongoDB Atlas'} successfully`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('🔌 MongoDB connection closed through app termination');
  process.exit(0);
});

module.exports = db;

// Handle connection events
db.on('connected', () => {
  console.log('📡 Mongoose connected to MongoDB Atlas');
});

db.on('disconnected', () => {
  console.log('🔌 Mongoose disconnected from MongoDB Atlas');
});

module.exports = db;