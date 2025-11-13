import { response } from "express";
import React, { useContext, useEffect, useState, useCallback } from "react";
import { Button, ListGroup, Container, Row, Col } from "react-bootstrap";
import { Link } from "react-router-dom";
import { MatchContext, MatchContextType } from "./MatchContext";
import UserCard from "../Common/UserCard";
import './MatchUsersList.css';
import '../Common/UserCard.css';
import { useRef } from 'react';
import LoadingSpinner from "../Common/LoadingSpinner";

function MatchUsersList() {
  const matchContext = useContext(MatchContext) as MatchContextType;
  const [users, setUsers] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);

  const fetchCandidates = async (q: string, p: number) => {
    setIsLoading && setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      params.set('page', String(p));
      params.set('limit', String(limit));
      const res = await fetch(`/matches/candidates?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.candidates || []);
        setTotal(data.total || 0);
      } else {
        console.log('Failed to fetch candidates', res.status);
      }
    } catch (e) {
      console.error(e);
    }
    finally{
      setIsLoading && setIsLoading(false);
    }
  };

  // simple debounce using ref to avoid extra dependency
  const debounceRef = useRef<any>(null);
  const debouncedFetch = useCallback((q: string, p: number) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchCandidates(q, p), 300);
  }, []);

  const [isLoading, setIsLoading] = React.useState(false);

  useEffect(() => {
    // initial load and when context updates
    debouncedFetch(query, page);
    // also update when the global match context is refreshed
  }, [matchContext.candidates, matchContext.buddies, query, page, debouncedFetch]);

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
    <Container className="match-users-container my-4">
      <div className="match-users-header d-flex justify-content-between align-items-center mb-4">
        <h3 className="match-users-title">
          <i className="bi bi-person-check-fill me-2"></i>
          Potential Study Partners
        </h3>
        <div className="d-flex align-items-center gap-3">
          <input
            type="search"
            className="form-control"
            placeholder="Search by username, course or bio (press Enter)..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); debouncedFetch(e.target.value, 1); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); fetchCandidates(query, 1); } }}
            style={{ width: 320 }}
          />
          <div className="text-muted">
            {total} students
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="d-flex justify-content-center py-5">
          <LoadingSpinner size={48} label="Searching..." />
        </div>
      ) : users && users.length > 0 ? (
        <>
          <div className="user-cards-grid">
            {users.map((candidate) => (
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

          <div className="d-flex justify-content-center align-items-center mt-3 gap-2">
            <Button variant="outline-secondary" size="sm" disabled={page <= 1} onClick={() => { setPage(p => Math.max(1, p-1)); fetchCandidates(query, page-1); }}>&laquo; Prev</Button>
            <div>Page {page} of {Math.max(1, Math.ceil(total / limit))}</div>
            <Button variant="outline-secondary" size="sm" disabled={page >= Math.ceil(total / limit)} onClick={() => { setPage(p => p+1); fetchCandidates(query, page+1); }}>Next &raquo;</Button>
          </div>
        </>
      ) : (
        <div className="empty-state">
          <div className="mb-3">
            <i className="bi bi-search empty-state-icon"></i>
          </div>
          <h5>No potential partners found</h5>
          <p>
            Try updating your availability or check back later for new students from your university!
          </p>
        </div>
      )}
    </Container>
  );
}

export default MatchUsersList;
