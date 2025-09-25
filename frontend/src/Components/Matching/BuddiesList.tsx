import React, { useContext, useEffect, useState } from "react";
import { Button, ListGroup, Row, Col, Container } from "react-bootstrap";
import { Link, Path } from "react-router-dom";
import { MatchContext, MatchContextType } from "./MatchContext";
import UserCard from "../Common/UserCard";
import '../Common/UserCard.css';

interface MyTo extends Partial<Path>{
  state?:any;
}

function BuddiesList() {
  // This function will be called to add the selected buddy name
  // into the user schema whenever the view button is pressed
  const handleAddBuddy = async(busername: string)=>{
    const response = await fetch('/users/addsinglebuddy', {
      method:'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body:JSON.stringify({buddyname: busername})
    });
    if(!response.ok){
      console.log(response.status)
    }
  }

  // This component will display the current buddies of the current user
  const matchContext = useContext(MatchContext) as MatchContextType;

  const handleUnmatch = async (username: string) => {
    const response = await fetch('/matches/unmatch', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username: username })
    });
    if (response.ok) {
      // All good, update the match context
      matchContext.updateContext();
    } else {
      console.log(response.status);
    }
  };

  const handleViewProfile = async (username: string) => {
    await handleAddBuddy(username);
  };

  return (
    <Container className="my-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="text-primary fw-bold">
          <i className="bi bi-people-fill me-2"></i>
          Your Study Buddies
        </h3>
        <div className="text-muted">
          {matchContext.buddies ? matchContext.buddies.length : 0} buddies
        </div>
      </div>
      
      {matchContext.buddies && matchContext.buddies.length > 0 ? (
        <div className="user-cards-grid">
          {matchContext.buddies.map((buddy) => (
            <UserCard
              key={buddy.username}
              user={buddy}
              isMatched={true}
              onUnmatch={() => handleUnmatch(buddy.username)}
              onViewProfile={() => handleViewProfile(buddy.username)}
              showActions={true}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-5">
          <div className="mb-3">
            <i className="bi bi-person-plus" style={{ fontSize: '3rem', color: '#6c757d' }}></i>
          </div>
          <h5 className="text-muted">No study buddies yet</h5>
          <p className="text-muted">Start matching with other students to find your study buddies!</p>
        </div>
      )}
    </Container>
  );
}

export default BuddiesList;