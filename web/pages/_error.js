import React from "react";

function Error({ statusCode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif', background: '#fafafa' }}>
      <h1 style={{ fontSize: '3rem', color: '#d32f2f' }}>Oops!</h1>
      <p style={{ fontSize: '1.5rem' }}>
        {statusCode
          ? `An error ${statusCode} occurred on server.`
          : 'An error occurred on client.'}
      </p>
      <a href="/" style={{ marginTop: 24, color: '#1976d2', textDecoration: 'underline' }}>Go back home</a>
    </div>
  );
}

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
