import React, { useEffect, useState } from 'react';
import { Button, ButtonGroup, Col, Container, Form, FormGroup, Row, Stack } from 'react-bootstrap';
import { Link, useLoaderData, useNavigate } from "react-router-dom";
import RootNavbar from '../Root/RootNavbar';
import './LoginPage.css';

function LoginPage() {
  const navigate = useNavigate();
  const data:any = useLoaderData();
 
  useEffect(() => {
    if (data.loggedIn) {
      setTimeout(() => navigate('/welcome'), 0);
    }
  }, [data.loggedIn]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const response = await fetch('/users/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    if (response.ok) {
      // Login successful
      navigate("/welcome")
    } else {
      // Login failed
      alert("Wrong username/password.");
    }
  };

  return (
    <>
    <RootNavbar loggedIn={data.loggedIn} />
    <div className="auth-wrap">
      <div className="auth-card card glass shadow-soft">
        <h2 className="heading-hero">Welcome back</h2>
        <div className="auth-subtitle">Sign in to continue to StudyBuddy</div>
        <Form onSubmit={handleSubmit}>
          <FormGroup className='mb-3' controlId='formUsername'>
            <Form.Label>Username</Form.Label>
            <Form.Control placeholder="Enter your username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} />
          </FormGroup>
          <FormGroup className='mb-4' controlId='formPassword'>
            <Form.Label>Password</Form.Label>
            <Form.Control placeholder="Enter your password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </FormGroup>
          <div className="d-flex justify-content-between">
            <Button onClick={() => {navigate('/signup')}} variant='outline-primary'>Create account</Button>
            <Button variant='primary' type="submit">Sign in</Button>
          </div>
        </Form>
      </div>
    </div>
    </>
    
    
  );
}

export default LoginPage;
