
import React, { useEffect, useState } from "react";
import { Button, Container, ListGroup, Card, ListGroupItem, Spinner, Badge, Row, Col } from 'react-bootstrap';
import { useNavigate, useLocation, useLoaderData } from "react-router-dom";
import "./BuddyProfile.css"
import { Carousel } from 'react-responsive-carousel';
import 'react-responsive-carousel/lib/styles/carousel.min.css';
import { FaArrowCircleRight } from 'react-icons/fa';
import RootNavbar from "../Root/RootNavbar";


const BuddyProfile = () => {
  const navigate = useNavigate();
  const data: any = useLoaderData();
  const location = useLocation();
  console.log(location);
  const [buddyprofile, setBuddyprofile] = useState<any>();
  const [buddyUniversity, setbuddyUniversity] = useState<any>();
  const [buddyCourses, setbuddyCourses] = useState<any>([]);
  const [buddyBio, setbuddyBio] = useState<any>();
  const [buddyReview, setbuddyReview] = useState<any>([]);
  const [image, setImage] = useState<string | null>(null);


  useEffect(()=>{
    if (!data.loggedIn) {
      setTimeout(() => navigate("/login"), 0);
    } else {
      const fetchdata = async () => {
            //PUT THE BUDDY INTO THE USERS BUDDY SCHEMA!! done when button clicked
        //now i need to get the buddy's schema
        const singlebuddy = await fetch('/users/matchedbuddyinfo')
        const data = await singlebuddy.json()
        setbuddyCourses(data[0].courses);
        setbuddyUniversity(data[0].university);
        setBuddyprofile(location.state.buddyusername);
        setbuddyBio(data[0].bio);
        setbuddyReview(data[0].reviews); 
        setImage('/users/image/' + location.state.buddyusername); 
      }
      fetchdata();
    }
  }, []);
  
  if(!buddyprofile){
    return <p>Loading...</p>;
  }

  return (
      data.loggedIn ?
      <>
        <RootNavbar loggedIn={data.loggedIn} />

    <Container className="profile-container">
      <Row className="justify-content-center">
        <Col md={8} lg={6}>
          <Card className="profile-card shadow-lg">
            <Card.Body>
                <div className="profile-header">
                    {image && (
                      <div className="profile-image-large">
                        <img src={image} alt="Profile" />
                      </div>
                    )}
                    <div className="profile-info">
                      <h2 className="profile-name">{buddyprofile}</h2>
                      <p className="profile-university">
                        <i className="bi bi-geo-alt-fill me-2"></i>
                        {buddyUniversity}
                      </p>
                    </div>
                </div>

                <div className="courses-section">
                  <h5 className="section-title">
                    <i className="bi bi-book-fill me-2"></i>
                    Enrolled Courses
                  </h5>
                  <div className="courses-grid">
                    {buddyCourses.map((course: string, index: number) => (
                      <Badge 
                        key={index} 
                        bg="primary" 
                        className="course-badge-large"
                      >
                        {course}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="bio-section">
                  <h5 className="section-title">
                    <i className="bi bi-person-lines-fill me-2"></i>
                    About
                  </h5>
                  <p className="bio-content">{buddyBio}</p>
                </div>

                {buddyReview && buddyReview.length > 0 && (
                  <div className="reviews-section">
                    <h5 className="section-title">
                      <i className="bi bi-star-fill me-2"></i>
                      Study Buddy Reviews
                    </h5>
                    <div className="reviews-carousel">
                      <Carousel 
                        axis="horizontal"
                        showStatus={false}
                        showThumbs={false}
                        infiniteLoop={true}
                        autoPlay={true}
                        interval={5000}
                        className="relative"
                        renderArrowNext={(clickHandler, hasNext) => {
                          return (
                            <div
                              className={`${
                                hasNext ? 'absolute' : 'hidden'
                              } top-0 bottom-0 right-0 flex justify-center items-center p-3 opacity-30 hover:opacity-100 cursor-pointer z-20`}
                              onClick={clickHandler}
                            >
                              <FaArrowCircleRight className="w-9 h-9 text-white carousel-arrow next" />
                            </div>
                          );
                        }}
                      >
                        {buddyReview.map((oneReview: any, index: any) => (
                        <div key={index} className="review-card">
                          <div className="review-content">
                            <i className="bi bi-quote quote-icon"></i>
                            <p className="review-text">{oneReview}</p>
                          </div>
                        </div>
                        ))}
                      </Carousel>
                    </div>
                  </div>
                )}

                <div className="action-buttons">
                  <Button 
                    variant="secondary" 
                    size="lg"
                    onClick={() => navigate(-1)}
                    className="back-button"
                  >
                    <i className="bi bi-arrow-left me-2"></i>
                    Back
                  </Button>
                </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
    </>
     : <div className='d-flex justify-content-center align-items-center my-auto vh-100'>
          <Spinner animation="border" variant='primary' style={{ width:'100px', height:'100px' }} />
      </div>
  );
};

export default BuddyProfile;
