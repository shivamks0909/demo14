export type Supplier = {
    id: string
    name: string
    supplier_token: string           // short unique key like "XYZ" or "DYN01"
    contact_email?: string | null
    platform_type?: string | null    // dynata / lucid / cint / custom
    uid_macro?: string | null        // their UID macro e.g. ##RID## for Dynata
    complete_redirect_url?: string | null
    terminate_redirect_url?: string | null
    quotafull_redirect_url?: string | null
    notes?: string | null
    status: 'active' | 'paused'
    created_at: string
}

export type SupplierProjectLink = {
    id: string
    supplier_id: string
    project_id: string
    quota_allocated: number
    status: 'active' | 'paused'
    created_at: string
}

export type ProjectAnalytics = {
    project_id: string
    project_name: string
    client_name: string
    status: 'active' | 'paused'
    clicks: number
    completes: number
    terminates: number
    quota_full: number
    conversion_rate: number
}

export type KPIStats = {
    totalClicks: number
    totalCompletes: number
    avgConversion: number
    activeProjects: number
}

export type Client = {
    id: string
    name: string
    created_at: string
}

export type Project = {
    id: string
    client_id: string
    project_name: string
    project_code: string
    country: string
    base_url: string
    // Legacy field — kept for backward compat but no longer injected into URLs
    token_prefix?: string | null
    token_counter?: number | null
    complete_target?: number | null
    status: 'active' | 'paused'
    has_prescreener: boolean
    prescreener_url?: string | null
    is_multi_country: boolean
    country_urls: { country_code: string; target_url: string; active: boolean }[]
    created_at: string
    // Parameter isolation fields (Phase 1 migration)
    client_pid_param?: string | null   // e.g. "pid" — the vendor's PID param name
    client_uid_param?: string | null   // e.g. "uid" — the vendor's UID param name
    oi_prefix?: string,                // Internal tracking prefix, default "oi_"
    target_uid?: string | null,        // Explicit UID override
    // PID Tool fields
    pid_prefix?: string | null,        // e.g. "OPGH"
    pid_counter?: number | null,       // Sequence counter
    pid_padding?: number | null,       // e.g. 2 for "01"
    force_pid_as_uid?: boolean,          // Force generated PID as client UID
    // Multi UID/RID/TOID param mapping
    uid_params?: { param: string; value: string }[] | null
}

export type Response = {
    id: string
    project_id: string
    project_code: string
    project_name: string
    uid: string
    user_uid?: string
    supplier_uid?: string
    client_uid_sent?: string
    hash_identifier?: string
    session_token?: string
    oi_session?: string
    clickid: string
    hash?: string
    supplier_token?: string
    supplier_name?: string
    supplier?: string
    status: 'in_progress' | 'complete' | 'terminate' | 'quota_full' | 'security_terminate' | 'duplicate_ip' | 'duplicate_string'
    ip?: string
    user_agent?: string
    device_type?: string
    last_landing_page?: string
    start_time?: string
    client_pid?: string
    created_at: string
    updated_at?: string
    transaction_id?: string
    is_manual?: boolean
    source?: string
    country_code?: string
    duration_seconds?: number
    completed_at?: string
    s2s_token?: string
    is_fake_suspected?: boolean
}
