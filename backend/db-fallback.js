require('dotenv').config();
const mongoose = require('mongoose');

// Set strictQuery option to avoid deprecation warning
mongoose.set('strictQuery', false);

// MongoDB connection with fallback options
const connectWithFallback = async () => {
  const useLocalMongo = process.env.LOCAL_MONGO === 'true';
  const primaryUrl = useLocalMongo ? process.env.MONGO_URL_LOCAL : process.env.MONGO_URL;
  const fallbackUrl = useLocalMongo ? process.env.MONGO_URL : process.env.MONGO_URL_LOCAL;

  if (!primaryUrl) {
    throw new Error('MongoDB URL environment variable is not set');
  }

  console.log(`🔄 Attempting to connect to ${useLocalMongo ? 'Local MongoDB' : 'MongoDB Atlas'}...`);

  // Primary connection options
  const getPrimaryOptions = () => {
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      socketTimeoutMS: 45000,
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000, // Shorter timeout for faster fallback
    };

    if (!useLocalMongo) {
      // MongoDB Atlas SSL options
      options.ssl = true;
      options.connectTimeoutMS = 10000;
      // Don't use both tlsInsecure and tlsAllowInvalidCertificates together
      options.tls = true;
    }

    return options;
  };

  // Fallback connection options
  const getFallbackOptions = () => {
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      socketTimeoutMS: 45000,
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
    };

    if (useLocalMongo) {
      // MongoDB Atlas SSL options for fallback
      options.ssl = true;
      options.connectTimeoutMS = 10000;
      options.tls = true;
    }

    return options;
  };

  try {
    await mongoose.connect(primaryUrl, getPrimaryOptions());
    console.log(`✅ Connected to ${useLocalMongo ? 'Local MongoDB' : 'MongoDB Atlas'} successfully`);
    return true;
  } catch (error) {
    console.warn(`⚠️ Failed to connect to primary database: ${error.message}`);
    
    if (fallbackUrl) {
      console.log(`🔄 Attempting to connect to ${useLocalMongo ? 'MongoDB Atlas' : 'Local MongoDB'} as fallback...`);
      try {
        await mongoose.connect(fallbackUrl, getFallbackOptions());
        console.log(`✅ Connected to fallback ${useLocalMongo ? 'MongoDB Atlas' : 'Local MongoDB'} successfully`);
        return true;
      } catch (fallbackError) {
        console.error(`❌ Failed to connect to fallback database: ${fallbackError.message}`);
      }
    }

    // If both connections fail, provide helpful error messages
    console.error('❌ Could not connect to any database. Please check:');
    if (!useLocalMongo) {
      console.log('  💡 MongoDB Atlas issues:');
      console.log('     - Check your IP address is whitelisted in Network Access');
      console.log('     - Verify your username and password are correct');
      console.log('     - Try setting LOCAL_MONGO=true in .env to use local MongoDB');
    } else {
      console.log('  💡 Local MongoDB issues:');
      console.log('     - Make sure MongoDB is running on localhost:27017');
      console.log('     - Try: "C:\\Program Files\\MongoDB\\Server\\8.2\\bin\\mongod.exe" --dbpath C:\\data\\db');
      console.log('     - Or set LOCAL_MONGO=false in .env to use MongoDB Atlas');
    }

    throw error;
  }
};

// Connection event handlers
mongoose.connection.on('error', (error) => {
  console.error('❌ MongoDB connection error:', error.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('🔌 Mongoose disconnected from MongoDB');
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 Mongoose reconnected to MongoDB');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('🔌 MongoDB connection closed through app termination');
  process.exit(0);
});

module.exports = { connectWithFallback };