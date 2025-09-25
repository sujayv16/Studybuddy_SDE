// RootPage.tsx
import React, { useEffect, useState } from 'react';
import { Button, Col, Container, Nav, Navbar, Row, Spinner } from 'react-bootstrap';
import {useLoaderData,useNavigate, redirect} from "react-router-dom";
import BuddiesList from '../Matching/BuddiesList';
import { MatchContextProvider } from '../Matching/MatchContext';
import MatchUsersList from '../Matching/MatchUsersList';
import ShowBuddies from '../ShowBuddies/ShowBuddies';
import RootNavbar from './RootNavbar';
import Form from 'react-bootstrap/Form';
import io from 'socket.io-client';
import Notifications from '../Notifications/Notifications';
import QuickSetup from './QuickSetup';


export default function RootPage() {
  const navigate = useNavigate();
  const data:any = useLoaderData();
  
  const [available, setAvailable] = useState(data.available?.available);
  const [socket, setSocket] = useState<any>(null);
  const [showQuickSetup, setShowQuickSetup] = useState(false);

  useEffect(() => {
    if (!data.loggedIn) {
      setTimeout(() => navigate('/login'), 0);
    } else {
      // Initialize socket for notifications - connect to chat namespace
      const newSocket = io('/chat');
      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
  }, [data.loggedIn, navigate]);

  const toggleAvailable = async (event:any) => {
    try {
      const response = await fetch('/users/availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ available: !available })
      });
      if (response.ok) {
        setAvailable(!available);
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    data.loggedIn ?
      <>
        <MatchContextProvider>
          <RootNavbar loggedIn={data.loggedIn} />
          <Container className="page">
            <Row>
              <Col sm={0} md={1}></Col>
                            <Col sm={12} md={10}>
                <div className="d-flex justify-content-between align-items-center mb-4 card surface shadow-soft section">
                  <h2 className="heading-hero mb-0">Welcome to StudyBuddy</h2>
                  <div className="d-flex gap-2">
                    <Button 
                      variant="outline-primary" 
                      size="sm"
                      onClick={() => navigate('/scheduling')}
                    >
                      📅 Manage Schedule
                    </Button>
                    <Button 
                      variant="outline-info" 
                      size="sm"
                      onClick={() => setShowQuickSetup(true)}
                    >
                      🚀 Quick Setup
                    </Button>
                    <Form>
                      <Form.Check
                        type="switch"
                        id="availability-switch"
                        label={available ? 'Available' : 'Not Available'}
                        checked={available}
                        onChange={toggleAvailable}
                      />
                    </Form>
                  </div>
                </div>
                <div className="card surface shadow-soft section mb-3"><ShowBuddies /></div>
                <div className="card surface shadow-soft section mb-3"><BuddiesList /></div>
                <div className="card surface shadow-soft section mb-3"><MatchUsersList /></div>
              </Col>
              
              <Col sm={0} md={1}></Col>
            </Row>
          </Container>
        </MatchContextProvider>
        
        {/* Global Notifications */}
        <Notifications socket={socket} currentUsername={data.username} />
        
        {/* Quick Setup Modal */}
        <QuickSetup 
          show={showQuickSetup}
          onHide={() => setShowQuickSetup(false)}
          navigate={navigate}
        />
      </>
      : <div className='d-flex justify-content-center align-items-center my-auto vh-100'>
        <Spinner animation="border" variant='primary' style={{ width: '100px', height: '100px' }} />
      </div>
  );
}

export const checkLoggedIn = async()=> {
  const response = await fetch('/users/check-logged-in');
  const data = await response.json(); 
  const response1 = await fetch('/users/get-users')
  const data1 = await response1.json();
  const mergedObject = { ...data, ...data1};
  return mergedObject;
}
