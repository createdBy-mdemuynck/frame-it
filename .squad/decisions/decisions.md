# Decision: Run server on PORT=3002 locally

For local development and to avoid conflicts with an existing Node process bound to port 3000, the backend is started with PORT=3002. No code changes required. If CI or deployment expects a different port, update the start scripts or environment accordingly.

---
