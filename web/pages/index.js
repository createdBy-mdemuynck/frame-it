import React from 'react';

export default function Home() {
  return (
    <div style={{ maxWidth: 800, margin: '2rem auto', fontFamily: 'system-ui' }}>
      <h1>Frame It — Upload MVP</h1>
      <p>Simple uploader demo. Collects name, email and a photo to upload.</p>
      <form>
        <label>
          Name <input name="name" />
        </label>
        <br />
        <label>
          Email <input name="email" />
        </label>
        <br />
        <label>
          Photo <input type="file" name="photo" />
        </label>
        <br />
        <button type="submit">Upload</button>
      </form>
    </div>
  );
}
