const express = require("express");
const router = express.Router();
const User = require("../user.model");
const { StudySession, Availability, CourseEnrollment } = require("../scheduling.model");
const uuid = require("uuid");

// Get user's availability
router.get("/availability", async (req, res) => {
  if (!req.session.user) {
    return res.sendStatus(401);
  }

  try {
    const availability = await Availability.find({ 
      username: req.session.user.username 
    }).sort({ dayOfWeek: 1, startTime: 1 });
    
    res.json(availability);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching availability" });
  }
});

// Update user's availability
router.post("/availability", async (req, res) => {
  if (!req.session.user) {
    return res.sendStatus(401);
  }

  const { dayOfWeek, startTime, endTime, isAvailable } = req.body;
  
  try {
    // Remove existing availability for this day and time slot
    await Availability.deleteMany({
      username: req.session.user.username,
      dayOfWeek: dayOfWeek
    });

    // Add new availability slots
    if (req.body.slots && req.body.slots.length > 0) {
      const availabilitySlots = req.body.slots.map(slot => ({
        username: req.session.user.username,
        dayOfWeek: dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        isAvailable: slot.isAvailable !== false
      }));

      await Availability.insertMany(availabilitySlots);
    }

    res.json({ message: "Availability updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating availability" });
  }
});

