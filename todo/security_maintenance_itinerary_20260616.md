# Security Maintenance Itinerary (2026-06-16)

This document tracks security maintenance tasks based on the project's
Security Hardening Framework.

## Completed in this session
- [x] **XSS Mitigation**: Replaced unsafe `innerHTML` usage in
  `ActionHUD.ts` and `LobbyView.ts` with `textContent` and DOM
  manipulation.
- [x] **Side-channel Mitigation**: Upgraded API key hash verification
  to use `Plug.Crypto.secure_compare/2` in the `Auth` plug.
- [x] **Dependency Audit**: Verified no retired packages in Elixir
  environment via `mix hex.audit`.
- [x] **SAST baseline**: Performed initial `sobelow` scan to identify
  configuration improvements.
- [x] **PR Ready**: Prepared changelog, relocated documentation, and
  verified all optimizations and security fixes.

## Itinerary (Upcoming)
- [ ] Establish automated SAST scanning with Sobelow in CI/CD.
- [ ] Conduct a formal review of the Authentication module against
  OWASP Top 10 standards.
- [ ] Implement a secrets rotation policy for production environments.
- [ ] Audit the Docker/Compose configurations for container hardening.
