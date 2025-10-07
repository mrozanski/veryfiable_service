-- Veryfiable Attestation Service Database Schema
-- Version: 0.1.0

-- =====================================================
-- ATTESTATIONS TABLE
-- =====================================================
-- Stores EAS attestations for verified reviews

CREATE TABLE attestations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- EAS fields
  uid VARCHAR(66) UNIQUE NOT NULL,           -- EAS attestation UID (0x...)
  schema_uid VARCHAR(66) NOT NULL,           -- Schema UID from EAS

  -- Platform and item identification
  platform_id VARCHAR(100) NOT NULL,         -- "guitar-registry", "yelp", "amazon", etc.
  item_id VARCHAR(255) NOT NULL,             -- Platform's identifier for the item
  
  -- Review data (denormalized for fast queries)
  review_text TEXT NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 10),
  
  -- EAS signature data (stored as JSON)
  attestation_data JSONB NOT NULL,           -- Full EAS attestation object
  
  -- Attester info
  attester_address VARCHAR(42) NOT NULL,     -- Ethereum address (0x...)
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX idx_platform_item ON attestations(platform_id, item_id);
CREATE INDEX idx_platform ON attestations(platform_id);
CREATE INDEX idx_attester ON attestations(attester_address);
CREATE INDEX idx_rating ON attestations(rating);
CREATE INDEX idx_created_at ON attestations(created_at DESC);

-- Full text search on review text (optional but recommended)
CREATE INDEX idx_review_text_search ON attestations USING gin(to_tsvector('english', review_text));

-- =====================================================
-- SCHEMAS TABLE
-- =====================================================
-- Stores registered EAS schemas

CREATE TABLE schemas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schema_uid VARCHAR(66) UNIQUE NOT NULL,
  schema_name VARCHAR(100) NOT NULL,
  schema_string TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SEED DATA
-- =====================================================
-- Seed with Public Review schema (after registration)
-- Note: Replace '0x...' with actual UID after running register-schema.js

INSERT INTO schemas (schema_uid, schema_name, schema_string, description)
VALUES (
  '0x...', -- Replace with actual UID after running register-schema.js
  'Public Review',
  'string platformId,string itemId,string reviewText,uint8 rating',
  'Universal schema for verified public reviews on any platform'
);
