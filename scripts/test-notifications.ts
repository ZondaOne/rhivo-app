/**
 * Test script to verify notification system
 * Run with: npx tsx scripts/test-notifications.ts
 */

import { getDbClient } from '../src/db/client';

async function testNotificationSystem() {
  const db = getDbClient();

  console.log('\n=== Testing Notification System ===\n');

  try {
    // 1. Check if notifications table exists
    console.log('1. Checking if notifications table exists...');
    const tableCheck = await db`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'notifications'
      ) as table_exists
    `;
    console.log('   Notifications table exists:', tableCheck[0].table_exists);

    if (!tableCheck[0].table_exists) {
      console.error('   ❌ ERROR: notifications table does not exist!');
      console.log('   Run migration: npm run migrate:up');
      return;
    }

    // 2. Check if notification_type enum exists
    console.log('\n2. Checking if notification_type enum exists...');
    const enumCheck = await db`
      SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'notification_type'
      ) as enum_exists
    `;
    console.log('   Notification_type enum exists:', enumCheck[0].enum_exists);

    // 3. List all notifications
    console.log('\n3. Listing all notifications...');
    const allNotifications = await db`
      SELECT 
        n.id,
        n.user_id,
        n.type,
        n.title,
        n.read,
        n.created_at,
        u.email as user_email
      FROM notifications n
      LEFT JOIN users u ON n.user_id = u.id
      ORDER BY n.created_at DESC
      LIMIT 10
    `;
    console.log(`   Total notifications: ${allNotifications.length}`);
    
    if (allNotifications.length > 0) {
      console.log('\n   Recent notifications:');
      allNotifications.forEach((notif, i) => {
        console.log(`   ${i + 1}. [${notif.type}] ${notif.title}`);
        console.log(`      User: ${notif.user_email} (${notif.user_id})`);
        console.log(`      Read: ${notif.read}`);
        console.log(`      Created: ${notif.created_at}`);
      });
    } else {
      console.log('   ℹ️  No notifications found in database');
    }

    // 4. Check business_owners junction table
    console.log('\n4. Checking business_owners junction table...');
    const businessOwners = await db`
      SELECT 
        bo.business_id,
        bo.user_id,
        bo.is_primary,
        b.name as business_name,
        u.email as owner_email
      FROM business_owners bo
      JOIN businesses b ON bo.business_id = b.id
      JOIN users u ON bo.user_id = u.id
      LIMIT 10
    `;
    console.log(`   Total business-owner relationships: ${businessOwners.length}`);
    
    if (businessOwners.length > 0) {
      console.log('\n   Business-Owner relationships:');
      businessOwners.forEach((rel, i) => {
        console.log(`   ${i + 1}. ${rel.business_name} → ${rel.owner_email}`);
        console.log(`      Primary: ${rel.is_primary}`);
      });
    } else {
      console.log('   ⚠️  WARNING: No business_owners found!');
      console.log('   Checking legacy users table...');
      
      const legacyOwners = await db`
        SELECT 
          u.id as user_id,
          u.email,
          u.business_id,
          b.name as business_name
        FROM users u
        LEFT JOIN businesses b ON u.business_id = b.id
        WHERE u.role = 'owner'
        LIMIT 10
      `;
      
      console.log(`   Legacy owners (from users.business_id): ${legacyOwners.length}`);
      if (legacyOwners.length > 0) {
        legacyOwners.forEach((owner, i) => {
          console.log(`   ${i + 1}. ${owner.email} → ${owner.business_name}`);
        });
      }
    }

    // 5. Get unread notification count per user
    console.log('\n5. Unread notifications per user...');
    const unreadCounts = await db`
      SELECT 
        n.user_id,
        u.email,
        COUNT(*) as unread_count
      FROM notifications n
      JOIN users u ON n.user_id = u.id
      WHERE n.read = FALSE
      GROUP BY n.user_id, u.email
      ORDER BY unread_count DESC
    `;
    
    if (unreadCounts.length > 0) {
      console.log(`   Users with unread notifications: ${unreadCounts.length}`);
      unreadCounts.forEach((row) => {
        console.log(`   - ${row.email}: ${row.unread_count} unread`);
      });
    } else {
      console.log('   No unread notifications');
    }

    console.log('\n=== Test Complete ===\n');

  } catch (error) {
    console.error('Error during test:', error);
  }
}

testNotificationSystem();
