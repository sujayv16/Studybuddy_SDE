import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Card, Alert, Badge } from 'react-bootstrap';
import './WeeklyAvailability.css';

interface TimeSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  dayOfWeek?: number; // Make it optional since we handle it in the parent component
}

interface WeeklyAvailabilityProps {
  show: boolean;
  onHide: () => void;
  currentAvailability?: Record<number, TimeSlot[]>;
  onSave: (availability: Record<number, TimeSlot[]>) => void;
}

const WeeklyAvailability: React.FC<WeeklyAvailabilityProps> = ({
  show,
  onHide,
  currentAvailability = {},
  onSave
}) => {
  const [availability, setAvailability] = useState<Record<number, TimeSlot[]>>(currentAvailability);
  const [selectedDay, setSelectedDay] = useState<number>(1); // Monday by default
  const [newSlot, setNewSlot] = useState<TimeSlot>({
    startTime: '09:00',
    endTime: '10:00',
    isAvailable: true
  });

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const timeOptions = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return `${hour}:00`;
  });

  useEffect(() => {
    setAvailability(currentAvailability);
  }, [currentAvailability, show]);

  const addTimeSlot = () => {
    if (newSlot.startTime >= newSlot.endTime) {
      alert('Start time must be before end time');
      return;
    }

    const daySlots = availability[selectedDay] || [];
    const updatedSlots = [...daySlots, { ...newSlot }];
    
    setAvailability({
      ...availability,
      [selectedDay]: updatedSlots.sort((a, b) => a.startTime.localeCompare(b.startTime))
    });

    setNewSlot({
      startTime: '09:00',
      endTime: '10:00',
      isAvailable: true
    });
  };

  const removeTimeSlot = (dayIndex: number, slotIndex: number) => {
    const daySlots = availability[dayIndex] || [];
    const updatedSlots = daySlots.filter((_, index) => index !== slotIndex);
    
    setAvailability({
      ...availability,
      [dayIndex]: updatedSlots
    });
  };

  const toggleSlotAvailability = (dayIndex: number, slotIndex: number) => {
    const daySlots = [...(availability[dayIndex] || [])];
    if (daySlots[slotIndex]) {
      daySlots[slotIndex].isAvailable = !daySlots[slotIndex].isAvailable;
      setAvailability({
        ...availability,
        [dayIndex]: daySlots
      });
    }
  };

  const handleSave = () => {
    onSave(availability);
    onHide();
  };

  const clearDay = (dayIndex: number) => {
    setAvailability({
      ...availability,
      [dayIndex]: []
    });
  };

  const addQuickAvailability = (dayIndex: number, startHour: number, endHour: number) => {
    const quickSlot: TimeSlot = {
      startTime: `${startHour.toString().padStart(2, '0')}:00`,
      endTime: `${endHour.toString().padStart(2, '0')}:00`,
      isAvailable: true
    };

    const daySlots = availability[dayIndex] || [];
    const updatedSlots = [...daySlots, quickSlot];
    
    setAvailability({
      ...availability,
      [dayIndex]: updatedSlots.sort((a, b) => a.startTime.localeCompare(b.startTime))
    });
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton className="weekly-availability-header">
        <Modal.Title>📅 Weekly Availability Management</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Alert variant="info" className="mb-3">
          <strong>📝 Instructions:</strong> Set your weekly availability to help others find the best times to schedule study sessions with you. 
          Green slots indicate when you're available, red slots when you're busy.
        </Alert>

        <Row>
          {/* Day Selector */}
          <Col md={3}>
            <h6>Select Day:</h6>
            <div className="day-selector">
              {dayNames.map((day, index) => (
                <Button
                  key={index}
                  variant={selectedDay === index ? 'primary' : 'outline-primary'}
                  size="sm"
                  className="d-block w-100 mb-2"
                  onClick={() => setSelectedDay(index)}
                >
                  {day}
                  {availability[index]?.length > 0 && (
                    <Badge bg="success" className="ms-2">
                      {availability[index].length}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </Col>

          {/* Time Slot Management */}
          <Col md={9}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6>Availability for {dayNames[selectedDay]}</h6>
              <div>
                <Button
                  variant="outline-success"
                  size="sm"
                  className="me-2"
                  onClick={() => addQuickAvailability(selectedDay, 9, 17)}
                >
                  + Work Hours (9-5)
                </Button>
                <Button
                  variant="outline-info"
                  size="sm"
                  className="me-2"
                  onClick={() => addQuickAvailability(selectedDay, 18, 22)}
                >
                  + Evening (6-10)
                </Button>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => clearDay(selectedDay)}
                >
                  Clear Day
                </Button>
              </div>
            </div>

            {/* Add New Time Slot */}
            <Card className="mb-3 add-slot-card">
              <Card.Body className="p-3">
                <h6 className="mb-3">Add New Time Slot:</h6>
                <Row>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>Start Time</Form.Label>
                      <Form.Select
                        value={newSlot.startTime}
                        onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })}
                      >
                        {timeOptions.map(time => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>End Time</Form.Label>
                      <Form.Select
                        value={newSlot.endTime}
                        onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })}
                      >
                        {timeOptions.map(time => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={4} className="d-flex align-items-end">
                    <Button variant="success" onClick={addTimeSlot} className="w-100">
                      ➕ Add Slot
                    </Button>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            {/* Current Time Slots */}
            <div className="current-slots">
              {availability[selectedDay]?.length > 0 ? (
                <div className="time-slots-grid">
                  {availability[selectedDay].map((slot, index) => (
                    <Card key={index} className={`time-slot-card ${slot.isAvailable ? 'available' : 'unavailable'}`}>
                      <Card.Body className="p-2">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <strong>{slot.startTime} - {slot.endTime}</strong>
                            <br />
                            <Badge bg={slot.isAvailable ? 'success' : 'danger'}>
                              {slot.isAvailable ? '✅ Available' : '❌ Busy'}
                            </Badge>
                          </div>
                          <div>
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              className="me-1"
                              onClick={() => toggleSlotAvailability(selectedDay, index)}
                            >
                              {slot.isAvailable ? '🔒' : '🔓'}
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => removeTimeSlot(selectedDay, index)}
                            >
                              🗑️
                            </Button>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  ))}
                </div>
              ) : (
                <Alert variant="light" className="text-center">
                  <p className="mb-0">No availability set for {dayNames[selectedDay]}</p>
                  <small className="text-muted">Add time slots using the form above or quick buttons</small>
                </Alert>
              )}
            </div>
          </Col>
        </Row>

        {/* Weekly Overview */}
        <Row className="mt-4">
          <Col>
            <Card className="weekly-overview">
              <Card.Header>
                <h6 className="mb-0">📊 Weekly Overview</h6>
              </Card.Header>
              <Card.Body>
                <Row>
                  {dayNames.map((day, index) => (
                    <Col key={index} className="text-center">
                      <div className="day-overview">
                        <strong>{day.substring(0, 3)}</strong>
                        <div className="mt-1">
                          {availability[index]?.length > 0 ? (
                            <Badge bg="primary">{availability[index].length} slots</Badge>
                          ) : (
                            <Badge bg="light" text="dark">No slots</Badge>
                          )}
                        </div>
                      </div>
                    </Col>
                  ))}
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave}>
          💾 Save Availability
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default WeeklyAvailability;