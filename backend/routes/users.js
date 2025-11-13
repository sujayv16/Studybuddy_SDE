const express = require('express');
const router = express.Router();
const User = require('../user.model');
const geolib = require('geolib');
const multerUpload = require('../multer-config');
const defaultAvatar = require('../default.avatar');
const bcrypt = require('bcrypt');
const { hashPassword, looksHashed } = require('../utils/password');
const logger = require('../logging/logger');
const validateAuth = require('../middlewares/validateAuth');
const validateSignup = require('../middlewares/validateSignup');
const { authRateLimiter } = require('../middlewares/rateLimit');
const cache = require('../middlewares/cache');

// Authentication
router.post(
  '/auth',
  authRateLimiter(),
  validateAuth,
  async (req, res, next) => {
    const { username, password } = req.body;
    const delay = (ms) => new Promise((r) => setTimeout(r, ms));
    const start = Date.now();
    logger.info('auth_attempt', {
      username,
      requestId: req.requestId,
      ip: req.ip,
    });
    try {
      // Prefer checking by username, then comparing password (supports hashed storage)
      let user = await User.findOne({ username }).lean();
      if (!user) {
        await delay(Math.max(0, 250 - (Date.now() - start)));
        logger.warn('auth_fail_user_not_found', {
          username,
          requestId: req.requestId,
          ip: req.ip,
        });
        return res.status(401).send('Invalid username or password');
      }
      const stored = user.password || '';
      if (looksHashed(stored)) {
        const ok = await bcrypt.compare(password, stored).catch(() => false);
        if (!ok) {
          await delay(Math.max(0, 250 - (Date.now() - start)));
          logger.warn('auth_fail_bad_password', {
            username,
            hashed: true,
            requestId: req.requestId,
            ip: req.ip,
          });
          return res.status(401).send('Invalid username or password');
        }
      } else {
        // legacy plaintext (rare)
        if (password !== stored) {
          await delay(Math.max(0, 250 - (Date.now() - start)));
          logger.warn('auth_fail_bad_password', {
            username,
            hashed: false,
            requestId: req.requestId,
            ip: req.ip,
          });
          return res.status(401).send('Invalid username or password');
        }
      }

      // Regenerate session and set user (lean object is stored)
      req.session.regenerate(function (err) {
        if (err) {
          logger.error('auth_session_regenerate_error', {
            username,
            error: err.message,
            requestId: req.requestId,
          });
          return res.status(500).send('Session regeneration failed');
        }
        // store minimal user info in session
        req.session.user = { username: user.username };
        logger.info('auth_login_success', {
          username: user.username,
          requestId: req.requestId,
        });
        res.status(200).send('Login successful');
      });
    } catch (e) {
      logger.error('auth_error', {
        username,
        error: e.message,
        requestId: req.requestId,
      });
      next(e);
    }
  }
);

// Signup
router.post(
  '/signup',
  multerUpload.single('image'),
  validateSignup,
  async (req, res) => {
    const { username, password, university, bio } = req.body;
    let courses = [];
    try {
      courses = Array.isArray(req.body.courses)
        ? req.body.courses
        : JSON.parse(req.body.courses || '[]');
    } catch (e) {
      return res.status(400).json({ message: 'Invalid courses format' });
    }

    let bufferToStore = Buffer.from(defaultAvatar, 'base64');
    if (req.file) {
      bufferToStore = Buffer.from(req.file.buffer);
    }

    let hashed;
    try {
      hashed = await hashPassword(password);
    } catch (e) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    const user = new User({
      username,
      password: hashed,
      university,
      courses,
      bio,
      image: bufferToStore,
      location: { type: 'Point', coordinates: [0, 0] },
    });

    try {
      await user.save();
      req.session.regenerate(function (err) {
        if (err) return res.status(500).send('Session regeneration failed');
        req.session.user = { username: user.username };
        // invalidate caches that may contain this user
        try {
          cache.clearPattern('/users');
          cache.clearPattern('/matches');
          cache.clearKey(`GET:/users/image/${user.username}`);
        } catch (e) {
          /* ignore */
        }
        res.status(200).send('Login successful');
      });
    } catch (err) {
      console.error(err);
      res.status(500).send('Error creating user');
    }
  }
);

