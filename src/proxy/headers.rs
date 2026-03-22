use http::HeaderMap;

/// Filter hop-by-hop and sensitive headers before forwarding upstream.
pub fn filter_headers(headers: &mut HeaderMap) {
    // TODO: remove hop-by-hop headers and apply configurable rules
    const HOP_BY_HOP: [&str; 8] = [
        "connection",
        "keep-alive",
        "proxy-authenticate",
        "proxy-authorization",
        "te",
        "trailers",
        "transfer-encoding",
        "upgrade",
    ];

    for name in &HOP_BY_HOP {
        headers.remove(*name);
    }
}
