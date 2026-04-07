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
      setError(`Je kan maximaal ${maxAllowed} foto${maxAllowed > 1 ? "'s" : ""} tegelijk uploaden.`);
      setFiles([]);
      setPreviews([]);
      return;
    }

    // Validate each file size and type
    const validFiles = [];
    const errors = [];

    fileArray.forEach((file, index) => {
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`"${file.name}" is te groot (max 10MB)`);
      } else if (!file.type.startsWith("image/")) {
        errors.push(`"${file.name}" is geen afbeeldingsbestand`);
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
      setError("Vul je naam in voordat je een foto neemt.");
      setFiles([]);
      setPreviews([]);
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Vul een geldig e-mailadres in voordat je een foto neemt.");
      setFiles([]);
      setPreviews([]);
      return;
    }

    setSubmitting(true);
    setUploadProgress("Foto uploaden...");

    try {
      const success = await uploadSingleFile(cameraFile);
      if (success) {
        setStatus("Foto succesvol geüpload!");
        setFiles([]);
        setPreviews([]);
        setInputMode(null);
      }
    } catch (err) {
      setError("Upload mislukt: " + (err.message || err));
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
      setError("Naam is verplicht.");
      return false;
    }
    if (!email.trim()) {
      setError("E-mail is verplicht.");
      return false;
    }
    // simple email check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Vul een geldig e-mailadres in.");
      return false;
    }
    if (!inputMode) {
      setError("Kies camera of galerij.");
      return false;
    }
    if (files.length === 0) {
      setError("Voeg minstens één foto toe.");
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
        throw new Error("Upload ging naar de verkeerde server. Zorg dat de backend draait op poort 3001.");
      }

      throw new Error(txt || "Upload mislukt");
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
        setUploadProgress(`Uploaden ${i + 1} van ${totalFiles}...`);

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
        setStatus(`Alle ${totalFiles} foto${totalFiles > 1 ? "'s" : ""} succesvol geüpload!`);
        setFiles([]);
        setPreviews([]);
        setInputMode(null);
      } else if (successCount > 0) {
        setStatus(`${successCount} van ${totalFiles} foto's succesvol geüpload.`);
        setError(`Upload mislukt voor: ${failedFiles.join(", ")}`);
      } else {
        setError(`Upload mislukt voor alle foto's: ${failedFiles.join(", ")}`);
      }
    } catch (err) {
      setError("Upload fout: " + (err.message || err));
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  }

  return (
    <>
      {/* Loading overlay with TransformArt logo */}
      {(serverStatus === "checking" || submitting) && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="loading-logo-wrapper">
              <img src="/logo.png?v=2" alt="TransformArt" className="loading-logo" />
            </div>
            <div className="loading-text">
              {serverStatus === "checking" ? "Verbinding maken met server..." : "Foto's uploaden..."}
            </div>
            {uploadProgress && <div className="loading-progress">{uploadProgress}</div>}
          </div>
        </div>
      )}

      <form className="upload-form" onSubmit={handleSubmit} noValidate>
        <div className="logo-container">
          <div className="logo-title-left">Fotowedstrijd</div>
          <img src="/logo.png?v=2" alt="Transformart" className="logo" />
          <div className="logo-title-right">TransformArt</div>
        </div>

        <div className="intro-text">
          <p>
            Fijn dat je meedoet aan onze wedstrijd! Upload jouw foto van (1 van) de kunstwerken en maak kans op 1 van onze mooie
            prijzen. Mede mogelijk gemaakt door onze fantastische sponsors.
          </p>
          <p>
            <strong>Vergeet zeker ook niet jouw contactgegevens achter te laten.</strong>
          </p>
          <p className="event-info">De uitreiking van de prijzen vindt plaats om XX uur @de afsprong (Afsneedorp 22)</p>
        </div>
        {serverStatus === "offline" && (
          <div className="error">⚠️ Kan geen verbinding maken met de server op {apiUrl}. Zorg dat de server actief is.</div>
        )}
        {serverStatus === "checking" && <div className="status">Serververbinding controleren...</div>}

        <div className="field contact-fields">
          <label className="field-inline">
            <span className="label">Naam</span>
            <input
              type="text"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jouw volledige naam"
              required
            />
          </label>

          <label className="field-inline">
            <span className="label">E-mail</span>
            <input
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jij@voorbeeld.be"
              required
            />
          </label>
        </div>

        <div className="field file-field">
          <span className="label">Foto</span>
          <div className="input-mode-buttons">
            <button type="button" className={`mode-button ${inputMode === "camera" ? "active" : ""}`} onClick={handleCameraClick}>
              📷 Gebruik Camera
            </button>
            <button type="button" className={`mode-button ${inputMode === "gallery" ? "active" : ""}`} onClick={handleGalleryClick}>
              🖼️ Kies uit Galerij
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
            Max 10MB per foto. {inputMode === "gallery" ? `Tot ${MAX_FILES} foto's.` : ""}
            {files.length > 0 ? ` Geselecteerd: ${files.length} foto${files.length > 1 ? "'s" : ""}` : ""}
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
          {submitting ? "Uploaden…" : "Verzenden"}
        </button>

        <div className="disclaimer" style={{ fontStyle: "italic", marginTop: "1rem", textAlign: "center" }}>
          <small>
            Jouw contactgegevens worden enkel verzameld in functie van de prijsuitreiking van deze fotowedstrijd. Jouw e-mailadres
            wordt niet bewaard, niet gedeeld noch gebruikt voor commerciële doeleinden. Door mee te doen aan de wedstrijd ga je
            ermee akkoord jouw e-mailadres met ons te delen, in het kader van deze fotowedstrijd.
          </small>
        </div>
      </form>
    </>
  );
}
