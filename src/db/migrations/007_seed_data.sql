-- Migration 007: Seed data
-- Inserts demo business and sample data for development/testing

-- Insert demo business
INSERT INTO businesses (id, subdomain, name, timezone, config_yaml_path, status)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'demo',
    'Demo Salon & Spa',
    'America/Los_Angeles',
    '/config/demo.yaml',
    'active'
);

-- Insert demo owner user
INSERT INTO users (id, email, phone, role, business_id, password_hash)
VALUES (
    '00000000-0000-0000-0000-000000000010',
    'owner@demo.rivo.app',
    '+14155551234',
    'owner',
    '00000000-0000-0000-0000-000000000001',
    -- This is a bcrypt hash for 'demo123' - should be changed in production
    '$2b$10$rqK3D5h.vJGJGqVZ3vVLduXcJz8T8kqNfJE0X0K3uFqF2n0qrHqVy'
);

-- Insert categories
INSERT INTO categories (id, business_id, name, sort_order)
VALUES
    ('00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000001', 'Hair Services', 1),
    ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'Spa Services', 2),
    ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', 'Nail Services', 3);

-- Insert services
INSERT INTO services (id, business_id, category_id, name, duration_minutes, price_cents, color, max_simultaneous_bookings, sort_order)
VALUES
    -- Hair Services
    (
        '00000000-0000-0000-0000-000000001000',
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000100',
        'Haircut',
        45,
        5000,
        '#10b981',
        2,
        1
    ),
    (
        '00000000-0000-0000-0000-000000001001',
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000100',
        'Hair Coloring',
        120,
        15000,
        '#059669',
        1,
        2
    ),
    (
        '00000000-0000-0000-0000-000000001002',
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000100',
        'Blowout',
        30,
        4000,
        '#34d399',
        3,
        3
    ),
    -- Spa Services
    (
        '00000000-0000-0000-0000-000000001010',
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000101',
        'Massage (60 min)',
        60,
        9000,
        '#14b8a6',
        2,
        1
    ),
    (
        '00000000-0000-0000-0000-000000001011',
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000101',
        'Facial',
        60,
        8500,
        '#0d9488',
        2,
        2
    ),
    -- Nail Services
    (
        '00000000-0000-0000-0000-000000001020',
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000102',
        'Manicure',
        45,
        3500,
        '#2dd4bf',
        3,
        1
    ),
    (
        '00000000-0000-0000-0000-000000001021',
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000102',
        'Pedicure',
        60,
        5500,
        '#5eead4',
        3,
        2
    );

-- Insert availability (Monday - Friday: 9 AM - 6 PM, Saturday: 10 AM - 4 PM)
INSERT INTO availability (business_id, day_of_week, start_time, end_time)
VALUES
    ('00000000-0000-0000-0000-000000000001', 1, '09:00:00', '18:00:00'), -- Monday
    ('00000000-0000-0000-0000-000000000001', 2, '09:00:00', '18:00:00'), -- Tuesday
    ('00000000-0000-0000-0000-000000000001', 3, '09:00:00', '18:00:00'), -- Wednesday
    ('00000000-0000-0000-0000-000000000001', 4, '09:00:00', '18:00:00'), -- Thursday
    ('00000000-0000-0000-0000-000000000001', 5, '09:00:00', '18:00:00'), -- Friday
    ('00000000-0000-0000-0000-000000000001', 6, '10:00:00', '16:00:00'); -- Saturday

-- Insert a sample customer
INSERT INTO users (id, email, phone, role, business_id)
VALUES (
    '00000000-0000-0000-0000-000000000020',
    'customer@example.com',
    '+14155555678',
    'customer',
    NULL  -- Customers are not tied to a specific business
);

-- Insert a sample future appointment
INSERT INTO appointments (
    id,
    business_id,
    service_id,
    customer_id,
    slot_start,
    slot_end,
    status,
    idempotency_key,
    cancellation_token
)
VALUES (
    '00000000-0000-0000-0000-000000002000',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000001000', -- Haircut
    '00000000-0000-0000-0000-000000000020',
    NOW() + INTERVAL '2 days' + TIME '14:00:00',
    NOW() + INTERVAL '2 days' + TIME '14:45:00',
    'confirmed',
    'seed-appointment-001',
    'cancel-token-demo-001'
);

-- Comments
COMMENT ON TABLE businesses IS 'Seeded with demo business at subdomain "demo"';
COMMENT ON TABLE users IS 'Seeded with demo owner (owner@demo.rivo.app / demo123) and sample customer';