-- Migration 019: Owner Notifications System
-- Creates the notifications table for in-app business owner notifications
-- Status: Ready
-- Purpose: Enable business owners to receive real-time notifications about booking events

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create notification_type enum
CREATE TYPE notification_type AS ENUM (
  'booking_created',
  'booking_canceled',
  'booking_rescheduled',
  'no_show_marked',
  'appointment_completed'
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT notifications_title_not_empty CHECK (title <> ''),
  CONSTRAINT notifications_message_not_empty CHECK (message <> '')
);

-- Create indexes for performance
CREATE INDEX notifications_user_id_idx ON notifications(user_id);
CREATE INDEX notifications_business_id_idx ON notifications(business_id);
CREATE INDEX notifications_read_created_idx ON notifications(read, created_at DESC);
CREATE INDEX notifications_user_unread_idx ON notifications(user_id, read) WHERE read = FALSE;
CREATE INDEX notifications_appointment_id_idx ON notifications(appointment_id) WHERE appointment_id IS NOT NULL;

-- Add comment
COMMENT ON TABLE notifications IS 'In-app notifications for business owners about booking events';
COMMENT ON COLUMN notifications.read IS 'Whether the owner has read this notification';
COMMENT ON COLUMN notifications.type IS 'Type of notification event';
COMMENT ON COLUMN notifications.appointment_id IS 'Related appointment (NULL if appointment is deleted)';

-- Grant permissions (RLS will be added separately)
-- Basic select/insert permissions for authenticated users
-- Detailed RLS policies will be added in a separate migration if needed
