import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Hr,
} from '@react-email/components';
import * as React from 'react';

interface AppointmentReminderEmailProps {
  customerName: string;
  businessName: string;
  serviceName: string;
  appointmentDate: string;
  appointmentTime: string;
  bookingId: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  parkingInstructions?: string;
  preparationInstructions?: string;
  cancellationLink?: string;
  rescheduleLink?: string;
  unsubscribeLink?: string;
}

export const AppointmentReminderEmail = ({
  customerName = 'John Doe',
  businessName = 'Wellness Spa',
  serviceName = 'Swedish Massage (60 min)',
  appointmentDate = 'Monday, January 15, 2025',
  appointmentTime = '10:00 AM - 11:00 AM',
  bookingId = 'RHIVO-ABC-123',
  businessAddress = '123 Main Street, New York, NY 10001',
  businessPhone = '(555) 123-4567',
  businessEmail = 'hello@wellnessspa.com',
  parkingInstructions,
  preparationInstructions,
  cancellationLink = 'https://rhivo.app/cancel',
  rescheduleLink = 'https://rhivo.app/reschedule',
  unsubscribeLink,
}: AppointmentReminderEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>
        Reminder: Your appointment at {businessName} is tomorrow
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={h1}>Appointment Reminder</Heading>
            <Text style={subtitle}>
              Your appointment at {businessName} is coming up
            </Text>
          </Section>

          {/* Reminder Badge */}
          <Section style={reminderBadge}>
            <Text style={reminderText}>Tomorrow at {appointmentTime}</Text>
          </Section>

          {/* Appointment Details */}
          <Section style={detailsBox}>
            <Heading as="h2" style={h2}>
              Appointment Details
            </Heading>

            <Section style={detailRow}>
              <Text style={detailLabel}>Service</Text>
              <Text style={detailValue}>{serviceName}</Text>
            </Section>

            <Section style={detailRow}>
              <Text style={detailLabel}>Date</Text>
              <Text style={detailValue}>{appointmentDate}</Text>
            </Section>

            <Section style={detailRow}>
              <Text style={detailLabel}>Time</Text>
              <Text style={detailValue}>{appointmentTime}</Text>
            </Section>

            <Section style={detailRow}>
              <Text style={detailLabel}>Booking ID</Text>
              <Text style={detailValueMuted}>{bookingId}</Text>
            </Section>
          </Section>

          {/* Business Location */}
          {businessAddress && (
            <>
              <Hr style={hr} />
              <Section style={businessInfo}>
                <Heading as="h3" style={h3}>
                  Location
                </Heading>
                <Text style={businessDetail}>{businessName}</Text>
                <Text style={businessDetail}>{businessAddress}</Text>
                {businessPhone && (
                  <Text style={businessDetail}>Phone: {businessPhone}</Text>
                )}
                {businessEmail && (
                  <Text style={businessDetail}>Email: {businessEmail}</Text>
                )}
              </Section>
            </>
          )}

          {/* Parking Instructions */}
          {parkingInstructions && (
            <>
              <Hr style={hr} />
              <Section style={instructionsSection}>
                <Heading as="h3" style={h3}>
                  Parking Information
                </Heading>
                <Text style={instructionsText}>{parkingInstructions}</Text>
              </Section>
            </>
          )}

          {/* Preparation Instructions */}
          {preparationInstructions && (
            <>
              <Hr style={hr} />
              <Section style={instructionsSection}>
                <Heading as="h3" style={h3}>
                  How to Prepare
                </Heading>
                <Text style={instructionsText}>{preparationInstructions}</Text>
              </Section>
            </>
          )}

          {/* Action Buttons */}
          <Hr style={hr} />
          <Section style={actionSection}>
            {rescheduleLink && (
              <Link href={rescheduleLink} style={buttonSecondary}>
                Reschedule
              </Link>
            )}
            {cancellationLink && (
              <Link href={cancellationLink} style={buttonCancel}>
                Cancel
              </Link>
            )}
          </Section>

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              This is an automated reminder email from Rhivo.
            </Text>
            <Text style={footerText}>
              We look forward to seeing you at {businessName}!
            </Text>
            {/* TODO: Add unsubscribe mechanism for reminder emails */}
            {unsubscribeLink && (
              <Text style={footerText}>
                <Link href={unsubscribeLink} style={unsubscribeLink}>
                  Unsubscribe from reminder emails
                </Link>
              </Text>
            )}
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default AppointmentReminderEmail;

// Styles following Rhivo's functional minimalism design
const main = {
  backgroundColor: '#f9fafb',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif',
};

const container = {
  margin: '40px auto',
  padding: '20px',
  maxWidth: '600px',
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
};

const header = {
  textAlign: 'center' as const,
  marginBottom: '24px',
  paddingTop: '24px',
};

const h1 = {
  fontSize: '30px',
  fontWeight: '700',
  color: '#111827',
  margin: '0 0 8px 0',
  letterSpacing: '-0.011em',
};

const subtitle = {
  fontSize: '16px',
  color: '#6b7280',
  margin: '0',
};

const reminderBadge = {
  textAlign: 'center' as const,
  backgroundColor: '#fef3c7', // amber-100
  border: '2px solid #f59e0b', // amber-500
  borderRadius: '12px',
  padding: '16px',
  marginBottom: '32px',
};

const reminderText = {
  fontSize: '18px',
  fontWeight: '700',
  color: '#b45309', // amber-700
  margin: '0',
};

const h2 = {
  fontSize: '20px',
  fontWeight: '600',
  color: '#111827',
  margin: '0 0 16px 0',
};

const h3 = {
  fontSize: '18px',
  fontWeight: '600',
  color: '#111827',
  margin: '0 0 12px 0',
};

const detailsBox = {
  backgroundColor: '#f9fafb',
  borderRadius: '12px',
  padding: '24px',
  marginBottom: '24px',
};

const detailRow = {
  marginBottom: '12px',
};

const detailLabel = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '0 0 4px 0',
  fontWeight: '500',
};

