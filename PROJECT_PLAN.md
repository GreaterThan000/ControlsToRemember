---PLAN-START---
**Execution Plan — Phased Implementation for Production-Ready Rust HTTP Proxy**

Overview: high-level steps first, then detailed phases/tasks. Short plan: Phase 1 = scaffold + basic proxying; Phase 2 = robust request/response handling + streaming; Phase 3 = configuration, middleware, security; Phase 4 = caching, pooling, metrics; Phase 5 = tests, CI, deployment. Tasks are assigned roles (Coder / Designer / Security / DevOps). Tasks note files under `src/` that will be created/modified. Tasks within a phase indicate Parallel/Sequential.

---

**Phase 1 — Project Setup & Core Skeleton**
Parallelism: tasks can run in parallel except 1.3 which depends on 1.1/1.2.

Task 1.1 — Project scaffold  
- Assignee: Coder  
- Files: `src/main.rs`, `src/lib.rs`, `Cargo.toml` (update), `src/errors.rs`  
- Description: Create workspace, add basic `main()` using `tokio::main`, basic error types in `errors.rs`. Add dependencies skeleton.  
- Acceptance criteria: `cargo build` passes; binary runs and returns HTTP 404 for `/`.  
- Est. time: 4h  
- Tests/verification: `cargo build`; run `cargo run` and curl localhost:3000 returns a response (even 404). Unit test: `errors::display()` simple test.

Task 1.2 — Router and entry points  
- Assignee: Coder  
- Files: `src/router.rs`, `src/handler.rs`  
- Description: Implement `router::build()` returning an Axum `Router` with a placeholder `proxy_handler`.  
- Acceptance criteria: Server serves a health endpoint `/healthz` and proxy endpoint accepts requests.  
- Est. time: 4h  
- Tests/verification: Integration smoke: start server and GET `/healthz` -> 200. Unit test: handler type-checking.

Task 1.3 — Minimal proxy module (synchronous pass-through)  
- Assignee: Coder  
- Files: `src/proxy/mod.rs`, `src/proxy/client.rs`, `src/proxy/forward.rs`  
- Description: Implement a minimal outbound client wrapper which forwards request to an upstream URL (read from query/header). Use `reqwest::Client` reuse. Return the upstream response body and status to caller.  
- Acceptance criteria: Server forwards requests to a test upstream and returns upstream status/body.  
- Est. time: 8h  
- Tests/verification: Manual curl to proxy endpoint pointing at a known upstream; unit test mocking `reqwest` via `wiremock` or `httpmock` in later phase.

---

**Phase 2 — Streaming, Header Handling, Timeouts**
Parallelism: Tasks 2.1 and 2.2 can be parallel; 2.3 sequential after 2.1/2.2.

Task 2.1 — Streaming request/response bodies  
- Assignee: Coder  
- Files: `src/proxy/stream.rs`, update `src/proxy/mod.rs`, update `src/handler.rs`  
- Description: Implement streaming of request bodies to upstream and streaming back upstream bodies to clients using `reqwest::Body::wrap_stream` or `reqwest::Response::bytes_stream()` mapped to `axum::body::StreamBody`. Preserve content-length & transfer-encoding semantics.  
- Acceptance criteria: Large request (e.g., 100MB) proxied without buffering entire body in memory; memory usage remains bounded.  
- Est. time: 10h  
- Tests/verification: Integration test with a local mock server that streams a large response; measure that proxy forwards stream with constant memory. Use `tokio::test` to post a stream.

Task 2.2 — Header filtering + hop-by-hop removal  
- Assignee: Coder / Designer  
- Files: `src/proxy/headers.rs`, `src/proxy/mod.rs`, update `src/middleware/logging.rs`  
- Description: Implement header whitelist/blacklist: remove hop-by-hop headers (`Connection`, `Keep-Alive`, `Proxy-Authenticate`, `Proxy-Authorization`, `TE`, `Trailers`, `Transfer-Encoding`, `Upgrade`), filter sensitive headers, and forward safe headers. Provide configurable header rules.  
- Acceptance criteria: Hop-by-hop headers are not forwarded; `Host` header handling is correct per config (preserve or set to upstream host).  
- Est. time: 6h  
- Tests/verification: Unit tests on header filtering logic with multiple combinations. Integration test verifying response headers from upstream are forwarded (minus removed headers).

