import React, { useState } from "react";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function UploadForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function resetMessages() {
    setError("");
    setStatus("");
  }

  function handleFileChange(e) {
    resetMessages();
    const f = e.target.files && e.target.files[0];
    if (!f) {
      setFile(null);
      setPreview(null);
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      setError("Photo is too large. Max size is 5MB.");
      setFile(null);
      setPreview(null);
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function validate() {
    if (!name.trim()) {
      setError("Name is required.");
      return false;
    }
    if (!email.trim()) {
      setError("Email is required.");
      return false;
    }
    // simple email check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return false;
    }
    if (!file) {
      setError("Please attach a photo.");
      return false;
    }
    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    resetMessages();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("name", name);
      form.append("email", email);
      form.append("photo", file);

      const base = "https://frame-it-server-842270474522.europe-west1.run.app";
      const url = base.replace(/\/+$/, "") + "/api/upload";

      const res = await fetch(url, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Upload failed");
      }
      setStatus("Upload successful. Thank you!");
      setName("");
      setEmail("");
      setFile(null);
      setPreview(null);
    } catch (err) {
      setError("Upload error: " + (err.message || err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="upload-form" onSubmit={handleSubmit} noValidate>
      <h1 className="title">Send a Photo</h1>

      <label className="field">
        <span className="label">Name</span>
        <input name="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" required />
      </label>

      <label className="field">
        <span className="label">Email</span>
        <input
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />
      </label>

      <label className="field file-field">
        <span className="label">Photo</span>
        <input name="photo" type="file" accept="image/*" capture="environment" onChange={handleFileChange} />
        <small className="hint">Max 5MB. Use camera or choose a file.</small>
      </label>

      {preview && (
        <div className="preview">
          <img src={preview} alt="preview" />
        </div>
      )}

      {error && <div className="error">{error}</div>}
      {status && <div className="status">{status}</div>}

      <button className="submit" type="submit" disabled={submitting}>
        {submitting ? "Uploading…" : "Submit"}
      </button>
    </form>
  );
}
