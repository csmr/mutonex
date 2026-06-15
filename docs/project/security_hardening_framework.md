# Security Hardening & Maintenance Framework (2026-06-16)

This document outlines a standardized framework for maintaining and
improving the security posture of the Mutonex project. It focuses on
generic defensive categories and industry-standard best practices.

## 1. Dependency Management & Supply Chain Security
- **Regular Audits**: Use `mix hex.audit` to identify retired or
  vulnerable packages in the Elixir environment.
- **Deno/NPM Audits**: Utilize `deno audit` or equivalent to scan
  frontend dependencies for known CVEs.
- **Update Cadence**: Establish a monthly cycle for bumping minor and
  patch versions of critical libraries (Phoenix, Ecto, Three.js).

## 2. Application-Level Hardening
- **Static Analysis (SAST)**: Integrate `Sobelow` into the CI/CD
  pipeline to detect Phoenix-specific security misconfigurations
  (e.g., XSS, CSRF, insecure redirects).
- **Authentication Resilience**:
  - Transition from current stubs to robust, timing-safe authentication
    mechanisms (e.g., Argon2 for password hashing).
  - Implement strict session management and rotate signing salts
    regularly via environment variables.
- **Input Validation**: Enforce strict schema validation for all
  incoming WebSocket payloads and API requests to prevent injection.

## 3. Infrastructure & Deployment Security
- **Secret Management**: Ensure all sensitive data (DB passwords,
  API keys, salts) are handled exclusively via encrypted secret
  management or secure environment variables. Never commit `.env`.
- **Least Privilege**: Configure the Postgres persistence layer and
  container processes to run with the minimum necessary permissions.
- **Network Isolation**: Use VPCs or container network isolation to
  ensure the database and internal services are not exposed to the
  public internet.

## 4. Maintenance Itinerary (Recommended)
- [ ] Establish automated SAST scanning with Sobelow.
- [ ] Conduct a formal review of the Authentication module against
  OWASP Top 10 standards.
- [ ] Implement a secrets rotation policy for production environments.
- [ ] Audit the Docker/Compose configurations for container hardening.