Task 2.3 — Request/response timeouts and retry policy  
- Assignee: Coder  
- Files: `src/proxy/retry.rs`, update `src/config/mod.rs`  
- Description: Add timeout handling (via `reqwest::Client::timeout` or `tokio::time::timeout`) and simple retry/backoff for idempotent methods. Configurable via config.  
- Acceptance criteria: Requests beyond configured timeout get 504; retry policy applied only to safe methods.  
- Est. time: 6h  
- Tests/verification: Unit test verifying timeout triggers and retry count. Integration test using mock server that delays responses.

---

**Phase 3 — Configuration, Middleware & Security**
Parallelism: Many tasks can be parallel but SSRF checks (3.3) should finish before opening public deployment.

Task 3.1 — Configuration module & structured config  
- Assignee: Coder / Designer  
- Files: `src/config/mod.rs`, `src/config/types.rs`, `src/main.rs` (update to load config)  
- Description: Add config loader via `config` or `figment`, support environment overrides, reload option. Config keys: listen address, allowed_hosts, ip_allowlist/denylist, header rules, timeouts, cache toggles, metrics. Use `serde` for typed config.  
- Acceptance criteria: Config loads from `config/{default,production}.toml` and ENV; app starts with loaded config values.  
- Est. time: 6h  
- Tests/verification: Unit tests for parsing and default values; manual `RUST_LOG=debug` verifying config printed at startup.

Task 3.2 — Logging, tracing, and structured request IDs middleware  
- Assignee: Coder  
- Files: `src/middleware/logging.rs`, update `src/main.rs`, `src/router.rs`  
- Description: Add `tower-http` & `tracing` setup, request-id generation, structured logs, and access logging.  
- Acceptance criteria: Requests have unique IDs, logs include method/path/status/duration/request-id.  
- Est. time: 6h  
- Tests/verification: Manual verification using curl and checking logs; unit test for request-id generation.

Task 3.3 — SSRF and IP validation middleware  
- Assignee: Security / Coder  
- Files: `src/middleware/security.rs`, update `src/proxy/mod.rs`, `src/config/mod.rs`  
- Description: Implement upstream target validation: resolve host to IP(s), block if IP within private or loopback ranges or not in allowlist; optionally support hostname whitelist. Use `trust-dns-resolver` or system `lookup_host` then `ipnet` to check ranges. Also block requests with `localhost`, `169.254.`, `10/8`, `172.16/12`, `192.168/16`, `::1`, etc. Add option for allowlist mode.  
- Acceptance criteria: Requests that resolve to blocked IP ranges are rejected with 403 and logged; a bypass or admin allowlist can be configured.  
- Est. time: 10h  
- Tests/verification: Unit tests for IP range matching; integration tests using a local bind to a private address and verifying blocked; fuzz test variations of hostnames (e.g., DNS rebinding) using mock resolver override.

Task 3.4 — Basic rate-limiting & per-IP limits  
- Assignee: Coder  
- Files: `src/middleware/ratelimit.rs`, update `src/config/mod.rs`  
- Description: Integrate `tower-governor` or `governor` for token-bucket style rate limits by client IP and optionally global limits.  
- Acceptance criteria: Excess requests return 429 and metrics increment.  
- Est. time: 8h  
- Tests/verification: Integration test simulating bursts to confirm 429 responses.

---

**Phase 4 — Caching, Connection Pooling, Metrics**
Parallelism: cache and metrics can be parallel; connection pooling is independent.

Task 4.1 — Cache layer (optional)  
- Assignee: Coder / Designer  
- Files: `src/cache/mod.rs`, `src/proxy/mod.rs`, update `src/config/mod.rs`  
- Description: Implement in-memory TTL cache for GET responses using `moka` or `cached` for thread-safe fast caching; support cache-control respect and stale-while-revalidate. Provide pluggable backend (Redis) hooks.  
- Acceptance criteria: Cache hit returns cached response; cache respects `Vary` and `Cache-Control`.  
- Est. time: 12h  
- Tests/verification: Unit tests for cache key generation and TTL eviction; integration test for cached response behavior and stale-while-revalidate flow.

