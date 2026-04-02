-- Function to atomically increment quota for a supplier-project link
-- Checks if quota_used < quota_allocated before incrementing
CREATE OR REPLACE FUNCTION increment_quota(
    p_project_id UUID,
    p_supplier_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_rows_updated INTEGER;
BEGIN
    UPDATE supplier_project_links
    SET quota_used = quota_used + 1
    WHERE project_id = p_project_id
      AND supplier_id = p_supplier_id
      AND status = 'active'
      AND quota_used < quota_allocated;

    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    
    RETURN v_rows_updated > 0;
END;
$$ LANGUAGE plpgsql;
