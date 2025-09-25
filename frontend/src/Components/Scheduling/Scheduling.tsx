import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Modal, Badge, Alert } from 'react-bootstrap';
import { useLoaderData, useNavigate } from 'react-router-dom';
import RootNavbar from '../Root/RootNavbar';
import WeeklyAvailability from './WeeklyAvailability';
import io from 'socket.io-client';
import Notifications from '../Notifications/Notifications';
import './Scheduling.css';

interface StudySession {
  sessionId: string;
  title: string;
  course: string;
  participants: Array<{
    username: string;
    status: 'invited' | 'accepted' | 'declined';
  }>;
  organizer: string;
  scheduledTime: string;
  duration: number;
  location: {
    type: 'physical' | 'online';
    details: string;
  };
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  description?: string;
}

interface Availability {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

const Scheduling: React.FC = () => {
  const navigate = useNavigate();
  const data: any = useLoaderData();
  
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [availability, setAvailability] = useState<Record<number, Availability[]>>({});
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [buddies, setBuddies] = useState<any[]>([]);
  const [courses, setCourses] = useState<string[]>([]);
  const [suggestedTimes, setSuggestedTimes] = useState<any[]>([]);
  const [socket, setSocket] = useState<any>(null);

  const [newSession, setNewSession] = useState({
    title: '',
    course: '',
    participants: [] as string[],
    scheduledTime: '',
    duration: 120,
    location: { type: 'physical' as 'physical' | 'online', details: '' },
    description: ''
  });

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    if (!data.loggedIn) {
      setTimeout(() => navigate('/login'), 0);
    } else {
      fetchData();
      
      // Initialize socket for notifications
      const newSocket = io('/chat');
      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
  }, [data.loggedIn, navigate]);

  const fetchData = async () => {
    try {
      // Fetch study sessions
      const sessionsRes = await fetch('/scheduling/sessions');
      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json();
        setSessions(sessionsData);
      }

      // Fetch availability
      const availabilityRes = await fetch('/scheduling/availability');
      if (availabilityRes.ok) {
        const availabilityData = await availabilityRes.json();
        const groupedAvailability: Record<number, Availability[]> = {};
        availabilityData.forEach((slot: Availability) => {
          if (!groupedAvailability[slot.dayOfWeek]) {
            groupedAvailability[slot.dayOfWeek] = [];
          }
          groupedAvailability[slot.dayOfWeek].push(slot);
        });
        setAvailability(groupedAvailability);
      }

      // Fetch buddies
      const buddiesRes = await fetch('/matches/buddies');
      if (buddiesRes.ok) {
        const buddiesData = await buddiesRes.json();
        setBuddies(buddiesData);
      }

      // Fetch user info for courses
      const userRes = await fetch('/users/info');
      if (userRes.ok) {
        const userData = await userRes.json();
        setCourses(userData.courses || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/scheduling/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newSession)
      });

