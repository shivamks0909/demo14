CREATE OR REPLACE FUNCTION get_project_analytics()
RETURNS TABLE (
    project_id UUID,
    project_name TEXT,
    client_name TEXT,
    status TEXT,
    clicks BIGINT,
    completes BIGINT,
    terminates BIGINT,
    quota_full BIGINT,
    conversion_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as project_id,
        p.project_name,
        c.name as client_name,
        p.status::TEXT,
        COUNT(r.id)::BIGINT as clicks,
        COUNT(r.id) FILTER (WHERE r.status = 'complete')::BIGINT as completes,
        COUNT(r.id) FILTER (WHERE r.status = 'terminate')::BIGINT as terminates,
        COUNT(r.id) FILTER (WHERE r.status = 'quota_full')::BIGINT as quota_full,
        CASE 
            WHEN COUNT(r.id) > 0 THEN (COUNT(r.id) FILTER (WHERE r.status = 'complete')::NUMERIC / COUNT(r.id)::NUMERIC) * 100
            ELSE 0 
        END as conversion_rate
    FROM projects p
    LEFT JOIN clients c ON p.client_id = c.id
    LEFT JOIN responses r ON p.id = r.project_id
    WHERE p.deleted_at IS NULL
    GROUP BY p.id, p.project_name, c.name, p.status;
END;
$$ LANGUAGE plpgsql;
