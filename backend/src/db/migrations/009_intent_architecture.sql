-- Intent Architecture Schema
-- Enables infinite domain growth without code changes

-- Intent Registry
CREATE TABLE intent_registry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    intent_name TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    pattern_examples JSONB DEFAULT '[]',
    confidence_threshold DECIMAL(3,2) DEFAULT 0.8,
    validation_rules JSONB DEFAULT '{}',
    is_critical BOOLEAN DEFAULT false, -- For medication, finance
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_confidence CHECK (confidence_threshold BETWEEN 0 AND 1)
);

CREATE INDEX idx_intent_registry_critical ON intent_registry(is_critical) WHERE is_critical = true;

-- Signal Definitions
CREATE TABLE signal_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    signal_key TEXT UNIQUE NOT NULL,
    signal_type TEXT NOT NULL, -- string, number, datetime, boolean, array
    description TEXT,
    extractors JSONB DEFAULT '[]', -- [{type: 'regex', pattern: '...', group: 1}]
    validation_rules JSONB DEFAULT '{}',
    unit TEXT, -- For numbers: minutes, dollars, mg
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_signal_type CHECK (signal_type IN ('string', 'number', 'datetime', 'boolean', 'array', 'object'))
);

CREATE INDEX idx_signal_definitions_type ON signal_definitions(signal_type);

-- Extend memory_units (Backward Compatible)
ALTER TABLE memory_units
ADD COLUMN IF NOT EXISTS intent TEXT,
ADD COLUMN IF NOT EXISTS signals JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS extraction_method TEXT DEFAULT 'llm'; -- llm, deterministic, hybrid

CREATE INDEX idx_memory_units_intent ON memory_units(intent) WHERE intent IS NOT NULL;
CREATE INDEX idx_memory_units_signals ON memory_units USING GIN (signals);
CREATE INDEX idx_memory_units_extraction ON memory_units(extraction_method);

-- Intent-Signal mapping (for analytics)
CREATE TABLE intent_signal_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    intent_name TEXT REFERENCES intent_registry(intent_name) ON DELETE CASCADE,
    signal_key TEXT REFERENCES signal_definitions(signal_key) ON DELETE CASCADE,
    is_required BOOLEAN DEFAULT false,
    default_value JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(intent_name, signal_key)
);

CREATE INDEX idx_intent_signal_intent ON intent_signal_mapping(intent_name);
CREATE INDEX idx_intent_signal_key ON intent_signal_mapping(signal_key);

-- View for backward compatibility
CREATE OR REPLACE VIEW activity_log AS
SELECT 
    id,
    user_id,
    raw_input,
    source,
    -- Backward compatibility: map intent to category
    COALESCE(
        category,
        CASE intent
            WHEN 'TRACK_MEDICATION' THEN 'medication'
            WHEN 'TRACK_EXPENSE' THEN 'finance'
            WHEN 'BUILD_HABIT' THEN 'fitness'
            WHEN 'LEARN_SKILL' THEN 'learning'
            ELSE 'generic'
        END
    ) as category,
    intent,
    signals,
    normalized_data,
    confidence_score,
    status,
    extraction_method,
    created_at
FROM memory_units;

COMMENT ON VIEW activity_log IS 'Backward-compatible view mapping intents to categories';
