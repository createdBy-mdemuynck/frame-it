import React, { useState, useEffect, useRef } from "react";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function UploadForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [inputMode, setInputMode] = useState(null); // 'camera' or 'gallery'
  const [serverStatus, setServerStatus] = useState("checking");
  const [apiUrl, setApiUrl] = useState("http://localhost:3001"); // Default
  
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  // Fetch runtime configuration from API
  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch("/api/config");
        if (res.ok) {
          const config = await res.json();
          setApiUrl(config.apiUrl);
          console.log("API_BASE configured as:", config.apiUrl);
        }
      } catch (err) {
        console.error("Failed to fetch config, using default:", err);
      }
    }
    fetchConfig();
  }, []);

  // Load saved name and email from localStorage on mount
  useEffect(() => {
    const savedName = localStorage.getItem("userName");
    const savedEmail = localStorage.getItem("userEmail");
    if (savedName) setName(savedName);
    if (savedEmail) setEmail(savedEmail);
  }, []);

  // Check server health when apiUrl changes
  useEffect(() => {
    if (apiUrl) {
      checkServerHealth();
    }
  }, [apiUrl]);

  // Save name and email to localStorage when they change
  useEffect(() => {
    if (name) localStorage.setItem("userName", name);
  }, [name]);

  useEffect(() => {
    if (email) localStorage.setItem("userEmail", email);
  }, [email]);

  async function checkServerHealth() {
    try {
      const res = await fetch(`${apiUrl}/health`);
      if (res.ok) {
        setServerStatus("connected");
      } else {
        setServerStatus("error");
      }
    } catch (err) {
      console.error("Server health check failed:", err);
      setServerStatus("offline");
    }
  }

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

  function handleCameraClick() {
    setInputMode("camera");
    // Automatically trigger the file input to open camera
    setTimeout(() => {
      if (cameraInputRef.current) {
        cameraInputRef.current.click();
      }
    }, 100);
  }

  function handleGalleryClick() {
    setInputMode("gallery");
    // Automatically trigger the file input to open gallery
    setTimeout(() => {
      if (galleryInputRef.current) {
        galleryInputRef.current.click();
      }
    }, 100);
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
    if (!inputMode) {
      setError("Please choose to use camera or gallery.");
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

      const url = `${apiUrl}/api/upload`;
      console.log("=== UPLOAD DEBUG ===");
      console.log("API_BASE:", apiUrl);
      console.log("Upload URL:", url);
      console.log("Form data - name:", name, "email:", email, "file:", file?.name);

      const res = await fetch(url, {
        method: "POST",
        body: form,
      });

      console.log("Response status:", res.status);
      console.log("Response URL:", res.url);

      if (!res.ok) {
        const txt = await res.text();
        console.error("Upload failed - Status:", res.status);
        console.error("Upload failed - Response:", txt.substring(0, 500)); // First 500 chars

        // Check if we got an HTML response (wrong server)
        if (txt.includes("<!DOCTYPE html>") || txt.includes("<html>")) {
          throw new Error("Upload went to wrong server. Make sure backend is running on port 3001.");
        }

        throw new Error(txt || "Upload failed");
      }
      const data = await res.json();
      console.log("Upload success:", data); // Debug log
      setStatus("Upload successful. Thank you!");
      // Don't clear name and email - they're saved in localStorage
      setFile(null);
      setPreview(null);
      setInputMode(null);
    } catch (err) {
      setError("Upload error: " + (err.message || err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="upload-form" onSubmit={handleSubmit} noValidate>
      <h1 className="title">Send a Photo</h1>

      {serverStatus === "offline" && (
        <div className="error">⚠️ Cannot connect to server at {apiUrl}. Make sure the server is running.</div>
      )}
      {serverStatus === "checking" && <div className="status">Checking server connection...</div>}

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

      <div className="field file-field">
        <span className="label">Photo</span>
        <div className="input-mode-buttons">
          <button
            type="button"
            className={`mode-button ${inputMode === "camera" ? "active" : ""}`}
            onClick={handleCameraClick}
          >
            📷 Use Camera
          </button>
          <button
            type="button"
            className={`mode-button ${inputMode === "gallery" ? "active" : ""}`}
            onClick={handleGalleryClick}
          >
            🖼️ Choose from Gallery
          </button>
        </div>
        {/* Hidden file inputs that are triggered programmatically */}
        <input
          ref={cameraInputRef}
          name="photo-camera"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
        <input
          ref={galleryInputRef}
          name="photo-gallery"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
        <small className="hint">Max 5MB. {file ? `Selected: ${file.name}` : ""}</small>
      </div>

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
