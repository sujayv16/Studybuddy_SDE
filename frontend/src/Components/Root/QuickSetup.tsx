import React, { useState, useEffect } from 'react';
import { Modal, Button, Card, Badge, Alert } from 'react-bootstrap';

interface QuickSetupProps {
  show: boolean;
  onHide: () => void;
  navigate: any;
}

const QuickSetup: React.FC<QuickSetupProps> = ({ show, onHide, navigate }) => {
  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <Modal.Title>🎉 Welcome to StudyBuddy!</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Alert variant="success">
          <strong>🚀 You're all set!</strong> Here are the new features you can explore:
        </Alert>

        <div className="row">
          <div className="col-md-6 mb-3">
            <Card className="h-100" style={{ border: '2px solid #28a745' }}>
              <Card.Header className="bg-success text-white">
                <strong>📅 Weekly Availability</strong>
              </Card.Header>
              <Card.Body>
                <p>Set your weekly schedule to help others find the best times to study with you!</p>
                <ul className="mb-0">
                  <li>Add time slots for each day</li>
                  <li>Mark when you're available/busy</li>
                  <li>Use quick presets (work hours, evenings)</li>
                </ul>
              </Card.Body>
            </Card>
          </div>

          <div className="col-md-6 mb-3">
            <Card className="h-100" style={{ border: '2px solid #007bff' }}>
              <Card.Header className="bg-primary text-white">
                <strong>🔔 Smart Notifications</strong>
              </Card.Header>
              <Card.Body>
                <p>Stay updated with real-time notifications!</p>
                <ul className="mb-0">
                  <li>Chat messages from study partners</li>
                  <li>Study session invitations</li>
                  <li>Group chat updates</li>
                  <li>Bell icon in navigation bar</li>
                </ul>
              </Card.Body>
            </Card>
          </div>

          <div className="col-md-6 mb-3">
            <Card className="h-100" style={{ border: '2px solid #6f42c1' }}>
              <Card.Header className="bg-primary text-white">
                <strong>🎓 Study Sessions</strong>
              </Card.Header>
              <Card.Body>
                <p>Schedule and manage study sessions with classmates!</p>
                <ul className="mb-0">
                  <li>Create sessions for specific courses</li>
                  <li>AI-powered time suggestions</li>
                  <li>Physical or online meetings</li>
                  <li>Session invitations & responses</li>
                </ul>
              </Card.Body>
            </Card>
          </div>

          <div className="col-md-6 mb-3">
            <Card className="h-100" style={{ border: '2px solid #fd7e14' }}>
              <Card.Header className="bg-warning text-dark">
                <strong>✨ Beautiful UI</strong>
              </Card.Header>
              <Card.Body>
                <p>Enjoy the new modern interface!</p>
                <ul className="mb-0">
                  <li>Card-based buddy displays</li>
                  <li>Gradient designs & animations</li>
                  <li>Course information prominent</li>
                  <li>Responsive mobile-friendly design</li>
                </ul>
              </Card.Body>
            </Card>
          </div>
        </div>

        <Alert variant="info" className="mt-3">
          <strong>💡 Quick Start:</strong> Click the "📅 Manage Schedule" button on the main page to set up your weekly availability and start scheduling study sessions!
        </Alert>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onHide}>
          I'll explore later
        </Button>
        <Button variant="primary" onClick={() => { onHide(); navigate('/scheduling'); }}>
          🚀 Set Up My Schedule Now!
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default QuickSetup;