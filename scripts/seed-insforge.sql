-- ===================================================================
-- SAMPLE DATA SEED FOR INSFORGE PRODUCTION
-- ===================================================================
-- Run this AFTER migrate-full-schema.sql
-- This creates test data similar to reset-local-db.js
-- ===================================================================

-- Insert sample client
INSERT INTO clients (id, name)
VALUES (uuid_generate_v4(), 'Test Client')
ON CONFLICT (name) DO NOTHING;

-- Get client ID
DO $$
DECLARE
    client_id UUID;
BEGIN
    SELECT id INTO client_id FROM clients WHERE name = 'Test Client' LIMIT 1;

    -- =====================================================
    -- INSERT SAMPLE PROJECTS
    -- =====================================================

    -- Project 1: Single-country
    INSERT INTO projects (
        id,
        project_code,
        project_name,
        base_url,
        status,
        client_id,
        is_multi_country,
        oi_prefix,
        has_prescreener
    ) VALUES (
        uuid_generate_v4(),
        'TEST_SINGLE',
        'Test Single Country Project',
        'https://survey.example.com/study1',
        'active',
        client_id,
        FALSE,
        'oi_',
        FALSE
    ) ON CONFLICT (project_code) DO NOTHING;

    -- Project 2: Multi-country
    INSERT INTO projects (
        id,
        project_code,
        project_name,
        base_url,
        status,
        client_id,
        is_multi_country,
        country_urls,
        oi_prefix,
        has_prescreener
    ) VALUES (
        uuid_generate_v4(),
        'TEST_MULTI',
        'Test Multi-Country Project',
        'https://survey.example.com/study2',
        'active',
        client_id,
        TRUE,
        '[
            {
                "country_code": "US",
                "target_url": "https://survey.example.com/study2/us",
                "active": true
            },
            {
                "country_code": "GB",
                "target_url": "https://survey.example.com/study2/gb",
                "active": true
            },
            {
                "country_code": "DE",
                "target_url": "https://survey.example.com/study2/de",
                "active": false
            }
        ]'::jsonb,
        'oi_',
        FALSE
    ) ON CONFLICT (project_code) DO NOTHING;

    -- Project 3: Paused project
    INSERT INTO projects (
        id,
        project_code,
        project_name,
        base_url,
        status,
        client_id,
        is_multi_country,
        oi_prefix,
        has_prescreener
    ) VALUES (
        uuid_generate_v4(),
        'TEST_PAUSED',
        'Test Paused Project',
        'https://survey.example.com/study3',
        'paused',
        client_id,
        FALSE,
        'oi_',
        FALSE
    ) ON CONFLICT (project_code) DO NOTHING;

    -- =====================================================
    -- INSERT SAMPLE SUPPLIERS
    -- =====================================================

    -- Supplier 1: Dynata (unlimited quota on TEST_SINGLE)
    INSERT INTO suppliers (
        id,
        name,
        supplier_token,
        platform_type,
        uid_macro,
        complete_redirect_url,
        terminate_redirect_url,
        quotafull_redirect_url
    ) VALUES (
        uuid_generate_v4(),
        'Dynata Test',
        'DYN01',
        'dynata',
        '##RID##',
        'https://dynata.example.com/complete?uid={uid}',
        'https://dynata.example.com/terminate?uid={uid}',
        'https://dynata.example.com/quotafull?uid={uid}'
    ) ON CONFLICT (supplier_token) DO NOTHING;

    -- Supplier 2: Lucid (50 quota on TEST_MULTI)
    INSERT INTO suppliers (
        id,
        name,
        supplier_token,
        platform_type,
        uid_macro
    ) VALUES (
        uuid_generate_v4(),
        'Lucid Test',
        'LUC01',
        'lucid',
        '{{RESPONDENT_ID}}'
    ) ON CONFLICT (supplier_token) DO NOTHING;

    -- Supplier 3: Cint (100 quota on TEST_SINGLE)
    INSERT INTO suppliers (
        id,
        name,
        supplier_token,
        platform_type,
        uid_macro
    ) VALUES (
        uuid_generate_v4(),
        'Cint Test',
        'CIN01',
        'cint',
        '[%RID%]'
    ) ON CONFLICT (supplier_token) DO NOTHOLD;

    -- =====================================================
    -- CREATE SUPPLIER-PROJECT LINKS (with quota)
    -- =====================================================

    -- Get project and supplier IDs
    DECLARE
        proj_single UUID;
        proj_multi UUID;
        supp_dyn UUID;
        supp_luc UUID;
        supp_cin UUID;
    BEGIN
        SELECT id INTO proj_single FROM projects WHERE project_code = 'TEST_SINGLE' LIMIT 1;
        SELECT id INTO proj_multi FROM projects WHERE project_code = 'TEST_MULTI' LIMIT 1;

        SELECT id INTO supp_dyn FROM suppliers WHERE supplier_token = 'DYN01' LIMIT 1;
        SELECT id INTO supp_luc FROM suppliers WHERE supplier_token = 'LUC01' LIMIT 1;
        SELECT id INTO supp_cin FROM suppliers WHERE supplier_token = 'CIN01' LIMIT 1;

        -- DYN01 -> TEST_SINGLE (unlimited)
        INSERT INTO supplier_project_links (
            id,
            supplier_id,
            project_id,
            quota_allocated,
            quota_used,
            status
        ) VALUES (
            uuid_generate_v4(),
            supp_dyn,
            proj_single,
            0, -- unlimited
            0,
            'active'
        ) ON CONFLICT (supplier_id, project_id) DO NOTHING;

        -- LUC01 -> TEST_MULTI (quota 50)
        INSERT INTO supplier_project_links (
            id,
            supplier_id,
            project_id,
            quota_allocated,
            quota_used,
            status
        ) VALUES (
            uuid_generate_v4(),
            supp_luc,
            proj_multi,
            50,
            0,
            'active'
        ) ON CONFLICT (supplier_id, project_id) DO NOTHING;

        -- CIN01 -> TEST_SINGLE (quota 100)
        INSERT INTO supplier_project_links (
            id,
            supplier_id,
            project_id,
            quota_allocated,
            quota_used,
            status
        ) VALUES (
            uuid_generate_v4(),
            supp_cin,
            proj_single,
            100,
            0,
            'active'
        ) ON CONFLICT (supplier_id, project_id) DO NOTHING;
    END;

    RAISE NOTICE 'Sample data inserted successfully!';
END $$;

-- ===================================================================
-- SEED COMPLETE
-- ===================================================================
SELECT 'Sample data seeded for InsForge production' as message;

-- Show inserted data
SELECT
    'PROJECTS' as table_name,
    project_code,
    status,
    base_url
FROM projects
WHERE project_code IN ('TEST_SINGLE', 'TEST_MULTI', 'TEST_PAUSED');

SELECT
    'SUPPLIERS' as table_name,
    supplier_token,
    name,
    platform_type
FROM suppliers
WHERE supplier_token IN ('DYN01', 'LUC01', 'CIN01');

SELECT
    'SUPPLIER_LINKS' as table_name,
    s.supplier_token,
    p.project_code,
    sl.quota_allocated,
    sl.quota_used,
    sl.status
FROM supplier_project_links sl
JOIN suppliers s ON sl.supplier_id = s.id
JOIN projects p ON sl.project_id = p.id
WHERE s.supplier_token IN ('DYN01', 'LUC01', 'CIN01');
