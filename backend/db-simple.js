require('dotenv').config();
const mongoose = require('mongoose');

// Set strictQuery option to avoid deprecation warning
mongoose.set('strictQuery', false);

// Simple MongoDB connection with minimal options
const connectDB = async () => {
  try {
    const mongoMode = process.env.MONGO_MODE || 'atlas';
    
    // Skip database connection if mode is 'none'
    if (mongoMode === 'none') {
      console.log('🔄 Skipping database connection (MONGO_MODE=none)');
      console.log('💡 Set MONGO_MODE to "local" or "atlas" to enable database connection');
      return true; // Return true to continue server startup
    }

    const useLocalMongo = mongoMode === 'local';
    const mongoUrl = useLocalMongo ? process.env.MONGO_URL_LOCAL : process.env.MONGO_URL;

    if (!mongoUrl) {
      throw new Error('MongoDB URL environment variable is not set');
    }

    console.log(`🔄 Connecting to ${useLocalMongo ? 'Local MongoDB' : 'MongoDB Atlas'}...`);

    // Simplified connection options
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    };

    await mongoose.connect(mongoUrl, options);
    console.log(`✅ Connected to ${useLocalMongo ? 'Local MongoDB' : 'MongoDB Atlas'} successfully`);
    
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    
    // Provide helpful error messages
    if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 Local MongoDB is not running. Try:');
      console.log('   1. Start MongoDB service: net start MongoDB (as administrator)');
      console.log('   2. Or run: "C:\\Program Files\\MongoDB\\Server\\8.2\\bin\\mongod.exe" --dbpath C:\\data\\db');
      console.log('   3. Or set MONGO_MODE=none in .env to skip database connection');
    } else if (error.message.includes('IP') || error.message.includes('authentication') || error.message.includes('SSL')) {
      console.log('💡 MongoDB Atlas connection issues:');
      console.log('   1. Check IP whitelist in MongoDB Atlas Network Access');
      console.log('   2. Verify username/password in connection string');
      console.log('   3. SSL/TLS version compatibility issues with your system');
      console.log('   4. Set MONGO_MODE=none in .env to skip database connection for testing');
    }
    
    return false;
  }
};

// Connection event handlers
mongoose.connection.on('error', (error) => {
  console.error('❌ MongoDB runtime error:', error.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('🔌 Disconnected from MongoDB');
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 Reconnected to MongoDB');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('🔌 MongoDB connection closed due to app termination');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await mongoose.connection.close();
  console.log('🔌 MongoDB connection closed due to app termination');
  process.exit(0);
});

module.exports = { connectDB };