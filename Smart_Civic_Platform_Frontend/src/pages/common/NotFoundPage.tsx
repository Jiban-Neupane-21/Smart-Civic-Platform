import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

// For a more robust application, consider moving these styles to a dedicated CSS file
// or using a CSS-in-JS library like styled-components or Emotion.
const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  height: "100vh",
  textAlign: "center",
  fontFamily: "Arial, sans-serif",
  backgroundColor: "#f8f9fa",
  color: "#343a40",
};

const headingStyle: React.CSSProperties = {
  fontSize: "clamp(4rem, 20vw, 8rem)", // Responsive font size
  fontWeight: "bold",
  margin: 0,
  color: "#0056b3",
};

const subHeadingStyle: React.CSSProperties = {
  fontSize: "clamp(1.2rem, 5vw, 1.75rem)",
  marginTop: "0.5rem",
  marginBottom: "1rem",
};

const paragraphStyle: React.CSSProperties = {
  fontSize: "1rem",
  maxWidth: "400px",
  padding: "0 20px",
};

const linkStyle: React.CSSProperties = {
  marginTop: "2rem",
  padding: "12px 24px",
  fontSize: "1rem",
  color: "#fff",
  backgroundColor: "#007bff",
  textDecoration: "none",
  borderRadius: "5px",
  transition: "background-color 0.3s ease",
  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
};

const NotFoundPage: React.FC = () => {
  const { user } = useAuth();
  return (
    <div style={containerStyle}>
      <h1 style={headingStyle}>404</h1>
      <h2 style={subHeadingStyle}>Page Not Found</h2>
      <p style={paragraphStyle}>
        Sorry, the page you are looking for does not exist. It might have been
        moved, deleted, or you may have mistyped the URL.
      </p>
      <Link
        to={user ? `/${user.role}/dashboard` : "/"}
        style={linkStyle}
        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#0056b3")}
        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#007bff")}
      >
        Return to Homepage
      </Link>
    </div>
  );
};

export default NotFoundPage;
