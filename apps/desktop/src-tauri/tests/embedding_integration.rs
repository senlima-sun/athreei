//! Integration tests for embedding and vector search
//!
//! These tests require the embedding model to be downloaded.
//! Run with: cargo test --test embedding_integration -- --ignored

use aiii_desktop_lib::embedding::{
    cosine_similarity, delete_embedding, get_embedding, insert_embedding, search_vector,
};
use aiii_desktop_lib::storage::Database;

fn setup_db() -> Database {
    let db = Database::in_memory().expect("Failed to create in-memory database");
    db.init_schema().expect("Failed to initialize schema");
    db
}

#[test]
fn test_sqlite_vec_loaded() {
    let db = setup_db();
    let version: String = db
        .connection()
        .query_row("SELECT vec_version()", [], |row| row.get(0))
        .expect("sqlite-vec should be loaded");
    assert!(!version.is_empty());
}

#[test]
fn test_embedding_roundtrip() {
    let db = setup_db();

    // Create a test memory first
    db.connection()
        .execute(
            "INSERT INTO memories (id, source, created_at, updated_at) VALUES ('test-mem-1', 'test', 0, 0)",
            [],
        )
        .expect("Failed to create test memory");

    // Create a test embedding
    let embedding: Vec<f32> = (0..384).map(|i| (i as f32) / 384.0).collect();

    // Insert embedding
    insert_embedding(&db, "test-mem-1", &embedding, "test-model")
        .expect("Failed to insert embedding");

    // Get embedding back
    let retrieved = get_embedding(&db, "test-mem-1")
        .expect("Failed to get embedding")
        .expect("Embedding should exist");

    // Verify dimensions
    assert_eq!(retrieved.len(), 384);

    // Verify values match
    for (i, (a, b)) in embedding.iter().zip(retrieved.iter()).enumerate() {
        assert!(
            (a - b).abs() < 1e-6,
            "Mismatch at index {}: {} vs {}",
            i,
            a,
            b
        );
    }

    // Delete embedding
    delete_embedding(&db, "test-mem-1").expect("Failed to delete embedding");

    // Verify deletion
    let deleted = get_embedding(&db, "test-mem-1").expect("Failed to check embedding");
    assert!(deleted.is_none());
}

#[test]
fn test_vector_search() {
    let db = setup_db();

    // Create test memories
    for i in 0..5 {
        let id = format!("search-mem-{}", i);
        db.connection()
            .execute(
                "INSERT INTO memories (id, source, created_at, updated_at) VALUES (?1, 'test', 0, 0)",
                rusqlite::params![id],
            )
            .expect("Failed to create test memory");

        // Create embeddings with varying similarity to a target
        let mut embedding: Vec<f32> = vec![0.0; 384];
        embedding[0] = 1.0 - (i as f32 * 0.1);
        embedding[1] = 0.5;

        // L2 normalize
        let norm: f32 = embedding.iter().map(|x| x * x).sum::<f32>().sqrt();
        for v in embedding.iter_mut() {
            *v /= norm;
        }

        insert_embedding(&db, &id, &embedding, "test-model").expect("Failed to insert embedding");
    }

    // Search with a query embedding similar to search-mem-0
    let mut query_embedding: Vec<f32> = vec![0.0; 384];
    query_embedding[0] = 1.0;
    query_embedding[1] = 0.5;
    let norm: f32 = query_embedding.iter().map(|x| x * x).sum::<f32>().sqrt();
    for v in query_embedding.iter_mut() {
        *v /= norm;
    }

    let results = search_vector(&db, &query_embedding, 3).expect("Search failed");

    // Should return at least one result
    assert!(!results.is_empty());
    assert!(results.len() <= 3);

    // First result should be search-mem-0 (most similar)
    assert_eq!(results[0].0, "search-mem-0");
}

#[test]
fn test_similarity_functions() {
    // Test identical vectors
    let a = vec![1.0f32, 0.0, 0.0];
    let b = vec![1.0f32, 0.0, 0.0];
    let sim = cosine_similarity(&a, &b);
    assert!((sim - 1.0).abs() < 0.0001);

    // Test orthogonal vectors
    let a = vec![1.0f32, 0.0, 0.0];
    let b = vec![0.0f32, 1.0, 0.0];
    let sim = cosine_similarity(&a, &b);
    assert!(sim.abs() < 0.0001);

    // Test opposite vectors
    let a = vec![1.0f32, 0.0, 0.0];
    let b = vec![-1.0f32, 0.0, 0.0];
    let sim = cosine_similarity(&a, &b);
    assert!((sim + 1.0).abs() < 0.0001);
}

#[test]
#[ignore]
fn test_model_encoding() {
    // This test is ignored by default because it requires the model to be downloaded
    // Run with: cargo test --test embedding_integration test_model_encoding -- --ignored

    use aiii_desktop_lib::embedding::{init_model, get_model};
    use std::path::Path;
    use std::time::Instant;

    // Note: This assumes the model is downloaded to a specific location
    // In practice, you'd need to set up the app_data_dir appropriately
    let app_data_dir = std::env::temp_dir().join("aiii-test");

    if let Err(_) = init_model(&app_data_dir) {
        println!("Model not downloaded, skipping model encoding test");
        return;
    }

    let model = get_model().expect("Model should be loaded after init");

    // Test English text
    let start = Instant::now();
    let english_embedding = model.encode("Hello, this is a test sentence in English").unwrap();
    let english_time = start.elapsed();
    println!("English encoding took: {:?}", english_time);
    assert_eq!(english_embedding.len(), 384);

    // Test Chinese text
    let start = Instant::now();
    let chinese_embedding = model.encode("你好，这是一个中文测试句子").unwrap();
    let chinese_time = start.elapsed();
    println!("Chinese encoding took: {:?}", chinese_time);
    assert_eq!(chinese_embedding.len(), 384);

    // Verify embeddings are normalized (L2 norm ~1.0)
    let english_norm: f32 = english_embedding.iter().map(|x| x * x).sum::<f32>().sqrt();
    let chinese_norm: f32 = chinese_embedding.iter().map(|x| x * x).sum::<f32>().sqrt();
    assert!((english_norm - 1.0).abs() < 0.01);
    assert!((chinese_norm - 1.0).abs() < 0.01);

    // Verify similar sentences have high similarity
    let similar_embedding = model.encode("Hi, this is a test sentence").unwrap();
    let similarity = cosine_similarity(&english_embedding, &similar_embedding);
    println!("Similarity between similar sentences: {}", similarity);
    assert!(similarity > 0.7);
}
