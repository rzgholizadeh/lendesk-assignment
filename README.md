# Authentication API Challenge

This repository contains an implementation of the authentication API described in the coding challenge.

---

## Overview

The API is built using **Node.js** with **Redis** as the data store.  
It provides endpoints to register and authenticate users, returning JSON responses with appropriate HTTP status codes.  
Each development milestone delivers a complete and functional system, improving iteratively in security and production-readiness.

---

## Iterative Development

The project follows a three-iteration plan:

1. **Iteration 1 (MVP)** — Minimal functional system with registration, login, hashed passwords, and JSON error handling.
2. **Iteration 2 (Security & Robustness)** — Adds password complexity, validation, rate limiting, session expiry, audit logs, and more tests.
3. **Iteration 3 (Production Readiness & Extensibility)** — Adds logout, token revocation, structured logging, project polish, and annotations for future work.

For full details, see [iterations.md](./iterations.md).

---

## Requirements Breakdown

The detailed functional requirements and milestone-specific deliverables are documented in  
[requirements.md](./requirements.md).

---

## Running the Project

Instructions for setup, running the server, and executing tests are provided in the codebase alongside this README.  
Redis must be available and configured for the API to function.

---

## Future Work

Additional enhancements such as MFA, password reset, OAuth integration, and leaked-password checks are noted in the design docs for future development.

---