// Get course enrollments
router.get("/courses", async (req, res) => {
  if (!req.session.user) {
    return res.sendStatus(401);
  }

  try {
    const enrollments = await CourseEnrollment.find({ 
      username: req.session.user.username 
    });
    
    res.json(enrollments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching course enrollments" });
  }
});

// Add/Update course enrollment
router.post("/courses", async (req, res) => {
  if (!req.session.user) {
    return res.sendStatus(401);
  }

  const { courseId, courseName, semester, year, priority, studyGoals } = req.body;
  
  try {
    const enrollment = await CourseEnrollment.findOneAndUpdate(
      { 
        username: req.session.user.username, 
        courseId: courseId 
      },
      {
        username: req.session.user.username,
        courseId,
        courseName,
        semester,
        year,
        priority: priority || 1,
        studyGoals: studyGoals || []
      },
      { upsert: true, new: true }
    );

    res.json(enrollment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating course enrollment" });
  }
});

// Find matching study partners based on courses and availability
router.get("/find-partners/:courseId", async (req, res) => {
  if (!req.session.user) {
    return res.sendStatus(401);
  }

  const { courseId } = req.params;
  const { day, timeSlot } = req.query; // Optional filters

  try {
    // Find users enrolled in the same course
    const courseEnrollments = await CourseEnrollment.find({
      courseId: courseId,
      username: { $ne: req.session.user.username }
    });

    const potentialPartners = courseEnrollments.map(enrollment => enrollment.username);

    if (potentialPartners.length === 0) {
      return res.json([]);
    }

    // Get user details
    let partners = await User.find(
      { username: { $in: potentialPartners } },
      { password: 0, image: 0 }
    );

    // If time filtering is requested
    if (day !== undefined && timeSlot) {
      const availablePartners = await Availability.find({
        username: { $in: potentialPartners },
        dayOfWeek: parseInt(day),
        startTime: { $lte: timeSlot },
        endTime: { $gt: timeSlot },
        isAvailable: true
      });

      const availableUsernames = availablePartners.map(av => av.username);
      partners = partners.filter(partner => availableUsernames.includes(partner.username));
    }

    // Enhance with course enrollment info
    const partnersWithCourseInfo = partners.map(partner => {
      const enrollment = courseEnrollments.find(e => e.username === partner.username);
      return {
        ...partner.toObject(),
        courseEnrollment: enrollment
      };
    });

    res.json(partnersWithCourseInfo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error finding study partners" });
  }
});

// Schedule a study session
router.post("/sessions", async (req, res) => {
  if (!req.session.user) {
    return res.sendStatus(401);
  }

  const { 
    title, 
    course, 
    participants, 
    scheduledTime, 
    duration, 
    location, 
    description 
  } = req.body;

  try {
    const sessionId = uuid.v4();
    
    const studySession = new StudySession({
      sessionId,
      title,
      course,
      participants: participants.map(username => ({ username, status: "invited" })),
      organizer: req.session.user.username,
      scheduledTime: new Date(scheduledTime),
      duration: duration || 120,
      location,
      description
    });

    await studySession.save();

    // TODO: Send notifications to invited participants
    
    res.json(studySession);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating study session" });
  }
});

// Get user's study sessions
router.get("/sessions", async (req, res) => {
  if (!req.session.user) {
    return res.sendStatus(401);
  }

  try {
    const sessions = await StudySession.find({
      $or: [
        { organizer: req.session.user.username },
        { "participants.username": req.session.user.username }
      ]
    }).sort({ scheduledTime: 1 });

    res.json(sessions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching study sessions" });
  }
});

// Respond to study session invitation
router.post("/sessions/:sessionId/respond", async (req, res) => {
  if (!req.session.user) {
    return res.sendStatus(401);
  }

  const { sessionId } = req.params;
  const { response } = req.body; // "accepted" or "declined"

  try {
    const session = await StudySession.findOneAndUpdate(
      { 
        sessionId,
        "participants.username": req.session.user.username
      },
      {
        $set: { "participants.$.status": response }
      },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ message: "Study session not found" });
    }

    res.json(session);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error responding to study session" });
  }
});

// Get suggested study times based on multiple users' availability
router.post("/suggest-times", async (req, res) => {
  if (!req.session.user) {
    return res.sendStatus(401);
  }

  const { participants, duration = 120 } = req.body; // duration in minutes
  const allParticipants = [...participants, req.session.user.username];

  try {
    // Get availability for all participants
    const availabilities = await Availability.find({
      username: { $in: allParticipants },
      isAvailable: true
    }).sort({ dayOfWeek: 1, startTime: 1 });

    // Group by day of week
    const availabilityByDay = {};
    availabilities.forEach(av => {
      if (!availabilityByDay[av.dayOfWeek]) {
        availabilityByDay[av.dayOfWeek] = {};
      }
      if (!availabilityByDay[av.dayOfWeek][av.username]) {
        availabilityByDay[av.dayOfWeek][av.username] = [];
      }
      availabilityByDay[av.dayOfWeek][av.username].push({
        startTime: av.startTime,
        endTime: av.endTime
      });
    });

    const suggestedTimes = [];
    
    // Find common availability slots
    Object.keys(availabilityByDay).forEach(day => {
      const dayInt = parseInt(day);
      const dayAvailability = availabilityByDay[day];
      
      // Check if all participants have availability this day
      if (Object.keys(dayAvailability).length === allParticipants.length) {
        // Find overlapping time slots
        const commonSlots = findCommonTimeSlots(dayAvailability, allParticipants, duration);
        commonSlots.forEach(slot => {
          suggestedTimes.push({
            dayOfWeek: dayInt,
            dayName: getDayName(dayInt),
            startTime: slot.startTime,
            endTime: slot.endTime,
            availableParticipants: allParticipants.length
          });
        });
      }
    });

    res.json(suggestedTimes.slice(0, 10)); // Return top 10 suggestions
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error suggesting study times" });
  }
});

// Helper functions
function findCommonTimeSlots(dayAvailability, participants, durationMinutes) {
  // This is a simplified implementation
  // In a real-world scenario, you'd want a more sophisticated algorithm
  const commonSlots = [];
  
  // Get the first participant's slots as base
  const baseSlots = dayAvailability[participants[0]] || [];
  
  baseSlots.forEach(baseSlot => {
    let isCommonSlot = true;
    let commonStart = baseSlot.startTime;
    let commonEnd = baseSlot.endTime;
    
    // Check overlap with other participants
    for (let i = 1; i < participants.length; i++) {
      const participantSlots = dayAvailability[participants[i]] || [];
      let hasOverlap = false;
      
      participantSlots.forEach(slot => {
        if (slot.startTime < commonEnd && slot.endTime > commonStart) {
          hasOverlap = true;
          // Adjust common slot to intersection
          commonStart = slot.startTime > commonStart ? slot.startTime : commonStart;
          commonEnd = slot.endTime < commonEnd ? slot.endTime : commonEnd;
        }
      });
      
      if (!hasOverlap) {
        isCommonSlot = false;
        break;
      }
    }
    
    // Check if the common slot is long enough
    if (isCommonSlot && getTimeDifferenceInMinutes(commonStart, commonEnd) >= durationMinutes) {
      commonSlots.push({ startTime: commonStart, endTime: commonEnd });
    }
  });
  
  return commonSlots;
}

function getTimeDifferenceInMinutes(startTime, endTime) {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  return endMinutes - startMinutes;
}

function getDayName(dayInt) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayInt];
}

module.exports = router;