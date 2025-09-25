const express = require("express");
const router = express.Router();
const User = require("../user.model");
const geolib = require("geolib");
const multerUpload = require("../multer-config");
const defaultAvatar = require("../default.avatar");
const bcrypt = require('bcrypt');
const { hashPassword, looksHashed } = require('../utils/password');
const logger = require('../logging/logger');
const validateAuth = require('../middlewares/validateAuth');
const validateSignup = require('../middlewares/validateSignup');
const { authRateLimiter } = require('../middlewares/rateLimit');
// const multer = require("multer");
// const multer = require('multer');
// const upload = multer({dest: 'Images/'})

router.post("/auth", authRateLimiter(), validateAuth, async function (req, res, next) {
  const { username, password } = req.body;

  // small constant-time-ish delay to make brute-force a bit harder (200-400ms)
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));
  const start = Date.now();
  logger.info("auth_attempt", { username, requestId: req.requestId, ip: req.ip });

  try {
    // First: legacy plaintext match path (for truly legacy records)
    let user = await User.findOne({ username: username, password: password });
    if (!user) {
      // Then: hashed path
      const byUsername = await User.findOne({ username: username });
      if (!byUsername) {
        await delay(Math.max(0, 250 - (Date.now() - start)));
        logger.warn("auth_fail_user_not_found", { username, requestId: req.requestId, ip: req.ip });
        return res.status(401).send("Invalid username or password");
      }
      const stored = byUsername.password || '';
      if (looksHashed(stored)) {
        const ok = await bcrypt.compare(password, stored).catch(() => false);
        if (!ok) {
          await delay(Math.max(0, 250 - (Date.now() - start)));
          logger.warn("auth_fail_bad_password", { username, hashed: true, requestId: req.requestId, ip: req.ip });
          return res.status(401).send("Invalid username or password");
        }
        user = byUsername;
        logger.info("auth_success_hashed", { username, requestId: req.requestId, ip: req.ip });
      } else {
        await delay(Math.max(0, 250 - (Date.now() - start)));
        logger.warn("auth_fail_bad_password", { username, hashed: false, requestId: req.requestId, ip: req.ip });
        return res.status(401).send("Invalid username or password");
      }
    } else {
      // Legacy plaintext matched: auto-upgrade to bcrypt hash asynchronously
      if (!looksHashed(user.password)) {
        try {
          const newHash = await hashPassword(password);
          await User.updateOne({ _id: user._id }, { $set: { password: newHash } });
          logger.info("auth_upgrade_password_hash", { username, requestId: req.requestId });
        } catch (e) {
          logger.warn("auth_upgrade_password_hash_failed", { username, error: e.message, requestId: req.requestId });
        }
      }
    }

    logger.info("auth_user_found", { username: user.username, requestId: req.requestId });
    req.session.regenerate(function (err) {
      if (err) {
        logger.error("auth_session_regenerate_error", { username, error: err.message, requestId: req.requestId });
        return res.status(500).send("Session regeneration failed");
      }
      req.session.user = user;
      logger.info("auth_login_success", { username: user.username, requestId: req.requestId });
      res.status(200).send("Login successful");
    });
  } catch (e) {
    logger.error("auth_error", { username, error: e.message, requestId: req.requestId });
    next(e);
  }
});


// router.post("/test", multerUpload.single("image"), async function(req, res){
//   console.log("HERE IT IS _______________________________________________________________")
//   console.log(req.file);
// })