Task 4.2 — Connection pooling and client reuse  
- Assignee: Coder  
- Files: update `src/proxy/client.rs`, `src/config/mod.rs`  
- Description: Configure `reqwest::Client` for connection pooling, TLS settings, keep-alive and max connections, per-host pools. Expose options for `danger_accept_invalid_certs` only for explicit admin config.  
- Acceptance criteria: Client reuses TCP/TLS connections; throughput measured improvement over naive clients.  
- Est. time: 6h  
- Tests/verification: Benchmark test or load test showing reuse; integration smoke verifying client settings.

Task 4.3 — Metrics & health endpoints  
- Assignee: Coder / DevOps  
- Files: `src/middleware/metrics.rs`, `src/main.rs` (expose `/metrics`)  
- Description: Integrate Prometheus metrics (e.g., `prometheus` crate or `axum-prometheus`), record request counts, latencies, upstream error ratios, cache hit/miss. Add `/metrics` and `/healthz`.  
- Acceptance criteria: Metrics endpoint returns Prometheus format; key metrics are present.  
- Est. time: 6h  
- Tests/verification: Manual scrapes by Prometheus or `curl localhost: /metrics` show metrics; unit test for metrics registration.

---

**Phase 5 — Tests, CI, Deployment, Documentation**
Parallelism: CI and docs can be parallel.

Task 5.1 — Unit and integration test suite  
- Assignee: Coder / QA  
- Files: `tests/integration_proxy.rs`, `tests/ssrf_tests.rs`, `src/proxy/tests.rs` (unit tests in modules)  
- Description: Add comprehensive tests: config parsing, header filtering, SSRF validation, streaming, caching, rate-limiting. Use `wiremock` or `httpmock` to mock upstreams.  
- Acceptance criteria: `cargo test` passes in CI; integration tests use local mock servers and run reliably.  
- Est. time: 16h  
- Tests/verification: `cargo test`; document how to run integration tests locally (see section below).

Task 5.2 — CI pipeline & linting/formatting  
- Assignee: DevOps / Coder  
- Files: `.github/workflows/ci.yml` (not under `src/` but included), and Karma config if needed.  
- Description: Setup GitHub Actions to run `cargo fmt --all -- --check`, `cargo clippy`, `cargo test --all`. Build artifacts for releases.  
- Acceptance criteria: PRs run CI and fail on formatting/clippy/test failures.  
- Est. time: 6h  
- Tests/verification: Open test PR and confirm CI passes/fails accordingly.

Task 5.3 — Release & deployment docs  
- Assignee: DevOps / Designer  
- Files: `README.md` updates, `deploy/` manifests (k8s/helm) optionally.  
- Description: Document environment variables, config options, TLS certificates, secrets handling, recommended limits. Provide a minimal Dockerfile.  
- Acceptance criteria: Clear deployment instructions exist; Docker image builds and runs.  
- Est. time: 6h  
- Tests/verification: Build Docker image and run container locally; verify proxied request.

---

**Dependencies & Coordination Notes**
- Phase 2 depends on Phase 1 (router and proxy skeleton). Phase 3 depends on Phase 2 (streaming & header handling must be stable before security and rate-limiting). Phase 4 depends on Phase 3 config and middleware stabilization.
- Overlapping files: `src/proxy/mod.rs`, `src/proxy/client.rs`, `src/handler.rs`, and `src/config/mod.rs` will be touched by many tasks — coordinate between tasks 1.3, 2.1, 3.3, 4.2. Use short-lived feature branches or locks to avoid conflicts. Security (3.3) must be tightly coordinated because it modifies request routing and validation logic used by streaming (2.1).
- Tests touch most modules: task 5.1 should be started early and incrementally expanded as modules complete.
- Config shape must be agreed early (Task 3.1) — many tasks rely on the same config keys.

---

