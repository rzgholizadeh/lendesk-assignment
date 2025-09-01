# Requirements and Milestones

This document provides a detailed breakdown of the requirements and how they are addressed across the three development iterations.

---

## Functional Requirements

- **Register new user accounts** with a unique username and password.
- **Authenticate users** with username and password at a separate endpoint.
- Return **200 OK** on success and **401 Unauthorized** for failed authentication.
- Perform **error checking** and return structured JSON error messages.
- Use **Node.js** as the framework and **Redis** as the data store.
- Use **JSON** as the format for all API requests and responses.
- Design system to be **fast and secure**, and annotate areas needing future security work.
- **Unit tests must be written in every iteration** to validate implemented functionality.

---

## Iteration 1 — Minimal Functional System (MVP)

- Registration endpoint to create new users:
  - Enforce unique usernames.
  - Hash passwords before storing in Redis.
- Authentication endpoint to validate login attempts:
  - Respond with 200 OK for valid credentials.
  - Respond with 401 Unauthorized for invalid credentials.
- Error responses in JSON with appropriate HTTP codes (400, 401, 409, etc.).
- Redis data model for storing user accounts and sessions.
- Unit tests for:
  - Successful registration.
  - Duplicate username error.
  - Successful login.
  - Failed login with wrong password.
  - Proper JSON error responses.

**Questions answered in this milestone:**

- How are unique usernames enforced?
- How is a password stored securely?
- What is the minimal Redis schema required to support registration and authentication?
- What are the baseline tests to confirm core functionality?

---

## Iteration 2 — Security and Robustness

- Password complexity validation (length, characters, etc.).
- Input validation for request payloads (username normalization, password requirements).
- Rate limiting on login attempts (per-username and per-IP).
- Session or token expiration handling with Redis TTLs.
- Audit logging of key events (registration, login success, login failure).
- Unit tests for:
  - Password validation failures.
  - Invalid input rejection.
  - Rate limit enforcement.
  - Logging of events.

**Questions answered in this milestone:**

- What rules define a "secure" password?
- How is brute force prevented?
- How do we expire sessions/tokens safely?
- What events should be logged for auditing?
- How are these new features tested?

---

## Iteration 3 — Production Readiness and Extensibility

- Logout endpoint to allow session or token revocation.
- Token revocation or blacklist mechanism stored in Redis.
- More comprehensive error handling and structured logging for observability.
- Project-level improvements:
  - Containerization with Redis.
  - Linting, testing, and coverage.
- Annotate security gaps and future work:
  - Multi-factor authentication.
  - Password reset flows.
  - Integration with external identity providers (OAuth, SAML).
  - Leaked-password checks.
- Unit tests for:
  - Logout flow.
  - Token/session revocation behavior.
  - Structured error responses.
  - Observability improvements (logs, audit trails).

**Questions answered in this milestone:**

- How can users end their sessions securely?
- How do we handle token/session revocation?
- What system improvements make this API closer to production-ready?
- Which security features should be considered for future development?
- How is correctness verified at each stage?

---
