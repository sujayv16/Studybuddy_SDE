const express = require("express");
const router = express.Router();
const User = require("../user.model");
const Match = require("../match.model");

// Retrieve current user's matched buddies
router.get("/buddies", async (req, res, next) => {
  if (!req.session.user) {
    // not logged in
    return res.sendStatus(401);
  }

  // Get current user info
  const currUser = await User.findOne({ username: req.session.user.username });

  // Get list of users that are the current user's buddies
  const buddies = await User.find(
    { username: { $in: currUser.buddies } },
    { password: 0, image: 0 } // hide password
  );

  res.json(buddies);
});

// Get list of users that have sent matches to current user and are not buddies
router.get("/matched", async (req, res, next) => {
  if (!req.session.user) {
    // not logged in
    res.sendStatus(401);
  }
  let username = req.session.user.username;

  // Get all users who matched to current user
  const usersQuery = await Match.find({ userTo: username });
  if (usersQuery.length <= 0) {
    // No one matched with current user
    res.json(null); // return blank json of no users
    return;
  }

  // Get current user's buddies to filter out
  let buddiesQuery = await User.findOne({ username: username });
  let buddies = buddiesQuery.buddies;

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
    { password: 0, image: 0 } // DONT REVEAL PASSWORDS
  );
  res.json(result);
});

// Get a list of people who can match with you
router.get("/candidates", async (req, res, next) => {
  if (!req.session.user) {
    // not logged in
    return res.sendStatus(401);
  }

  // Get user's current details
  const currUser = await User.findOne({ username: req.session.user.username });
  
  console.log('=== MATCH CANDIDATES DEBUG ===');
  console.log('Current user:', currUser.username);
  console.log('Current user university:', currUser.university);
  console.log('Current user buddies:', currUser.buddies);

  // Get list of users that current user has sent match requests to
  const matchesSent = await Match.find({ userSent: currUser.username });
  console.log('Matches sent by user:', matchesSent.length);

  // Add users that user has already sent requests to to filter
  const filterOut = currUser.buddies;
  matchesSent.forEach((match) => {
    filterOut.push(match.userTo);
  });
  
  console.log('Users to filter out:', filterOut);

  // Handle university variations for IIT Jodhpur
  const universityVariations = [
    currUser.university,
    currUser.university.toLowerCase(),
    currUser.university.toUpperCase(),
  ];
  
  // Add specific IIT Jodhpur variations - handle both directions
  const uni = currUser.university.toLowerCase();
  if (uni.includes('iit') || uni.includes('jodh') || uni === 'iitj') {
    universityVariations.push(
      'IITJ', 'IIT Jodhpur', 'iit jodhpur', 'IIT JODHPUR', 'iitj',
      'IIT-Jodhpur', 'iit-jodhpur', 'Iit Jodhpur', 'IIT_Jodhpur'
    );
  }
  
  console.log('University variations to match:', universityVariations);

  // Get list of users that match based on similar fields from same university
  const candidates = await User.find(
    {
      username: { $nin: filterOut, $ne: currUser.username },
      university: { $in: universityVariations }, // Match any university variation
      // available: true, // Remove this requirement - show all users from same university
    },
    { password: 0, image: 0 }
  );
  
  console.log('Found candidates:', candidates.length);
  console.log('Candidates:', candidates.map(u => ({ username: u.username, university: u.university })));
  console.log('=== END DEBUG ===');

  res.json(candidates);
});

// Matches a user to another user
router.post("/match", async (req, res, next) => {
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
router.delete("/unmatch", async (req, res, next) => {
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
