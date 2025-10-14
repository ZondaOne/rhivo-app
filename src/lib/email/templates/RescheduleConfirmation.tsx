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

interface RescheduleConfirmationEmailProps {
  customerName: string;
  businessName: string;
  serviceName: string;
  oldAppointmentDate: string;
  oldAppointmentTime: string;
  newAppointmentDate: string;
  newAppointmentTime: string;
  bookingId: string;
  price?: string;
  cancellationLink?: string;
  rescheduleLink?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
}

export const RescheduleConfirmationEmail = ({
  customerName = 'John Doe',
  businessName = 'Wellness Spa',
  serviceName = 'Swedish Massage (60 min)',
  oldAppointmentDate = 'Monday, January 15, 2025',
  oldAppointmentTime = '10:00 AM - 11:00 AM',
  newAppointmentDate = 'Tuesday, January 16, 2025',
  newAppointmentTime = '2:00 PM - 3:00 PM',
  bookingId = 'RIVO-ABC-123',
  price = '$50.00',
  cancellationLink = 'https://rivo.app/cancel',
  rescheduleLink = 'https://rivo.app/reschedule',
  businessAddress = '123 Main Street, New York, NY 10001',
  businessPhone = '(555) 123-4567',
  businessEmail = 'hello@wellnessspa.com',
}: RescheduleConfirmationEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Your appointment at {businessName} has been rescheduled</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={h1}>Appointment Rescheduled</Heading>
            <Text style={subtitle}>
              Your appointment at {businessName} has been updated
            </Text>
          </Section>

          {/* Old Appointment (Strikethrough) */}
          <Section style={oldDetailsBox}>
            <Heading as="h2" style={h2Old}>
              Previous Time
            </Heading>

            <Section style={detailRow}>
              <Text style={detailLabelOld}>Service</Text>
              <Text style={detailValueOld}>{serviceName}</Text>
            </Section>

            <Section style={detailRow}>
              <Text style={detailLabelOld}>Date</Text>
              <Text style={detailValueOld}>{oldAppointmentDate}</Text>
            </Section>

            <Section style={detailRow}>
              <Text style={detailLabelOld}>Time</Text>
              <Text style={detailValueOld}>{oldAppointmentTime}</Text>
            </Section>
          </Section>

          {/* New Appointment (Highlighted) */}
          <Section style={newDetailsBox}>
            <Heading as="h2" style={h2New}>
              New Time
            </Heading>

            <Section style={detailRow}>
              <Text style={detailLabel}>Service</Text>
              <Text style={detailValue}>{serviceName}</Text>
            </Section>

            <Section style={detailRow}>
              <Text style={detailLabel}>Date</Text>
              <Text style={detailValueNew}>{newAppointmentDate}</Text>
            </Section>

            <Section style={detailRow}>
              <Text style={detailLabel}>Time</Text>
              <Text style={detailValueNew}>{newAppointmentTime}</Text>
            </Section>

            {price && (
              <Section style={detailRow}>
                <Text style={detailLabel}>Price</Text>
                <Text style={detailValue}>{price}</Text>
              </Section>
            )}

            <Section style={detailRow}>
              <Text style={detailLabel}>Booking ID</Text>
              <Text style={detailValueMuted}>{bookingId}</Text>
            </Section>
          </Section>

          {/* Business Information */}
          {(businessAddress || businessPhone || businessEmail) && (
            <>
              <Hr style={hr} />
              <Section style={businessInfo}>
                <Heading as="h3" style={h3}>
                  {businessName}
                </Heading>
                {businessAddress && (
                  <Text style={businessDetail}>{businessAddress}</Text>
                )}
                {businessPhone && (
                  <Text style={businessDetail}>Phone: {businessPhone}</Text>
                )}
                {businessEmail && (
                  <Text style={businessDetail}>Email: {businessEmail}</Text>
                )}
              </Section>
            </>
          )}

          {/* Action Buttons */}
          <Hr style={hr} />
          <Section style={actionSection}>
            {rescheduleLink && (
              <Link href={rescheduleLink} style={buttonSecondary}>
                Reschedule Again
              </Link>
            )}
            {cancellationLink && (
              <Link href={cancellationLink} style={buttonCancel}>
                Cancel Appointment
              </Link>
            )}
          </Section>

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              This is an automated confirmation email from Rivo.
            </Text>
            <Text style={footerText}>
              Please save this email for your records. Your booking ID is{' '}
              <strong>{bookingId}</strong>
            </Text>
            {/* TODO: Add updated calendar attachment (.ics file) */}
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default RescheduleConfirmationEmail;

// Styles following Rivo's functional minimalism design
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
  marginBottom: '32px',
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

const h2Old = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#6b7280',
  margin: '0 0 12px 0',
  textDecoration: 'line-through',
};

const h2New = {
  fontSize: '20px',
  fontWeight: '600',
  color: '#10b981', // green-500
  margin: '0 0 16px 0',
};

const h3 = {
  fontSize: '18px',
  fontWeight: '600',
  color: '#111827',
  margin: '0 0 12px 0',
};

const oldDetailsBox = {
  backgroundColor: '#f9fafb',
  borderRadius: '12px',
  padding: '20px',
  marginBottom: '16px',
  opacity: '0.6',
};

const newDetailsBox = {
  backgroundColor: '#ecfdf5', // green-50
  border: '2px solid #10b981', // green-500
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

const detailLabelOld = {
  fontSize: '13px',
  color: '#9ca3af',
  margin: '0 0 4px 0',
  fontWeight: '500',
  textDecoration: 'line-through',
};

const detailValue = {
  fontSize: '16px',
  color: '#111827',
  margin: '0',
  fontWeight: '600',
};

const detailValueOld = {
  fontSize: '14px',
  color: '#9ca3af',
  margin: '0',
  fontWeight: '500',
  textDecoration: 'line-through',
};

const detailValueNew = {
  fontSize: '16px',
  color: '#10b981', // green-500
  margin: '0',
  fontWeight: '700',
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
