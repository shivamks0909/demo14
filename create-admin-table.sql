-- Create admins table for admin login
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ
);

-- Insert admin user: admin@opinioninsights.com / admin123
-- Password is stored as plain text for development (system supports both bcrypt and plain text)
INSERT INTO admins (email, password_hash, name, role, created_at)
VALUES (
    'admin@opinioninsights.com',
    'admin123',
    'System Administrator',
    'admin',
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_role ON admins(role);
