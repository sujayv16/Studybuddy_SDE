import React from 'react';
import { Card, Button, Badge, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import './UserCard.css';

interface UserCardProps {
  user: {
    username: string;
    university: string;
    courses: string[];
    bio?: string;
    available?: boolean;
  };
  isMatched?: boolean;
  onMatch?: () => void;
  onUnmatch?: () => void;
  onViewProfile?: () => void;
  showActions?: boolean;
}

const UserCard: React.FC<UserCardProps> = ({ 
  user, 
  isMatched = false, 
  onMatch, 
  onUnmatch, 
  onViewProfile,
  showActions = true 
}) => {
  return (
    <Card className="user-card h-100 shadow-sm">
      <Card.Body className="d-flex flex-column">
        <div className="d-flex align-items-center mb-3">
          <div className="profile-image-container">
            <img
              src={`/users/image/${user.username}`}
              alt={`${user.username}'s profile`}
              className="profile-image"
            />
            {user.available && (
              <div className="availability-indicator">
                <div className="availability-dot"></div>
              </div>
            )}
          </div>
          <div className="user-info ms-3">
            <h5 className="card-title mb-1">{user.username}</h5>
            <p className="card-subtitle text-muted mb-1">{user.university}</p>
            {user.available && (
              <Badge bg="success" className="availability-badge">
                Available Now
              </Badge>
            )}
          </div>
        </div>

        <div className="courses-section mb-3">
          <h6 className="courses-title">Courses:</h6>
          <div className="courses-container">
            {user.courses.slice(0, 3).map((course, index) => (
              <Badge 
                key={index} 
                bg="primary" 
                className="course-badge me-1 mb-1"
              >
                {course}
              </Badge>
            ))}
            {user.courses.length > 3 && (
              <Badge bg="secondary" className="course-badge">
                +{user.courses.length - 3} more
              </Badge>
            )}
          </div>
        </div>

        {user.bio && (
          <div className="bio-section mb-3 flex-grow-1">
            <p className="bio-text">
              {user.bio.length > 100 
                ? `${user.bio.substring(0, 100)}...` 
                : user.bio
              }
            </p>
          </div>
        )}

        {showActions && (
          <div className="card-actions mt-auto">
            <Row>
              <Col>
                <Link 
                  to="/buddyprofile" 
                  state={{ buddyusername: user.username }}
                  className="btn btn-outline-primary btn-sm w-100"
                  onClick={onViewProfile}
                >
                  View Profile
                </Link>
              </Col>
              <Col>
                {isMatched ? (
                  <Button 
                    variant="danger" 
                    size="sm" 
                    className="w-100"
                    onClick={onUnmatch}
                  >
                    Unmatch
                  </Button>
                ) : (
                  <Button 
                    variant="success" 
                    size="sm" 
                    className="w-100"
                    onClick={onMatch}
                  >
                    Match
                  </Button>
                )}
              </Col>
            </Row>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default UserCard;