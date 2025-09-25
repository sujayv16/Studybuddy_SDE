const mongoose = require("mongoose");

var Schema = mongoose.Schema;

var userSchema = new Schema({
  username: { type: String, required: true },
  password: { type: String, minlength: 2, required: true },
  university: { type: String, required: true },
  courses: { type: [String], required: true },
  buddies: { type: [String] },
  viewbuddy: { type: String },
  image: { type: Buffer, required: true },
  bio: { type: String, require: true },
  reviews: { type: [String] },

  available: { type: Boolean, required: false, default: false },
  location: {
    type: {
      type: String,
      enum: ["Point"],
      required: false,
    },
    coordinates: {
      type: [Number],
      required: false,
    },
    required: false,
  },

  // Enhanced scheduling and preferences
  weeklyAvailability: {
    monday: [{ type: String }], // Array of time slots like ["09:00-12:00", "14:00-16:00"]
    tuesday: [{ type: String }],
    wednesday: [{ type: String }],
    thursday: [{ type: String }],
    friday: [{ type: String }],
    saturday: [{ type: String }],
    sunday: [{ type: String }]
  },
  preferences: {
    studySessionDuration: { type: Number, default: 120 }, // minutes
    preferredStudyTimes: [{ type: String }], // ["morning", "afternoon", "evening", "night"]
    studyStyle: { type: String, enum: ["group", "one-on-one", "both"], default: "both" },
    location: { type: String, enum: ["library", "dorm", "cafe", "online", "anywhere"], default: "anywhere" }
  },
  studySessions: [{
    sessionId: { type: String },
    courseId: { type: String },
    participants: [{ type: String }], // usernames
    scheduledTime: { type: Date },
    duration: { type: Number }, // minutes
    location: { type: String },
    status: { type: String, enum: ["scheduled", "ongoing", "completed", "cancelled"], default: "scheduled" },
    createdAt: { type: Date, default: Date.now }
  }],

  //matchedbuddies: [{ type: [Schema.Types.ObjectId], ref: 'User',required: false }]//reference to other users
});

module.exports = mongoose.model("user", userSchema);
