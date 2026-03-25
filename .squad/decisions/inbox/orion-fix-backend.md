# Inbox decision: Run server on PORT=3002 locally

Decision: For local development and to avoid conflicts with an existing Node process bound to port 3000, I started the backend with PORT=3002. No code changes required.

If CI or deployment expects a different port, update the start scripts or environment accordingly.
