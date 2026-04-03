-- Function to atomically increment quota for a supplier-project link
-- Enhanced: Auto-creates link if missing and project/supplier are active
CREATE OR REPLACE FUNCTION increment_quota(
    p_project_id UUID,
    p_supplier_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_rows_updated INTEGER;
    v_link_exists BOOLEAN;
    v_project_active BOOLEAN;
    v_supplier_active BOOLEAN;
    v_complete_target INTEGER;
BEGIN
    -- 1. Try to update existing active link with room
    UPDATE supplier_project_links
    SET quota_used = quota_used + 1
    WHERE project_id = p_project_id
      AND supplier_id = p_supplier_id
      AND status = 'active'
      AND quota_used < quota_allocated;

    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    
    IF v_rows_updated > 0 THEN
        RETURN TRUE;
    END IF;

    -- 2. If no rows updated, check if it's because the link doesn't exist or is full
    SELECT EXISTS (
        SELECT 1 FROM supplier_project_links 
        WHERE project_id = p_project_id AND supplier_id = p_supplier_id
    ) INTO v_link_exists;

    IF v_link_exists THEN
        -- Link exists but update failed (likely full or inactive)
        RETURN FALSE;
    END IF;

    -- 3. Link doesn't exist, check project and supplier status
    SELECT (status = 'active'), complete_target 
    FROM projects 
    WHERE id = p_project_id AND deleted_at IS NULL
    INTO v_project_active, v_complete_target;

    SELECT (status = 'active')
    FROM suppliers
    WHERE id = p_supplier_id
    INTO v_supplier_active;

    IF COALESCE(v_project_active, false) AND COALESCE(v_supplier_active, false) THEN
        -- Auto-create link
        INSERT INTO supplier_project_links (
            project_id, 
            supplier_id, 
            quota_allocated, 
            quota_used, 
            status
        ) VALUES (
            p_project_id, 
            p_supplier_id, 
            GREATEST(COALESCE(v_complete_target, 10000), 100), -- Ensure at least some quota
            1, 
            'active'
        );
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;
