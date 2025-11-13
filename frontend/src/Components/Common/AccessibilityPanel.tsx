import React, { useContext, useState } from 'react';
import { Button, Form, Offcanvas } from 'react-bootstrap';
import { ThemeContext } from '../../Theme/ThemeContext';

const AccessibilityPanel: React.FC = () => {
  const ctx = useContext(ThemeContext);
  const [open, setOpen] = useState(false);
  if (!ctx) return null;

  return (
    <>
      <Button variant="outline-secondary" size="sm" onClick={() => setOpen(true)} aria-controls="accessibility-panel">Aa</Button>
      <Offcanvas show={open} onHide={() => setOpen(false)} placement="end" id="accessibility-panel">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Text Size</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <Form>
            <Form.Group className="mt-1" controlId="fontSize">
              <Form.Label>Font size</Form.Label>
              <div className="d-flex gap-2">
                {[14,16,18,20,22].map(sz => (
                  <Button key={sz} size="sm" variant={ctx.fontSize === sz ? 'primary' : 'outline-secondary'} onClick={() => ctx.setFontSize(sz)} aria-pressed={ctx.fontSize === sz}>{sz}px</Button>
                ))}
              </div>
            </Form.Group>
          </Form>
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
};

export default AccessibilityPanel;
