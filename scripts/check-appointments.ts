import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function checkAppointments() {
  console.log('Checking appointments in database...\n');

  // Check all appointments
  const allAppointments = await sql`
    SELECT
      id,
      customer_id,
      guest_email,
      guest_name,
      booking_id,
      status,
      slot_start
    FROM appointments
    WHERE deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 20
  `;

  console.log(`Total appointments: ${allAppointments.length}\n`);

  if (allAppointments.length === 0) {
    console.log('No appointments found in database.');
    return;
  }

  console.log('Appointments breakdown:');
  const withCustomer = allAppointments.filter(a => a.customer_id !== null);
  const guestOnly = allAppointments.filter(a => a.customer_id === null && a.guest_email !== null);

  console.log(`- With customer_id: ${withCustomer.length}`);
  console.log(`- Guest bookings (no customer_id): ${guestOnly.length}\n`);

  console.log('Sample appointments:');
  allAppointments.slice(0, 5).forEach(apt => {
    console.log(`\nBooking ID: ${apt.booking_id}`);
    console.log(`  Customer ID: ${apt.customer_id || '(none)'}`);
    console.log(`  Guest Email: ${apt.guest_email || '(none)'}`);
    console.log(`  Status: ${apt.status}`);
    console.log(`  Start: ${apt.slot_start}`);
  });

  // Check for specific email
  const testEmail = 'test1@test.com';
  console.log(`\n\nLooking for appointments with email: ${testEmail}`);

  const withEmail = await sql`
    SELECT
      id,
      customer_id,
      guest_email,
      booking_id,
      status
    FROM appointments
    WHERE (
      guest_email = ${testEmail}
      OR customer_id IN (SELECT id FROM users WHERE LOWER(email) = LOWER(${testEmail}))
    )
    AND deleted_at IS NULL
  `;

  console.log(`Found ${withEmail.length} appointments for ${testEmail}`);
  withEmail.forEach(apt => {
    console.log(`  - ${apt.booking_id}: ${apt.status} (customer_id: ${apt.customer_id || 'none'})`);
  });

  // Check if user exists with that email
  const user = await sql`
    SELECT id, email, role FROM users WHERE LOWER(email) = LOWER(${testEmail}) AND deleted_at IS NULL
  `;

  if (user.length > 0) {
    console.log(`\nUser account found: ${user[0].email} (${user[0].role})`);
    console.log(`User ID: ${user[0].id}`);
  } else {
    console.log(`\nNo user account found for ${testEmail}`);
    console.log('This email may have guest bookings but no customer account.');
  }
}

checkAppointments().catch(console.error);
