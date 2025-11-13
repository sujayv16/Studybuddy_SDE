const express = require('express');
const router = express.Router();
const User = require('../user.model');
const Match = require('../match.model');
const cache = require('../middlewares/cache');

// Retrieve current user's matched buddies
router.get('/buddies', cache({ ttl: 30000 }), async (req, res, next) => {
  if (!req.session.user) {
    // not logged in
    return res.sendStatus(401);
  }

  // Get current user info
  const currUser = await User.findOne({
    username: req.session.user.username,
  }).lean();
  if (!currUser) return res.sendStatus(401);
  // Support search and pagination for large buddy lists. If no query params
  // provided, return the full array (backwards compatible). If any of q/page/limit
  // are present, return a paginated object { buddies, total, page, limit }.
  const q = (req.query.q || '').toString().trim();
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const limit = Math.min(
    Math.max(parseInt(req.query.limit || '20', 10), 1),
    100
  );
  const fetchAll = req.query.fetchAll === 'true';

  // If no pagination/search params and not explicitly asking for paginated, return full list
  const hasParams = q || req.query.page || req.query.limit || req.query.course;
  if (!hasParams && !req.query.fetchAll) {
    const buddies = await User.find(
      { username: { $in: currUser.buddies } },
      { password: 0, image: 0 }
    )
      .select('username university courses bio available')
      .lean();
    return res.json(buddies);
  }

  // Build base filter from buddy usernames
  const baseFilter = { username: { $in: currUser.buddies } };
  if (q) {
    // For short queries (partial username) use regex fallback for substring matches.
    if (q.length <= 3) {
      const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      baseFilter.$or = [{ username: re }, { bio: re }, { courses: re }];
    } else {
      // Use text index search when available for better performance at scale.
      // This requires a text index on username/bio/courses (defined in user.model.js).
      baseFilter.$text = { $search: q };
    }
  }

  try {
    if (fetchAll) {
      const bs = await User.find(baseFilter, { password: 0, image: 0 })
        .select('username university courses bio available')
        .sort(q ? { score: { $meta: 'textScore' } } : {})
        .lean();
      return res.json(bs);
    }

    const skip = (page - 1) * limit;
    const total = await User.countDocuments(baseFilter);
    const buddies = await User.find(baseFilter, { password: 0, image: 0 })
      .skip(skip)
      .limit(limit)
      .select('username university courses bio available')
      .sort(q ? { score: { $meta: 'textScore' } } : {})
      .lean();

    res.json({ buddies, total, page, limit });
  } catch (err) {
    console.error('Error querying buddies', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get list of users that have sent matches to current user and are not buddies
router.get('/matched', async (req, res, next) => {
  if (!req.session.user) {
    // not logged in
    res.sendStatus(401);
  }
  let username = req.session.user.username;

  // Get all users who matched to current user
  const usersQuery = await Match.find({ userTo: username }).lean();
  if (usersQuery.length <= 0) {
    // No one matched with current user
    res.json(null); // return blank json of no users
    return;
  }

  // Get current user's buddies to filter out
  let buddiesQuery = await User.findOne({ username: username })
    .select('buddies')
    .lean();
  let buddies = (buddiesQuery && buddiesQuery.buddies) || [];

  // Filter out users we are already buddies with
  let matchedUsers = [];
  usersQuery.forEach((match) => {
    if (!buddies.includes(match.userSent)) {
      matchedUsers.push(match.userSent);
    }
  });

  // Retrieve profile details of users
  let result = await User.find(
    { username: { $in: matchedUsers } },
    { password: 0, image: 0 }
  )
    .select('username university courses bio available')
    .lean();
  res.json(result);
});

// Get a list of people who can match with you
router.get('/candidates', cache({ ttl: 5000 }), async (req, res, next) => {
  if (!req.session.user) {
    // not logged in
    return res.sendStatus(401);
  }

  // Get user's current details
  const currUser = await User.findOne({
    username: req.session.user.username,
  }).lean();
  if (!currUser) return res.sendStatus(401);
  // Build filter to exclude current user's buddies and prior matches
  const matchesSent = await Match.find({ userSent: currUser.username }).lean();
    // Prepare baseline filterOut from currUser.buddies; we'll append matches below
    let filterOut = Array.isArray(currUser.buddies) ? [...currUser.buddies] : [];
  matchesSent.forEach((m) => {
    if (m.userTo) filterOut.push(m.userTo);
  });

  // Build university variations to match common case differences
  const universityVariations = [
    currUser.university,
    currUser.university && currUser.university.toLowerCase(),
    currUser.university && currUser.university.toUpperCase(),
  ].filter(Boolean);
  const uni = (currUser.university || '').toLowerCase();
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

  // Allow basic search and pagination via query params
  const q = (req.query.q || '').toString().trim();
  const course = (req.query.course || '').toString().trim();
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const limit = Math.min(
    Math.max(parseInt(req.query.limit || '20', 10), 1),
    100
  );
  const skip = (page - 1) * limit;

  // Base filter: same university and not in filterOut
  const baseFilter = {
    username: { $nin: filterOut, $ne: currUser.username },
    university: { $in: universityVariations },
  };

  // Add course filter if provided
  if (course) {
    baseFilter.courses = course;
  }

  // If a search query is provided, match username, bio, or courses
  if (q) {
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    baseFilter.$or = [{ username: re }, { bio: re }, { courses: re }];
  }

  try {
    const total = await User.countDocuments(baseFilter);
    const candidates = await User.find(baseFilter, { password: 0, image: 0 })
      .skip(skip)
      .limit(limit)
      .select('username university courses bio available buddies')
      .lean();

    res.json({ candidates, total, page, limit });
  } catch (err) {
    console.error('Error querying candidates', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Matches a user to another user
router.post('/match', async (req, res, next) => {
  if (!req.session.user) {
    // not logged in
    res.sendStatus(401);
    return;
  }
  const matchUsername = req.body.username;
  const currUsername = req.session.user.username;

  // Check if user has already matched with this user
  const matchedAlreadyQuery = await Match.find({
    userSent: currUsername,
    userTo: matchUsername,
  });
  if (matchedAlreadyQuery.length > 0) {
    res.sendStatus(400); // already matched error
    return;
  }

  // If not, match the users together!
  let match = new Match({
    userSent: currUsername,
    userTo: matchUsername,
  });
  try {
    await match.save();
  } catch (e) {
    console.log(e.message);
    res.sendStatus(500); // server error
    return;
  }

  // If other person has matched as well, add to buddies
  let otherUserMatched = await Match.find({
    userSent: matchUsername,
    userTo: currUsername,
  });
  if (otherUserMatched.length > 0) {
    // Add to each other's buddies lists
    await User.updateOne(
      { username: currUsername },
      { $push: { buddies: matchUsername } }
    ).catch((e) => {
      console.log(e);
      res.sendStatus(500); // server error
      return;
    });
    await User.updateOne(
      { username: matchUsername },
      { $push: { buddies: currUsername } }
    ).catch((e) => {
      console.log(e);
      res.sendStatus(500); // server error
      return;
    });
  }

  res.sendStatus(200); // everything went well
});

// Deletes a match between two users
router.delete('/unmatch', async (req, res, next) => {
  if (!req.session.user) {
    // not logged in
    res.sendStatus(401);
    return;
  }
  const deleteUsername = req.body.username;
  const currUsername = req.session.user.username;

  // Get current user info
  const currUser = await User.findOne({ username: req.session.user.username });

  // Delete from buddies if they are a buddy
  if (currUser.buddies.includes(deleteUsername)) {
    // Remove from each other's buddies lists
    await User.updateOne(
      { username: currUsername },
      { $pull: { buddies: deleteUsername } }
    ).catch((e) => {
      console.log(e);
      res.sendStatus(500); // server error
      return;
    });
    await User.updateOne(
      { username: deleteUsername },
      { $pull: { buddies: currUsername } }
    ).catch((e) => {
      console.log(e);
      res.sendStatus(500); // server error
      return;
    });
  }

  // Remove match records
  await Match.deleteOne({
    userSent: currUsername,
    userTo: deleteUsername,
  }).catch((e) => {
    console.log(e);
    res.sendStatus(500);
    return;
  });
  await Match.deleteOne({
    userSent: deleteUsername,
    userTo: currUsername,
  }).catch((e) => {
    console.log(e);
    res.sendStatus(500);
    return;
  });

  res.sendStatus(200); // all good!
});

module.exports = router;
