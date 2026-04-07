import React, { useState, useEffect, useRef } from "react";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 10;

export default function UploadForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [files, setFiles] = useState([]); // Changed from single file to array
  const [previews, setPreviews] = useState([]); // Changed to array for multiple previews
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null); // Track upload progress
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

  function handleFileChange(e, mode) {
    resetMessages();
    const selectedFiles = e.target.files;

    if (!selectedFiles || selectedFiles.length === 0) {
      setFiles([]);
      setPreviews([]);
      return;
    }

    // Convert FileList to Array
    const fileArray = Array.from(selectedFiles);

    // For camera mode, only allow 1 file
    const maxAllowed = mode === "camera" ? 1 : MAX_FILES;

    // Validate number of files
    if (fileArray.length > maxAllowed) {
      setError(`You can only upload up to ${maxAllowed} photo${maxAllowed > 1 ? "s" : ""} at a time.`);
      setFiles([]);
      setPreviews([]);
      return;
    }

    // Validate each file size and type
    const validFiles = [];
    const errors = [];

    fileArray.forEach((file, index) => {
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`"${file.name}" is too large (max 10MB)`);
      } else if (!file.type.startsWith("image/")) {
        errors.push(`"${file.name}" is not an image file`);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      setError(errors.join(", "));
      if (validFiles.length === 0) {
        setFiles([]);
        setPreviews([]);
        return;
      }
    }

    // Set valid files and create previews
    setFiles(validFiles);
    const newPreviews = validFiles.map((file) => ({
      url: URL.createObjectURL(file),
      name: file.name,
    }));
    setPreviews(newPreviews);

    // Auto-submit for camera mode
    if (mode === "camera" && validFiles.length > 0) {
      // Small delay to ensure state updates and user sees preview
      setTimeout(() => {
        handleAutoSubmit(validFiles[0]);
      }, 300);
    }
  }

  // Auto-submit function for camera mode
  async function handleAutoSubmit(cameraFile) {
    // Validate name and email before auto-submitting
    if (!name.trim()) {
      setError("Please enter your name before taking a photo.");
      setFiles([]);
      setPreviews([]);
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email before taking a photo.");
      setFiles([]);
      setPreviews([]);
      return;
    }

    setSubmitting(true);
    setUploadProgress("Uploading photo...");

    try {
      const success = await uploadSingleFile(cameraFile);
      if (success) {
        setStatus("Photo uploaded successfully!");
        setFiles([]);
        setPreviews([]);
        setInputMode(null);
      }
    } catch (err) {
      setError("Upload failed: " + (err.message || err));
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
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
    if (files.length === 0) {
      setError("Please attach at least one photo.");
      return false;
    }
    return true;
  }

  // Upload a single file to the backend
  async function uploadSingleFile(file) {
    const form = new FormData();
    form.append("name", name);
    form.append("email", email);
    form.append("photo", file);

    const url = `${apiUrl}/api/upload`;

    const res = await fetch(url, {
      method: "POST",
      body: form,
    });

    if (!res.ok) {
      const txt = await res.text();

      // Check if we got an HTML response (wrong server)
      if (txt.includes("<!DOCTYPE html>") || txt.includes("<html>")) {
        throw new Error("Upload went to wrong server. Make sure backend is running on port 3001.");
      }

      throw new Error(txt || "Upload failed");
    }

    const data = await res.json();
    return data.success;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    resetMessages();
    if (!validate()) return;

    setSubmitting(true);

    try {
      const totalFiles = files.length;
      let successCount = 0;
      let failedFiles = [];

      // Upload files sequentially
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(`Uploading ${i + 1} of ${totalFiles}...`);

        try {
          const success = await uploadSingleFile(file);
          if (success) {
            successCount++;
          } else {
            failedFiles.push(file.name);
          }
        } catch (err) {
          console.error(`Failed to upload ${file.name}:`, err);
          failedFiles.push(file.name);
        }
      }

      // Show results
      if (successCount === totalFiles) {
        setStatus(`All ${totalFiles} photo${totalFiles > 1 ? "s" : ""} uploaded successfully!`);
        setFiles([]);
        setPreviews([]);
        setInputMode(null);
      } else if (successCount > 0) {
        setStatus(`${successCount} of ${totalFiles} photos uploaded successfully.`);
        setError(`Failed to upload: ${failedFiles.join(", ")}`);
      } else {
        setError(`Failed to upload all photos: ${failedFiles.join(", ")}`);
      }
    } catch (err) {
      setError("Upload error: " + (err.message || err));
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
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
          <button type="button" className={`mode-button ${inputMode === "camera" ? "active" : ""}`} onClick={handleCameraClick}>
            📷 Use Camera
          </button>
          <button type="button" className={`mode-button ${inputMode === "gallery" ? "active" : ""}`} onClick={handleGalleryClick}>
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
          onChange={(e) => handleFileChange(e, "camera")}
          style={{ display: "none" }}
        />
        <input
          ref={galleryInputRef}
          name="photo-gallery"
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFileChange(e, "gallery")}
          style={{ display: "none" }}
        />
        <small className="hint">
          Max 10MB per photo. {inputMode === "gallery" ? `Up to ${MAX_FILES} photos.` : ""}
          {files.length > 0 ? ` Selected: ${files.length} photo${files.length > 1 ? "s" : ""}` : ""}
        </small>
      </div>

      {previews.length > 0 && (
        <div className="preview-container">
          {previews.map((preview, index) => (
            <div key={index} className="preview">
              <img src={preview.url} alt={`preview ${index + 1}`} />
              <small className="preview-name">{preview.name}</small>
            </div>
          ))}
        </div>
      )}

      {uploadProgress && <div className="upload-progress">{uploadProgress}</div>}
      {error && <div className="error">{error}</div>}
      {status && <div className="status">{status}</div>}

      <button className="submit" type="submit" disabled={submitting}>
        {submitting ? "Uploading…" : "Submit"}
      </button>
    </form>
  );
}
