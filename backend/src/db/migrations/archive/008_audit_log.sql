-- Audit Log for Critical Data
-- Immutable record of all changes to critical records

CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- What was changed
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    operation TEXT NOT NULL, -- INSERT, UPDATE, DELETE
    
    -- Who changed it
    user_id UUID NOT NULL REFERENCES users(id),
    
    -- Change details
    old_values JSONB,
    new_values JSONB NOT NULL,
    
    -- Metadata
    ip_address TEXT,
    user_agent TEXT,
    request_id TEXT,
    
    -- Immutable timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_operation CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE'))
);

CREATE INDEX idx_audit_log_record ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);

-- Trigger function to auto-create audit entries
CREATE OR REPLACE FUNCTION create_audit_entry()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO audit_log (
            table_name, record_id, operation, user_id,
            old_values, new_values
        ) VALUES (
            TG_TABLE_NAME,
            OLD.id,
            'DELETE',
            OLD.user_id,
            row_to_json(OLD),
            '{}'::jsonb
        );
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO audit_log (
            table_name, record_id, operation, user_id,
            old_values, new_values
        ) VALUES (
            TG_TABLE_NAME,
            NEW.id,
            'UPDATE',
            NEW.user_id,
            row_to_json(OLD),
            row_to_json(NEW)
        );
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO audit_log (
            table_name, record_id, operation, user_id,
            old_values, new_values
        ) VALUES (
            TG_TABLE_NAME,
            NEW.id,
            'INSERT',
            NEW.user_id,
            '{}'::jsonb,
            row_to_json(NEW)
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit trigger to memory_units (for critical routines)
CREATE TRIGGER audit_memory_units
AFTER INSERT OR UPDATE OR DELETE ON memory_units
FOR EACH ROW
WHEN (NEW.category IN ('medication', 'finance', 'health') OR OLD.category IN ('medication', 'finance', 'health'))
EXECUTE FUNCTION create_audit_entry();