// Debug list (admin/dev)
router.get('/debug-all-users', async (req, res) => {
  try {
    const allUsers = await User.find({}, { password: 0, image: 0 })
      .select('username university available courses buddies _id')
      .lean();
    res.json({ total: allUsers.length, users: allUsers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get users (supports pagination + search). Uses text-index when q present.
router.get('/get-users', cache({ ttl: 5000 }), async (req, res) => {
  try {
    const q = (req.query.q || '').toString().trim();
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit || '50', 10), 1),
      200
    );
    const skip = (page - 1) * limit;

    const baseFilter = {};
    if (q) {
      // Use text search for longer queries (better relevance). For short queries
      // (partial username searches) use regex on username/bio/courses for substring matches.
      if (q.length <= 3) {
        const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        baseFilter.$or = [{ username: re }, { bio: re }, { courses: re }];
      } else {
        baseFilter.$text = { $search: q };
      }
    }

    if (!q && !req.query.page && !req.query.limit) {
      const users = await User.find({}, { password: 0, image: 0 }).lean();
      return res.json(users);
    }

    const total = await User.countDocuments(baseFilter);
    const usersQuery = User.find(baseFilter, { password: 0, image: 0 })
      .skip(skip)
      .limit(limit)
      .select('username university courses bio available location')
      .lean();
    if (q) usersQuery.sort({ score: { $meta: 'textScore' } });
    const users = await usersQuery;

    res.json({ users, total, page, limit });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error retrieving users' });
  }
});

router.get('/check-logged-in', async (req, res) => {
  let loggedIn = false;
  let username = '';
  if (req.session.user) {
    loggedIn = true;
    username = req.session.user.username;
  }
  const available = username
    ? await User.findOne({ username }).select('available').lean()
    : null;
  res.json({ loggedIn, username, available });
});

router.get('/logout', (req, res) => {
  let loggedOut = true;
  req.session.destroy(function (err) {
    if (err) loggedOut = false;
    res.json({ loggedOut });
  });
});

// get-users-inoneKm (university filter + optional q). Uses text-index if q present.
router.get('/get-users-inoneKm', cache({ ttl: 5000 }), async (req, res) => {
  try {
    if (!req.session.user)
      return res.status(401).json({ message: 'Not logged in' });
    const username = req.session.user.username;
    const currentUser = await User.findOne({ username }).lean();
    if (!currentUser)
      return res.status(404).json({ message: 'User not found' });

    const universityVariations = [
      currentUser.university,
      (currentUser.university || '').toLowerCase(),
      (currentUser.university || '').toUpperCase(),
    ].filter(Boolean);
    const uni = (currentUser.university || '').toLowerCase();
    if (uni.includes('iit') || uni.includes('jodh') || uni === 'iitj') {
      universityVariations.push(
        'IITJ',
        'IIT Jodhpur',
        'iit jodhpur',
        'IIT JODHPUR',
        'iitj',
        'IIT-Jodhpur',
        'iit-jodhpur',
        'Iit Jodhpur',
        'IIT_Jodhpur'
      );
    }

    const q = (req.query.q || '').toString().trim();
    const baseFilter = {
      username: { $ne: username },
      university: { $in: universityVariations },
    };
    if (q) baseFilter.$text = { $search: q };

    const usersFromSameUniversity = await User.find(baseFilter, {
      image: 0,
      password: 0,
    })
      .select('username location buddies _id university courses bio available')
      .lean();

    res.json({ usersFromSameUniversity, username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// availability update
router.post('/availability', (req, res) => {
  if (!req.session.user) return res.sendStatus(401);
  const username = req.session.user.username;
  const { available } = req.body;
  User.updateOne({ username }, { $set: { available } }).catch((e) =>
    console.error(e)
  );
  try {
    cache.clearPattern('/matches');
    cache.clearPattern('/users');
  } catch (e) {}
  res.sendStatus(200);
});

router.post('/post-loc', (req, res) => {
  if (!req.session.user) return res.sendStatus(401);
  const username = req.session.user.username;
  const { lat, lng } = req.body;
  User.updateOne(
    { username },
    { $set: { location: { type: 'Point', coordinates: [lng, lat] } } }
  ).catch((e) => console.error(e));
  try {
    cache.clearPattern('/matches');
    cache.clearPattern('/users');
  } catch (e) {}
  res.sendStatus(200);
});

router.post('/addreview', async (req, res) => {
  try {
    await Promise.all(
      req.body.map(async (review) => {
        const filter = { username: review.name };
        const update = { $push: { reviews: review.reviews } };
        await User.updateMany(filter, update);
      })
    );
    try {
      cache.clearPattern('/users');
      cache.clearPattern('/matches');
    } catch (e) {}
    res.json({ message: 'Reviews added successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/edit', multerUpload.single('image'), async (req, res) => {
  if (!req.session.user) return res.sendStatus(401);
  const username = req.session.user.username;
  const university = req.body.university;
  let courses = [];
  try {
    courses = Array.isArray(req.body.courses)
      ? req.body.courses
      : JSON.parse(req.body.courses || '[]');
  } catch (e) {
    courses = req.body.courses || [];
  }
  const bio = req.body.bio;
  try {
    if (req.file) {
      const image = Buffer.from(req.file.buffer);
      const user = await User.findOneAndUpdate(
        { username },
        { university, courses, image, bio },
        { new: true }
      ).lean();
      try {
        cache.clearKey(`GET:/users/image/${username}`);
        cache.clearPattern('/users');
        cache.clearPattern('/matches');
      } catch (e) {}
      return res.json(user);
    }
    const user = await User.findOneAndUpdate(
      { username },
      { university, courses, bio },
      { new: true }
    ).lean();
    try {
      cache.clearPattern('/users');
      cache.clearPattern('/matches');
    } catch (e) {}
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/info', async (req, res) => {
  if (!req.session.user) return res.sendStatus(401);
  try {
    const username = req.session.user.username;
    const user = await User.findOne({ username }).select('-password').lean();
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/image/:username', async (req, res) => {
  try {
    const username = req.params.username;
    const user = await User.findOne({ username }).select('image').lean();

    // Helper: detect basic image MIME types by header bytes (no extra dependency)
    function detectMime(buf) {
      if (!buf || buf.length < 4) return 'application/octet-stream';
      // PNG: 89 50 4E 47
      if (
        buf[0] === 0x89 &&
        buf[1] === 0x50 &&
        buf[2] === 0x4e &&
        buf[3] === 0x47
      )
        return 'image/png';
      // JPEG: FF D8 FF
      if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff)
        return 'image/jpeg';
      // GIF: 47 49 46
      if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46)
        return 'image/gif';
      // WEBP (RIFF....WEBP)
      if (
        buf[0] === 0x52 &&
        buf[1] === 0x49 &&
        buf[2] === 0x46 &&
        buf[3] === 0x46
      ) {
        const sub = buf.slice(8, 12).toString('ascii');
        if (sub === 'WEBP') return 'image/webp';
      }
      return 'application/octet-stream';
    }

    // Normalize stored value to a Buffer (handles Buffer, base64 string, or Binary-like)
    let imageBuffer = null;
    if (user && user.image) {
      const raw = user.image;
      if (Buffer.isBuffer(raw)) imageBuffer = raw;
      else if (typeof raw === 'string')
        imageBuffer = Buffer.from(raw, 'base64');
      else if (raw.buffer && Buffer.isBuffer(raw.buffer))
        imageBuffer = Buffer.from(raw.buffer);
      else imageBuffer = Buffer.from(raw);
    } else {
      imageBuffer = Buffer.from(defaultAvatar, 'base64');
    }

    const mime = detectMime(imageBuffer) || 'application/octet-stream';
    // Serve with caching; let Express/compression handle headers safely
    res.set('Cache-Control', 'public, max-age=604800');
    res.set('Content-Type', mime);
    // Use res.send(buffer) so Express sets Content-Length/Transfer-Encoding correctly
    return res.status(200).send(imageBuffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/matchedbuddyinfo', async (req, res) => {
  if (!req.session.user) return res.sendStatus(401);
  try {
    const selfusername = req.session.user.username;
    const user = await User.findOne({ username: selfusername }).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    const viewbuddyusername = user.viewbuddy;
    const buddyinformation = await User.findOne({ username: viewbuddyusername }).lean();
    // Frontend expects an array (data[0]) — return an array for compatibility
    if (!buddyinformation) return res.json([]);
    res.json([buddyinformation]);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: 'Internal Server Error when getting matchedbuddy info' });
  }
});

router.post('/addsinglebuddy', async (req, res) => {
  if (!req.session.user) return res.sendStatus(401);
  try {
    const buddyUsername = req.body.buddyname;
    const selfuser = req.session.user.username;
    const filter = { username: selfuser };
    const update = { viewbuddy: buddyUsername };
    const options = { new: true };
    const updatedUser = await User.findOneAndUpdate(
      filter,
      update,
      options
    ).lean();
    try {
      cache.clearPattern('/matches');
      cache.clearPattern('/users');
    } catch (e) {}
    res.json(updatedUser);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: 'Internal Server Error when adding single buddy' });
  }
});

module.exports = router;
