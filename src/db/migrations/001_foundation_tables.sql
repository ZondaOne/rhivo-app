-- Migration 001: Foundation tables
-- Creates core entities: businesses, users, categories, services

-- Create enum types
CREATE TYPE user_role AS ENUM ('owner', 'staff', 'customer');
CREATE TYPE business_status AS ENUM ('active', 'suspended', 'deleted');
CREATE TYPE appointment_status AS ENUM ('confirmed', 'canceled', 'completed', 'no_show');
CREATE TYPE notification_channel AS ENUM ('email', 'sms', 'webhook');
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed', 'retrying');
CREATE TYPE audit_action AS ENUM ('created', 'confirmed', 'modified', 'canceled', 'completed', 'no_show');

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Businesses table
CREATE TABLE businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subdomain TEXT NOT NULL,
    name TEXT NOT NULL,
    timezone TEXT NOT NULL,
    config_yaml_path TEXT NOT NULL,
    config_version INTEGER DEFAULT 1 NOT NULL,
    status business_status DEFAULT 'active' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ
);

-- Unique subdomain constraint (excluding soft-deleted)
CREATE UNIQUE INDEX businesses_subdomain_unique_idx
    ON businesses (subdomain)
    WHERE deleted_at IS NULL;

-- Index for status queries
CREATE INDEX businesses_status_idx ON businesses (status);

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    phone TEXT,
    role user_role NOT NULL,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    password_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ
);

-- Unique email constraint
CREATE UNIQUE INDEX users_email_unique_idx
    ON users (email)
    WHERE deleted_at IS NULL;

-- Index for business user queries
CREATE INDEX users_business_role_idx ON users (business_id, role);

-- Categories table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0 NOT NULL,
    deleted_at TIMESTAMPTZ
);

-- Unique category name per business
CREATE UNIQUE INDEX categories_business_name_unique_idx
    ON categories (business_id, name)
    WHERE deleted_at IS NULL;

-- Index for sorting
CREATE INDEX categories_business_sort_idx ON categories (business_id, sort_order);

-- Services table
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
    color TEXT DEFAULT '#10b981' NOT NULL,
    max_simultaneous_bookings INTEGER DEFAULT 1 NOT NULL CHECK (max_simultaneous_bookings > 0),
    sort_order INTEGER DEFAULT 0 NOT NULL,
    deleted_at TIMESTAMPTZ
);

-- Unique service name per business
CREATE UNIQUE INDEX services_business_name_unique_idx
    ON services (business_id, name)
    WHERE deleted_at IS NULL;

-- Index for queries and sorting
CREATE INDEX services_business_category_sort_idx
    ON services (business_id, category_id, sort_order);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER businesses_updated_at
    BEFORE UPDATE ON businesses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE businesses IS 'Core tenant/business entity with subdomain and config';
COMMENT ON TABLE users IS 'Owners, staff, and customers - differentiated by role';
COMMENT ON TABLE categories IS 'Service groupings for organizational display';
COMMENT ON TABLE services IS 'Bookable offerings with duration, price, and capacity';