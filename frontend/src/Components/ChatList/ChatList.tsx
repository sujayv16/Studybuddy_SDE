import React, { useEffect, useState } from "react";
import { Button, Col, Container, ListGroup, Row, Spinner } from "react-bootstrap";
import { Link, useLoaderData, useNavigate } from "react-router-dom";
import RootNavbar from "../Root/RootNavbar";
import LoadingSpinner from "../Common/LoadingSpinner";

const ChatList = () => {
  const navigate = useNavigate();
  const data: any = useLoaderData();
  const [chats, setChats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // fetch the users chats when they open then page
  useEffect(() => {
        if (!data.loggedIn) {
          setTimeout(() => navigate("/login"), 0);
        } else {
          const fetchUserChats = async () => {
            try{
              setIsLoading(true);
              const response = await fetch("/chats");
              const data = await response.json();
              setChats(data || []);
            }catch(e){
              console.error(e);
            }finally{
              setIsLoading(false);
            }
          };
          fetchUserChats();
        }
    }, [data.loggedIn, navigate]);



  return (
    data.loggedIn ?
    <>
        <RootNavbar loggedIn={data.loggedIn} />
        <Container>
          <Row>
            <Col sm={0} md={1}></Col>
            <Col sm={12} md={10}>
                <div className="text-center">
                    <h3>Chats</h3>
                </div>
                <Button variant='success' type="submit" className="mt-3" onClick={() => {navigate('/create-chat')}}>New Chat</Button>
               
                {isLoading ? (
                  <div className="py-5 d-flex justify-content-center"><LoadingSpinner size={48} label="Loading chats" /></div>
                ) : (
                  <ListGroup className="mt-4 mb-4">
                    {chats.length > 0 ? chats.map((chat: any) => (
                      <Link
                        to={`/chatroom/${chat.id}`}
                        key={chat._id}
                        className="list-group-item list-group-item-action"
                      >
                        {chat.title}
                      </Link>
                    )) : (
                      <div className="text-center py-4 text-muted">You have no chats yet. Start a new chat to connect with buddies.</div>
                    )}
                  </ListGroup>
                )}
            </Col>
            <Col sm={0} md={1}></Col>
          </Row>
        </Container>
    </>
    : <div className='d-flex justify-content-center align-items-center my-auto vh-100'>
        <Spinner animation="border" variant='primary' style={{ width:'100px', height:'100px' }} />
      </div>
  );



}

export default ChatList