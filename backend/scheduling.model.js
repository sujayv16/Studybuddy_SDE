const mongoose = require('mongoose');

var Schema = mongoose.Schema;

// Study Session Scheduling Model
var studySessionSchema = new Schema({
    sessionId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    course: { type: String, required: true },
    participants: [{ 
        username: { type: String, required: true },
        status: { type: String, enum: ["invited", "accepted", "declined"], default: "invited" }
    }],
    organizer: { type: String, required: true },
    scheduledTime: { type: Date, required: true },
    duration: { type: Number, required: true }, // in minutes
    location: { 
        type: { type: String, enum: ["physical", "online"] },
        details: { type: String } // Physical address or online meeting link
    },
    status: { type: String, enum: ["scheduled", "ongoing", "completed", "cancelled"], default: "scheduled" },
    description: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Availability Slot Model for better scheduling
var availabilitySchema = new Schema({
    username: { type: String, required: true },
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 }, // 0 = Sunday, 1 = Monday, etc.
    startTime: { type: String, required: true }, // Format: "HH:MM"
    endTime: { type: String, required: true },   // Format: "HH:MM"
    isAvailable: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

// Course Enrollment tracking for better matching
var courseEnrollmentSchema = new Schema({
    username: { type: String, required: true },
    courseId: { type: String, required: true },
    courseName: { type: String, required: true },
    semester: { type: String },
    year: { type: Number },
    priority: { type: Number, default: 1 }, // 1-5, 5 being highest priority for study sessions
    studyGoals: [{ type: String }], // ["exam-prep", "homework", "project", "understanding-concepts"]
    createdAt: { type: Date, default: Date.now }
});

module.exports = {
    StudySession: mongoose.model("StudySession", studySessionSchema),
    Availability: mongoose.model("Availability", availabilitySchema),
    CourseEnrollment: mongoose.model("CourseEnrollment", courseEnrollmentSchema)
};