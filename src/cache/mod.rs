use async_trait::async_trait;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

#[async_trait]
pub trait Cache: Send + Sync + 'static {
    async fn get(&self, key: &str) -> Option<Vec<u8>>;
    async fn insert(&self, key: &str, value: Vec<u8>);
}

pub struct InMemoryCache {
    inner: Arc<Mutex<HashMap<String, Vec<u8>>>>,
}

impl InMemoryCache {
    pub fn new() -> Self {
        InMemoryCache { inner: Arc::new(Mutex::new(HashMap::new())) }
    }
}

#[async_trait]
impl Cache for InMemoryCache {
    async fn get(&self, key: &str) -> Option<Vec<u8>> {
        self.inner.lock().unwrap().get(key).cloned()
    }

    async fn insert(&self, key: &str, value: Vec<u8>) {
        self.inner.lock().unwrap().insert(key.to_string(), value);
    }
}
