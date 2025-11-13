import React, { useContext, useEffect, useState, useRef, useCallback } from "react";
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
  const [users, setUsers] = useState<any[]>(matchContext.buddies || []);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const debounceRef = useRef<any>(null);

  const fetchBuddies = async (q: string, p: number) => {
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      params.set('page', String(p));
      params.set('limit', String(limit));
      const res = await fetch(`/matches/buddies?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        // endpoint may return full array (backcompat) or paginated object
        if (Array.isArray(data)) {
          setUsers(data);
          setTotal(data.length);
        } else {
          setUsers(data.buddies || []);
          setTotal(data.total || data.buddies?.length || 0);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const debouncedFetch = useCallback((q: string, p: number) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchBuddies(q, p), 300);
  }, []);

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

  useEffect(() => {
    // Use context buddies only as initial bootstrap when there is no active query.
    // This avoids overwriting filtered results when MatchContext periodically refreshes.
    if (!query && matchContext.buddies && Array.isArray(matchContext.buddies) && users.length === 0) {
      setUsers(matchContext.buddies);
      setTotal(matchContext.buddies.length);
      return;
    }

    // If there's an active query, fetch filtered/paginated results
    if (query) {
      debouncedFetch(query, page);
    }
    // If no query and users is empty, fetch the paginated list
    if (!query && users.length === 0) {
      debouncedFetch('', page);
    }
  }, [matchContext.buddies, query, page, debouncedFetch]);

  return (
    <Container className="match-users-container my-4">
      <div className="match-users-header d-flex justify-content-between align-items-center mb-4">
        <h3 className="match-users-title">
          <i className="bi bi-people-fill me-2"></i>
          Your Study Buddies
        </h3>
        <div className="d-flex align-items-center gap-3">
          <input
            type="search"
            className="form-control"
            placeholder="Search buddies by name, course or bio..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); debouncedFetch(e.target.value, 1); }}
            style={{ width: 320 }}
          />
          <div className="text-muted">{total} buddies</div>
        </div>
      </div>

      {users && users.length > 0 ? (
        <>
          <div className="user-cards-grid">
            {users.map((buddy) => (
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

          <div className="d-flex justify-content-center align-items-center mt-3 gap-2">
            <Button variant="outline-secondary" size="sm" disabled={page <= 1} onClick={() => { setPage(p => Math.max(1, p-1)); fetchBuddies(query, page-1); }}>&laquo; Prev</Button>
            <div>Page {page} of {Math.max(1, Math.ceil(total / limit))}</div>
            <Button variant="outline-secondary" size="sm" disabled={page >= Math.ceil(total / limit)} onClick={() => { setPage(p => p+1); fetchBuddies(query, page+1); }}>Next &raquo;</Button>
          </div>
        </>
      ) : (
        <div className="empty-state">
          <div className="mb-3">
            <i className="bi bi-person-plus empty-state-icon"></i>
          </div>
          <h5>No study buddies yet</h5>
          <p>
            Start matching with other students to find your study buddies!
          </p>
        </div>
      )}
    </Container>
  );
}

export default BuddiesList;