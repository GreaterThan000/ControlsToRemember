# Multi-stage build for Rust proxy (container alternative)
FROM rust:1.75 as builder
WORKDIR /workspace

# Copy manifests and source
COPY Cargo.toml Cargo.lock ./
COPY src ./src

# Build in release mode
RUN cargo build --release

# Runtime image
FROM debian:bookworm-slim
ENV RUST_LOG=info
ENV PORT=8080
COPY --from=builder /workspace/target/release/proxy /usr/local/bin/proxy
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/proxy"]