router.post(
  "/signup",
  multerUpload.single("image"),
  validateSignup,
  async function (req, res, next) {
    const { username, password, university, bio } = req.body;
    let courses = [];
    try {
      courses = Array.isArray(req.body.courses) ? req.body.courses : JSON.parse(req.body.courses || '[]');
    } catch (e) {
      return res.status(400).json({ message: 'Invalid courses format' });
    }

    let bufferToStore;
    if (req.file) {
      // If an image was provided in the request, use its buffer
      let base64 = req.file.buffer.toString("base64");
      bufferToStore = new Buffer(base64, "base64");
    } else {
      // If no image was provided, use the default image from default.avatar.js
      bufferToStore = Buffer.from(defaultAvatar, "base64");
    }

    // create a new user with the provided information
    // Always hash new user passwords
    let hashed;
    try {
      hashed = await hashPassword(password);
    } catch (e) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    const user = new User({
      username: username,
      password: hashed,
      university: university,
      courses: courses,
      bio: bio,
      //added the image of filepath to the image key
      image: bufferToStore,
      location: {
        type: "Point",
        coordinates: [0, 0], // default coordinates
      },
    });

    // save the new user to the database
    try {
      await user.save();
      req.session.regenerate(function (err) {
        if (err) {
          console.log(err);
          res.status(500).send("Session regeneration failed");
        } else {
          req.session.user = user;
            // session established
          // the session has been regenerated, do something with it
          res.status(200).send("Login successful");
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).send("Error creating user");
    }
  }
);

// DEBUG ROUTE - List all users in database
router.get("/debug-all-users", async (req, res) => {
  try {
    const allUsers = await User.find({}, { password: 0, image: 0 })
      .select("username university available courses buddies _id");
    
    console.log('=== ALL USERS IN DATABASE ===');
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} - ${user.university} - Available: ${user.available}`);
    });
    console.log('=== END ALL USERS ===');
    
    res.json({ 
      total: allUsers.length, 
      users: allUsers 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/get-users", async (req, res, next) => {
  try {
    const users = await User.find({}, { password: 0, image: 0 });

    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error retrieving users" });
  }
});

router.get("/check-logged-in", async function (req, res, next) {
  let loggedIn = false;
  let username = "";
  if (req.session.user) {
    loggedIn = true;
    username = req.session.user.username;
  }
  const available = await User.findOne({ username: username }).select(
    "available"
  );
  res.json({ loggedIn, username, available });
});

router.get("/logout", function (req, res, next) {
  let loggedOut = true;
  req.session.destroy(function (err) {
    if (err) {
      loggedOut = false;
    }

    res.json({ loggedOut });
  });
});

//-------------------------------------------------
router.get("/get-users-inoneKm", async (req, res) => {
  try {
    const username = req.session.user.username;
    const currentUser = await User.findOne({ username: username });
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Remove location requirement - university-based system doesn't need location
    // if (!currentUser.location) {
    //   return res.status(400).json({ message: "User location not available" });
    // }

    // Find all users from the same university (with flexible matching for IIT Jodhpur)
    // Handle variations like "IITJ", "IIT Jodhpur", "iit jodhpur", etc.
    const universityVariations = [
      currentUser.university,
      currentUser.university.toLowerCase(),
      currentUser.university.toUpperCase(),
    ];
    
    // Add specific IIT Jodhpur variations - handle both directions  
    const uni = currentUser.university.toLowerCase();
    if (uni.includes('iit') || uni.includes('jodh') || uni === 'iitj') {
      universityVariations.push(
        'IITJ', 'IIT Jodhpur', 'iit jodhpur', 'IIT JODHPUR', 'iitj',
        'IIT-Jodhpur', 'iit-jodhpur', 'Iit Jodhpur', 'IIT_Jodhpur'
      );
    }
    
    const usersFromSameUniversity = await User.find(
      {
        username: { $ne: username }, // Exclude current user
        university: { $in: universityVariations }, // Match any variation
        // available: true, // Remove this requirement - show all users from same university
      },
      { image: 0, password: 0 }
    ).select("username location buddies _id university courses bio available"); //.populate('matchedbuddies'); <- can use this if need be depending on the implmentation of match buddy

    for (let i = 0; i < usersFromSameUniversity.length; i++) {
      console.log(`User ${i+1}: ${usersFromSameUniversity[i].username}`);
      console.log(`University: ${usersFromSameUniversity[i].university}`);
      console.log(`Available: ${usersFromSameUniversity[i].available}`);
      console.log(`Courses: ${usersFromSameUniversity[i].courses}`);
      console.log('---');
    }

    console.log(`Found ${usersFromSameUniversity.length} users from ${currentUser.university}`);
    res.json({ usersFromSameUniversity, username: username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});
//----------------------------------------

router.post("/availability", (req, res) => {
  const username = req.session.user.username;
  const { available } = req.body;
  const filter = { username: username };
  const update = {
    $set: { available: available },
  };
  User.updateOne(filter, update, function (err, result) {
    if (err) {
      console.log(err);
      return;
    }

    console.log("Updated availability");
    console.log(result);
  });

  res.sendStatus(200);
});

router.post("/post-loc/", (req, res) => {
  const username = req.session.user.username;
  const { lat, lng } = req.body;

  const filter = { username: username };
  const update = {
    $set: { location: { type: "Point", coordinates: [lng, lat] } },
  };

  User.updateOne(filter, update, function (err, result) {
    if (err) {
      console.log(err);
      return;
    }

    console.log("Updated the location");
    console.log(result);
  });

  res.sendStatus(200);
});

router.post("/addreview", async (req, res) => {
  console.log(req.body);
  console.log(
    "HERE IT IS ____1234567890987654___________________________!!!!!!!!!!!!!!!!!!!"
  );

  try {
    await Promise.all(
      req.body.map(async (review) => {
        const filter = { username: review.name };
        const update = { $push: { reviews: review.reviews } };
        const result = await User.updateMany(filter, update);

        console.log(result);
      })
    );
    res.json({ message: "Reviews added successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/edit", multerUpload.single("image"), async (req, res) => {
  const username = req.session.user.username;
  const university = req.body.university;
  const courses = req.body.courses;
  const bio = req.body.bio;
  if (req.file) {
    let base64 = req.file.buffer.toString("base64");
    image = new Buffer(base64, "base64");
    try {
      const user = await User.findOneAndUpdate(
        { username },
        { university, courses, image, bio },
        { new: true }
      );
      res.json(user);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  } else {
    try {
      const user = await User.findOneAndUpdate(
        { username },
        { university, courses, bio },
        { new: true }
      );
      res.json(user);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

router.get("/info", async (req, res) => {
  console.log("we are here");
  const username = req.session.user.username;
  try {
    const user = await User.findOne({ username });
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/image/:username", async (req, res) => {
  const username = req.params.username;
  try {
    const user = await User.findOne({ username });
    if (user.image && user.image.length > 0) {
      let buffImg = user.image;
      let base64 = buffImg.toString("base64");
      let image = Buffer.from(base64, "base64");
      res.writeHead(200, {
        "Content-Type": "image/png",
        "Content-Length": image.length,
      });
      res.end(image);
    } else {
      let image = Buffer.from(defaultAvatar, "base64");
      res.writeHead(200, {
        "Content-Type": "image/png",
        "Content-Length": image.length,
      });
      res.end(image);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

//----------SINGLE matchedbuddy info --------------

router.get("/matchedbuddyinfo", async (req, res) => {
  const selfusername = req.session.user.username; //send the buddy's username through

  console.log("=MATCHED BUDDY INFO ");
  console.log(selfusername);
  console.log("MATCHED BUDDY DONEEEEEE ");

  try {
    const user = await User.find({ username: selfusername });
    const viewbuddyusername = user[0].viewbuddy;
    const buddyinformation = await User.find({ username: viewbuddyusername });
    console.log("MATCHED  VIEW BUDDY of current user------");
    console.log(buddyinformation);
    console.log("MATCHED  VIEW BUDDY of current user DONEEE------");

    res.json(buddyinformation);
    // console.log("OK")
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Internal Server Error when getting matchedbuddy info" });
  }
});

router.post("/addsinglebuddy", async (req, res) => {
  const buddyUsername = req.body.buddyname; //send the buddy's username through
  console.log("KATIES adding single buddy ");
  console.log(buddyUsername);
  console.log("KATIES adding single buddy DONEEEEEE ");
  const selfuser = req.session.user.username;

  try {
    const user = await User.findOne({ username: selfuser });
    if (user) {
      console.log(
        "KATIES adding single buddy INFO own user actually foudn in db"
      );
      console.log(user);
      console.log(buddyUsername);
      console.log("KATIES adding single buddy own user actually foudn in db");
      const filter = { username: selfuser };
      const update = { viewbuddy: buddyUsername };
      const options = { new: true };
      const updatedUser = await User.findOneAndUpdate(filter, update, options);
      console.log("returned::::::", updatedUser);
      res.json(updatedUser);
    } else {
      console.log("User not found");
      res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Internal Server Error when getting matchedbuddy info" });
  }
});

//----------SINGLE matchedbuddy info --------------^^^^^
module.exports = router;
