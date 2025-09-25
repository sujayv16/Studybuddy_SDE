require('dotenv').config();
var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var session = require("express-session");
var morgan = require("morgan");
const cors = require("cors");
const { connectWithFallback } = require("./db-fallback"); // Import the improved database connection
const MongoStore = require("connect-mongo");
const requestId = require('./middlewares/requestId');
const helmet = require('helmet');
const client = require('prom-client');
const logger = require('./logging/logger');

// Get MongoDB URL based on environment
const mongoMode = process.env.MONGO_MODE || 'atlas';
let mongokey;

if (mongoMode !== 'none') {
  const useLocalMongo = mongoMode === 'local';
  mongokey = useLocalMongo ? process.env.MONGO_URL_LOCAL : process.env.MONGO_URL;

  if(!mongokey){
    console.warn("⚠️ No MongoDB URL provided in environment variables");
    console.log("💡 Set MONGO_MODE=none to skip database connection, or provide MONGO_URL/MONGO_URL_LOCAL");
    mongokey = "mongodb://localhost:27017/studdybuddy"; // fallback
  }
} else {
  mongokey = "mongodb://localhost:27017/studdybuddy"; // placeholder for session store
}

const mongoStore = MongoStore.create({
  mongoUrl: mongokey,
  ttl: 60 * 60 * 24 * 7, // 1 week
  touchAfter: 24 * 3600, // lazy session update
  autoRemove: 'native', // Default
});

var app = express();
var io = require("./io");
app.use(requestId);
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(
  session({
    name: "session",
    secret: process.env.SESSION_SECRET || "customer",
    resave: false,
    maxAge: 60 * 60 * 24 * 7,
    store: mongoStore,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    }
  })
);

var usersRouter = require("./routes/users");
var matchRouter = require("./routes/match");
var chatRouter = require("./routes/chat");
var schedulingRouter = require("./routes/scheduling");

// view engine setup
app.use(cors({ origin: true, credentials: true }));
//make images folder public for everyone
app.use("/Images", express.static("Images"));
morgan.token('rid', (req) => req.requestId || '-');
app.use(morgan(':method :url :status :res[content-length] - :response-time ms rid=:rid'));
// Prometheus metrics setup
client.collectDefaultMetrics();
const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.05, 0.1, 0.2, 0.5, 1, 2, 5]
});

app.use((req, res, next) => {
  const end = httpDuration.startTimer();
  res.on('finish', () => {
    const route = req.route && req.route.path ? req.route.path : req.path;
    end({ method: req.method, route, status_code: res.statusCode });
  });
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
const healthRouter = require('./routes/health');
app.use('/', healthRouter);
// metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  } catch (e) {
    logger.error('metrics_error', { error: e.message, requestId: req.requestId });
    res.status(500).send('metrics error');
  }
});
app.use("/users", usersRouter);
app.use("/matches", matchRouter);
app.use("/chats", chatRouter);
app.use("/scheduling", schedulingRouter);
var options = {
  dotfiles: "ignore",
  extensions: ["htm", "html", "json"],
};

app.use("/", express.static(path.join(__dirname, "build"), options));

app.get("/*", async function (req, res) {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

//server from the react build folder

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
});

// Socket.io modules
require("./sockets/chatSocket")(io); // this should now have database access?
require("./sockets/meet-upSocket")(io);

module.exports = app;