      if (response.ok) {
        const sessionData = await response.json();
        setSessions([...sessions, sessionData]);
        setShowNewSessionModal(false);
        setNewSession({
          title: '',
          course: '',
          participants: [],
          scheduledTime: '',
          duration: 120,
          location: { type: 'physical', details: '' },
          description: ''
        });
        alert('Study session created successfully!');
      }
    } catch (error) {
      console.error('Error creating session:', error);
      alert('Error creating study session');
    }
  };

  const handleSuggestTimes = async () => {
    if (newSession.participants.length === 0) {
      alert('Please select participants first');
      return;
    }

    try {
      const response = await fetch('/scheduling/suggest-times', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          participants: newSession.participants,
          duration: newSession.duration
        })
      });

      if (response.ok) {
        const suggestedData = await response.json();
        setSuggestedTimes(suggestedData);
      }
    } catch (error) {
      console.error('Error suggesting times:', error);
    }
  };

  const updateAvailability = async (dayOfWeek: number, slots: Availability[]) => {
    try {
      const response = await fetch('/scheduling/availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dayOfWeek,
          slots
        })
      });

      if (response.ok) {
        setAvailability({
          ...availability,
          [dayOfWeek]: slots
        });
      }
    } catch (error) {
      console.error('Error updating availability:', error);
    }
  };

  const saveWeeklyAvailability = async (weeklyAvailability: Record<number, any[]>) => {
    try {
      // Save each day's availability
      for (const [dayOfWeek, slots] of Object.entries(weeklyAvailability)) {
        // Convert TimeSlot to Availability format
        const availabilitySlots = slots.map(slot => ({
          ...slot,
          dayOfWeek: parseInt(dayOfWeek)
        }));
        await updateAvailability(parseInt(dayOfWeek), availabilitySlots);
      }
      
      // Refresh data after saving
      await fetchData();
      
      alert('✅ Weekly availability saved successfully!');
    } catch (error) {
      console.error('Error saving weekly availability:', error);
      alert('❌ Failed to save availability. Please try again.');
    }
  };

  const respondToSession = async (sessionId: string, response: 'accepted' | 'declined') => {
    try {
      const res = await fetch(`/scheduling/sessions/${sessionId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ response })
      });

      if (res.ok) {
        const updatedSession = await res.json();
        setSessions(sessions.map(s => s.sessionId === sessionId ? updatedSession : s));
      }
    } catch (error) {
      console.error('Error responding to session:', error);
    }
  };

  return (
    <>
      <RootNavbar loggedIn={data.loggedIn} />
      <Container className="scheduling-container">
        <Row>
          <Col>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h2 className="scheduling-title">Study Sessions & Scheduling</h2>
              <div>
                <Button 
                  variant="outline-primary" 
                  onClick={() => setShowAvailabilityModal(true)}
                  className="me-2"
                >
                  Set Availability
                </Button>
                <Button 
                  variant="primary" 
                  onClick={() => setShowNewSessionModal(true)}
                >
                  Schedule New Session
                </Button>
              </div>
            </div>
          </Col>
        </Row>

        <Row>
          <Col lg={8}>
            <Card className="sessions-card">
              <Card.Header>
                <h5>Your Study Sessions</h5>
              </Card.Header>
              <Card.Body>
                {sessions.length > 0 ? (
                  sessions.map(session => (
                    <Card key={session.sessionId} className="session-card mb-3">
                      <Card.Body>
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <h6 className="fw-bold">{session.title}</h6>
                            <p className="text-muted mb-1">
                              <i className="bi bi-book me-1"></i>
                              {session.course}
                            </p>
                            <p className="text-muted mb-1">
                              <i className="bi bi-clock me-1"></i>
                              {new Date(session.scheduledTime).toLocaleDateString()} at{' '}
                              {new Date(session.scheduledTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </p>
                            <p className="text-muted mb-1">
                              <i className="bi bi-geo-alt me-1"></i>
                              {session.location.type === 'online' ? '📹 Online' : '📍 Physical'}: {session.location.details}
                            </p>
                            <div className="participants-section mt-2">
                              <small className="text-muted">Participants:</small>
                              <div>
                                {session.participants.map(p => (
                                  <Badge 
                                    key={p.username} 
                                    bg={p.status === 'accepted' ? 'success' : 
                                        p.status === 'declined' ? 'danger' : 'warning'}
                                    className="me-1"
                                  >
                                    {p.username} ({p.status})
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div>
                            <Badge bg={
                              session.status === 'scheduled' ? 'primary' :
                              session.status === 'ongoing' ? 'warning' :
                              session.status === 'completed' ? 'success' : 'danger'
                            }>
                              {session.status}
                            </Badge>
                            {session.organizer !== data.username && 
                             session.participants.find(p => p.username === data.username)?.status === 'invited' && (
                              <div className="mt-2">
                                <Button 
                                  size="sm" 
                                  variant="success" 
                                  onClick={() => respondToSession(session.sessionId, 'accepted')}
                                  className="me-1"
                                >
                                  Accept
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline-danger" 
                                  onClick={() => respondToSession(session.sessionId, 'declined')}
                                >
                                  Decline
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                        {session.description && (
                          <p className="mt-2 mb-0">
                            <small className="text-muted">{session.description}</small>
                          </p>
                        )}
                      </Card.Body>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-5">
                    <i className="bi bi-calendar-plus" style={{ fontSize: '3rem', color: '#6c757d' }}></i>
                    <h5 className="text-muted mt-3">No study sessions scheduled</h5>
                    <p className="text-muted">Create your first study session to get started!</p>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>

          <Col lg={4}>
            <Card className="availability-card">
              <Card.Header>
                <h6>Your Weekly Availability</h6>
              </Card.Header>
              <Card.Body>
                {dayNames.map((day, index) => (
                  <div key={index} className="day-availability mb-2">
                    <strong>{day}:</strong>
                    <div className="ms-2">
                      {availability[index] && availability[index].length > 0 ? (
                        availability[index].map((slot, slotIndex) => (
                          <Badge key={slotIndex} bg="info" className="me-1">
                            {slot.startTime} - {slot.endTime}
                          </Badge>
                        ))
                      ) : (
                        <small className="text-muted">Not available</small>
                      )}
                    </div>
                  </div>
                ))}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* New Session Modal */}
        <Modal show={showNewSessionModal} onHide={() => setShowNewSessionModal(false)} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>Schedule New Study Session</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form onSubmit={handleCreateSession}>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Session Title</Form.Label>
                    <Form.Control
                      type="text"
                      value={newSession.title}
                      onChange={(e) => setNewSession({...newSession, title: e.target.value})}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Course</Form.Label>
                    <Form.Select
                      value={newSession.course}
                      onChange={(e) => setNewSession({...newSession, course: e.target.value})}
                      required
                    >
                      <option value="">Select a course</option>
                      {courses.map(course => (
                        <option key={course} value={course}>{course}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>Invite Participants</Form.Label>
                {buddies.map(buddy => (
                  <Form.Check
                    key={buddy.username}
                    type="checkbox"
                    label={`${buddy.username} - ${buddy.courses?.join(', ') || 'No courses listed'}`}
                    checked={newSession.participants.includes(buddy.username)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setNewSession({
                          ...newSession,
                          participants: [...newSession.participants, buddy.username]
                        });
                      } else {
                        setNewSession({
                          ...newSession,
                          participants: newSession.participants.filter(p => p !== buddy.username)
                        });
                      }
                    }}
                  />
                ))}
              </Form.Group>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Date & Time</Form.Label>
                    <Form.Control
                      type="datetime-local"
                      value={newSession.scheduledTime}
                      onChange={(e) => setNewSession({...newSession, scheduledTime: e.target.value})}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Duration (minutes)</Form.Label>
                    <Form.Control
                      type="number"
                      min="30"
                      max="480"
                      step="30"
                      value={newSession.duration}
                      onChange={(e) => setNewSession({...newSession, duration: parseInt(e.target.value)})}
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Location Type</Form.Label>
                    <Form.Select
                      value={newSession.location.type}
                      onChange={(e) => setNewSession({
                        ...newSession, 
                        location: {...newSession.location, type: e.target.value as 'physical' | 'online'}
                      })}
                    >
                      <option value="physical">Physical Location</option>
                      <option value="online">Online Meeting</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>
                      {newSession.location.type === 'online' ? 'Meeting Link' : 'Location Details'}
                    </Form.Label>
                    <Form.Control
                      type="text"
                      placeholder={
                        newSession.location.type === 'online' 
                          ? 'Enter Zoom/Teams link' 
                          : 'Enter address or room number'
                      }
                      value={newSession.location.details}
                      onChange={(e) => setNewSession({
                        ...newSession, 
                        location: {...newSession.location, details: e.target.value}
                      })}
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>Description (Optional)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={newSession.description}
                  onChange={(e) => setNewSession({...newSession, description: e.target.value})}
                  placeholder="Add any additional details about the study session..."
                />
              </Form.Group>

              <div className="d-flex justify-content-between">
                <Button variant="outline-info" type="button" onClick={handleSuggestTimes}>
                  Suggest Best Times
                </Button>
                <div>
                  <Button variant="secondary" onClick={() => setShowNewSessionModal(false)} className="me-2">
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit">
                    Create Session
                  </Button>
                </div>
              </div>
            </Form>

            {suggestedTimes.length > 0 && (
              <Alert variant="info" className="mt-3">
                <h6>Suggested Times Based on Everyone's Availability:</h6>
                {suggestedTimes.slice(0, 5).map((time, index) => (
                  <Badge 
                    key={index} 
                    bg="info" 
                    className="me-2 mb-1 p-2"
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      const date = new Date();
                      date.setDate(date.getDate() + ((time.dayOfWeek - date.getDay() + 7) % 7));
                      const [hours, minutes] = time.startTime.split(':');
                      date.setHours(parseInt(hours), parseInt(minutes));
                      setNewSession({
                        ...newSession,
                        scheduledTime: date.toISOString().slice(0, 16)
                      });
                    }}
                  >
                    {time.dayName} {time.startTime} - {time.endTime}
                  </Badge>
                ))}
              </Alert>
            )}
          </Modal.Body>
        </Modal>

        {/* Weekly Availability Modal */}
        <WeeklyAvailability
          show={showAvailabilityModal}
          onHide={() => setShowAvailabilityModal(false)}
          currentAvailability={availability}
          onSave={saveWeeklyAvailability}
        />

        {/* Notifications */}
        <Notifications socket={socket} currentUsername={data.username} />
      </Container>
    </>
  );
};

export default Scheduling;