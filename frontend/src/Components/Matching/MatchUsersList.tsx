import { response } from "express";
import React, { useContext, useEffect, useState } from "react";
import { Button, ListGroup, Container, Row, Col } from "react-bootstrap";
import { Link } from "react-router-dom";
import { MatchContext, MatchContextType } from "./MatchContext";
import UserCard from "../Common/UserCard";
import './MatchUsersList.css';
import '../Common/UserCard.css';

function MatchUsersList() {
  const matchContext = useContext(MatchContext) as MatchContextType;

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

  const handleMatch = async (username: string) => {
    const response = await fetch('/matches/match', {
      method: 'POST',
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
        <h3 className="text-success fw-bold">
          <i className="bi bi-person-check-fill me-2"></i>
          Potential Study Partners
        </h3>
        <div className="text-muted">
          {matchContext.candidates ? matchContext.candidates.length : 0} students available
        </div>
      </div>
      
      {matchContext.candidates && matchContext.candidates.length > 0 ? (
        <div className="user-cards-grid">
          {matchContext.candidates.map((candidate) => (
            <UserCard
              key={candidate.username}
              user={candidate}
              isMatched={false}
              onMatch={() => handleMatch(candidate.username)}
              onViewProfile={() => handleViewProfile(candidate.username)}
              showActions={true}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-5">
          <div className="mb-3">
            <i className="bi bi-search" style={{ fontSize: '3rem', color: '#6c757d' }}></i>
          </div>
          <h5 className="text-muted">No potential partners found</h5>
          <p className="text-muted">
            Try updating your availability or check back later for new students from your university!
          </p>
        </div>
      )}
    </Container>
  );
}

export default MatchUsersList;