**Suggested Implementation Details & Crate Recommendations**
- Async/runtime: `tokio` (>=1.28)  
- HTTP server/router: `axum` (>=0.7) + `tower` family for middleware  
- Outbound HTTP client: `reqwest` (>=0.11) with `rustls-tls` feature for TLS (reuse a singleton `reqwest::Client`)  
- Streaming: use `reqwest::Response::bytes_stream()` and convert to `axum::body::StreamBody` or use `hyper::Body::wrap_stream`. Use `tokio_util::io::StreamReader` if necessary.  
- DNS & SSRF checks: `trust-dns-resolver` or `tokio::net::lookup_host`; use `ipnet` or `cidr` to test IP ranges. Consider `getaddrinfo` fallback.  
- Logging & tracing: `tracing`, `tracing-subscriber`, and `tower-http::trace` or custom `tower` middleware.  
- Rate limiting: `tower-governor` or `governor` for token-bucket based limits.  
- Caching: `moka` for concurrent in-memory caching; support optional `redis` via `deadpool-redis`.  
- Config: `config` crate or `figment` + `serde` for typed config.  
- Metrics: `prometheus` crate and `axum` integration (or `axum-prometheus`).  
- Mocking for tests: `wiremock` (Rust crate) or `httpmock` to create deterministic mock upstreams.  
- Optional: `hyper` for low-level control if needed, `bytes` for efficient buffer handling, `flate2` if decompressing.

Key approaches:
- Reuse a single `reqwest::Client` per runtime with tuned pool settings (keep_alive, max_idle_per_host).  
- Implement header filtering strictly (hop-by-hop removal), provide explicit `forwarded` or `x-forwarded-for`; sanitize and append rather than overwrite unless configured.  
- Stream data without full buffering; propagate backpressure.  
- For SSRF: resolve hostname to IPs before connecting; block private/internal addresses unless allowed; check for IPv6-mapped IPv4; handle DNS rebinding by verifying resolved IPs at connect time (and optionally re-check after connect).  
- Add strict timeouts and circuit-breaker patterns for upstreams to avoid resource exhaustion.  
- Provide a safe-by-default config: block local networks, disable insecure TLS by default, require admin opt-in for dangerous options.

Recommended middleware:
- `tracing` based request logging (structured).  
- Timeout middleware via `tower::timeout`.  
- Rate-limiting via `tower-governor`.  
- Metrics collection via `axum-prometheus`.  
- Optional auth middleware for admin endpoints.

---

**File Outline — Small sample of contents**

`src/main.rs`  
- responsibilities: initialize tracing, load config, build router, start server.  
- functions: `fn main() -> Result<()>`, `async fn serve(cfg: Config) -> Result<()>`.

`src/router.rs`  
- responsibilities: compose Axum `Router`, mount middleware, expose `build_router(&AppState) -> Router`.  
- functions: `pub fn build_router(state: Arc<AppState>) -> Router`, `fn health_routes() -> Router`.

`src/handler.rs`  
- responsibilities: top-level handlers for proxy and admin endpoints, extract request context and forward to proxy module.  
- functions: `pub async fn proxy_handler(...) -> impl IntoResponse`, `pub async fn healthz()`.

`src/proxy/mod.rs`  
- responsibilities: orchestrate validation, header handling, streaming, caching decisions.  
- public functions: `pub async fn forward_request(req: Request<Body>, ctx: &ProxyContext) -> Result<Response<Body>>`.  
- modules: `pub mod client; pub mod headers; pub mod stream; pub mod cache;`.

`src/proxy/client.rs`  
- responsibilities: create and maintain a configured `reqwest::Client`, perform actual upstream request, handle timeouts & retries.  
- functions: `pub async fn call_upstream(client: &Client, req: UpstreamRequest) -> Result<UpstreamResponse>`.

`src/config/mod.rs`  
- responsibilities: typed config structures, loader, defaults, validation.  
- functions/types: `pub struct Config { listen: SocketAddr, allowed_hosts: Option<Vec<String>>, ... }`, `pub fn load_config() -> Result<Config>`.

`src/middleware/logging.rs`  
- responsibilities: request tracing middleware, generate request IDs, log access lines.  
- functions: `pub fn make_logging_layer() -> impl Layer`.

`src/cache/mod.rs`  
- responsibilities: cache interface & default in-memory implementation.  
- functions/traits: `pub trait Cache { async fn get(key)->Option<ResponseParts>; async fn insert(key, value, ttl) }`, `pub struct MokaCache`.

`src/errors.rs`  
- responsibilities: error types and conversions for HTTP responses.  
- types/functions: `pub enum ProxyError`, `impl IntoResponse for ProxyError`.

---PLAN-END---