const detailValue = {
  fontSize: '16px',
  color: '#111827',
  margin: '0',
  fontWeight: '600',
};

const detailValueMuted = {
  fontSize: '14px',
  color: '#9ca3af',
  margin: '0',
  fontFamily: 'monospace',
};

const businessInfo = {
  marginTop: '24px',
  marginBottom: '24px',
};

const businessDetail = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '4px 0',
};

const instructionsSection = {
  marginTop: '24px',
  marginBottom: '24px',
};

const instructionsText = {
  fontSize: '14px',
  color: '#6b7280',
  lineHeight: '1.6',
  margin: '0',
};

const actionSection = {
  textAlign: 'center' as const,
  marginTop: '24px',
  marginBottom: '24px',
};

const buttonSecondary = {
  display: 'inline-block',
  padding: '12px 32px',
  backgroundColor: '#14b8a6', // teal-500
  color: '#ffffff',
  borderRadius: '12px',
  textDecoration: 'none',
  fontWeight: '600',
  fontSize: '14px',
  margin: '8px',
};

const buttonCancel = {
  display: 'inline-block',
  padding: '12px 32px',
  backgroundColor: '#ffffff',
  color: '#6b7280',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  textDecoration: 'none',
  fontWeight: '600',
  fontSize: '14px',
  margin: '8px',
};

const hr = {
  border: 'none',
  borderTop: '1px solid #e5e7eb',
  margin: '24px 0',
};

const footer = {
  textAlign: 'center' as const,
  marginTop: '32px',
};

const footerText = {
  fontSize: '12px',
  color: '#9ca3af',
  margin: '4px 0',
  lineHeight: '1.5',
};

const unsubscribeLinkStyle = {
  color: '#14b8a6',
  textDecoration: 'underline',
};
