import React, { useState , useEffect} from "react";
import { Button, Container, Nav, Navbar } from "react-bootstrap";
import { Link, useLoaderData, useNavigate } from "react-router-dom";
import NotificationBell from "../Notifications/NotificationBell";

interface RootNavbarProps {
    loggedIn: Boolean
}

function RootNavbar({ loggedIn }: RootNavbarProps) {
    const navigate = useNavigate();
    const [image, setImage] = useState<string | null>(null);
    const data: any = useLoaderData();

    useEffect(() => {
        if (data.loggedIn) {
            const fetchUserData = async () => {
            // const response = await fetch("/users/image/" + data.username);
            // const image = await response.json();
            setImage('/users/image/' + data.username);
          };
          fetchUserData();
        }
        }, [data.loggedIn, navigate]);

    const logout = async (event: any) => {
        event.preventDefault();

        const response = await fetch('/users/logout');
        const data = await response.json();
        if (data.loggedOut) {
            setTimeout(() => navigate('/login'), 0);
        }
    }

    return (
                <Navbar>
            <Container>
                        <div className="navbar-brand d-flex align-items-center gap-2">
                            {image && (
                                <div className="avatar-ring">
                                    <img src={image} alt="Uploaded file" />
                                </div>
                            )}
                        </div>
                <Navbar.Brand as={Link} to="/welcome">
                    StudyBuddy
                </Navbar.Brand>
                <Navbar.Toggle />
                {loggedIn ?
                    <Navbar.Collapse className="justify-content-between">
                        <Nav>
                            <Nav.Link onClick={() => {navigate('/profile')}}>Edit Profile</Nav.Link>
                            <Nav.Link onClick={() => {navigate('/chats')}}>Chat</Nav.Link>
                            <Nav.Link onClick={() => {navigate('/scheduling')}}>Schedule</Nav.Link>
                        </Nav>
                        <Navbar.Text className="d-flex align-items-center gap-3">
                            <NotificationBell username={data.username} />
                            <Button variant='danger' onClick={logout}>Logout</Button>
                        </Navbar.Text>
                    </Navbar.Collapse>
                : null
                }
            </Container>
        </Navbar>
    )
}

export default RootNavbar;