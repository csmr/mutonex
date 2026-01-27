# The Elixir Consolidation Plan

**Aim:** Reduce architectural complexity and resource consumption by consolidating services into the BEAM VM.
**Motivation:** The current microservice architecture imposes unnecessary "Runtime Tax" (RAM/CPU) and latency overhead (HTTP/JSON serialization) for a system that can be efficiently handled by Elixir's concurrency model.

---

### Step 1: Absorb the Webserver

**Goal:** Eliminate the Deno container.
**Concept:** Phoenix (Elixir) replaces the Deno webserver to serve the static frontend bundle (`.js`, `.html`).

1. **Configure Phoenix:** Modify `lib/your_app_web/endpoint.ex` to serve static assets from `priv/static`.
2. **Update Compose:** Map the host `./dist` directory (where the bundler outputs files) to the container's `/app/priv/static`.
3. **Deprecate Deno:** Remove the `webserver` service from `compose.yaml`.
4. **Verification:** Browser accesses port `4000` (Gameserver) directly to load the client.

### Step 2: Absorb the Simulation (Simtellus)

**Goal:** Eliminate the Ruby container.
**Concept:** Port the "pure function" logic from Ruby to Elixir to leverage native execution speed and zero-latency calls.

1. **Port Logic:** Translate `simtellus/*.rb` classes into Elixir modules (e.g., `Game.Planet.Simulation`).
2. **Internalize Calls:** Replace HTTP `Tesla.get()` calls in the Gameserver with direct function calls (e.g., `Game.Planet.Simulation.calculate/1`).
3. **Deprecate Ruby:** Remove the `planet_sim` service from `compose.yaml`.
4. **Benefit:** Removes network latency (~50ms -> <1ms) and eliminates serialization overhead.

### Step 3: The Proxy Decision (Nginx)

**Goal:** Determine necessity of Nginx based on environment.
**Analysis:**

* **False Assumption:** The BEAM VM (via the Cowboy web server) *can* face the internet directly. It is robust and production-grade.
* **Reality:** Nginx is still recommended for **Production** to handle SSL termination (LetsEncrypt), rate limiting, and DDoS protection, but it is **unnecessary complexity for Development**.

**Plan:**

* **Development:** Remove Nginx. Expose Phoenix (Port 4000) directly to localhost.
* **Production:** Keep Nginx. Use it strictly as a reverse proxy for SSL termination (HTTPS -> HTTP) and security headers.

---

## Appendix: Comparative Analysis

**Candidate A:** Elixir Monolith (Chosen)
**Candidate B:** Deno Monolith (Rejected)

| Feature | **Candidate A: Elixir Monolith** | **Candidate B: Deno Monolith** |
| --- | --- | --- |
| **Migration Effort** | **Low.** Logic exists; requires minor porting of Ruby math. | **High.** Requires rewriting complex GenServer game loop to TypeScript. |
| **Concurrency** | **Superior.** Native Actor Model handles thousands of WS connections effortlessly. | **Good.** Async event loop is efficient for I/O but risky for heavy CPU+Concurrency. |
| **Architecture** | **Stateful.** Fault-tolerant Supervisors protect individual game sessions. | **Stateless.** A crash in the loop risks bringing down the entire server. |
| **Ergonomics** | **Split.** Elixir (Backend) + TS (Frontend). | **Unified.** TypeScript everywhere (Shared Types). |
| **Performance** | Best for **Networking/Concurrency**. | Best for **Raw Math Calculation**. |

### Conclusion

Candidate A is selected because the system relies on Elixir's GenServer/Supervisor primitives for game state management, which are non-trivial to replicate in a Node/Deno environment. The cost of maintaining two languages (Elixir/TS) is outweighed by the stability and concurrency benefits of the BEAM VM.
