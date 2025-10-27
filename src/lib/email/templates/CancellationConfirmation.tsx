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

interface CancellationConfirmationEmailProps {
  customerName: string;
  businessName: string;
  serviceName: string;
  appointmentDate: string;
  appointmentTime: string;
  bookingId: string;
  rebookingLink?: string;
  businessPhone?: string;
  businessEmail?: string;
}

export const CancellationConfirmationEmail = ({
  customerName = 'John Doe',
  businessName = 'Wellness Spa',
  serviceName = 'Swedish Massage (60 min)',
  appointmentDate = 'Monday, January 15, 2025',
  appointmentTime = '10:00 AM - 11:00 AM',
  bookingId = 'RHIVO-ABC-123',
  rebookingLink = 'https://wellness-spa.rhivo.app',
  businessPhone = '(555) 123-4567',
  businessEmail = 'hello@wellnessspa.com',
}: CancellationConfirmationEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Il tuo appuntamento presso {businessName} è stato annullato</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={h1}>Appuntamento Annullato</Heading>
            <Text style={h1Secondary}>Appointment Cancelled</Text>
            <Text style={subtitle}>
              Il tuo appuntamento presso {businessName} è stato annullato
            </Text>
            <Text style={subtitleSecondary}>
              Your appointment at {businessName} has been cancelled
            </Text>
          </Section>

          {/* Cancelled Appointment Details */}
          <Section style={detailsBox}>
            <Heading as="h2" style={h2}>
              Appuntamento Annullato
            </Heading>
            <Text style={h2Secondary}>Cancelled Appointment</Text>

            <Section style={detailRow}>
              <Text style={detailLabel}>Servizio / Service</Text>
              <Text style={detailValue}>{serviceName}</Text>
            </Section>

            <Section style={detailRow}>
              <Text style={detailLabel}>Data Originale / Original Date</Text>
              <Text style={detailValue}>{appointmentDate}</Text>
            </Section>

            <Section style={detailRow}>
              <Text style={detailLabel}>Orario Originale / Original Time</Text>
              <Text style={detailValue}>{appointmentTime}</Text>
            </Section>

            <Section style={detailRow}>
              <Text style={detailLabel}>ID Prenotazione / Booking ID</Text>
              <Text style={detailValueMuted}>{bookingId}</Text>
            </Section>
          </Section>

          {/* Message */}
          <Section style={messageSection}>
            <Text style={messageText}>
              Ci dispiace vedere che hai annullato il tuo appuntamento. Se hai domande o dubbi, non esitare a contattarci.
            </Text>
            <Text style={messageTextSecondary}>
              We are sorry to see you cancel your appointment. If you have any
              questions or concerns, please do not hesitate to contact us.
            </Text>
          </Section>

          {/* Contact Information */}
          {(businessPhone || businessEmail) && (
            <>
              <Hr style={hr} />
              <Section style={businessInfo}>
                <Heading as="h3" style={h3}>
                  Contatta / Contact {businessName}
                </Heading>
                {businessPhone && (
                  <Text style={businessDetail}>Telefono / Phone: {businessPhone}</Text>
                )}
                {businessEmail && (
                  <Text style={businessDetail}>Email: {businessEmail}</Text>
                )}
              </Section>
            </>
          )}

          {/* Rebooking CTA */}
          {rebookingLink && (
            <>
              <Hr style={hr} />
              <Section style={actionSection}>
                <Text style={ctaText}>
                  Vuoi prenotare un altro appuntamento?
                </Text>
                <Text style={ctaTextSecondary}>
                  Want to book another appointment?
                </Text>
                <Link href={rebookingLink} style={buttonPrimary}>
                  Prenota di Nuovo / Book Again
                </Link>
              </Section>
            </>
          )}

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              Questa è un&apos;email di conferma automatica da Rhivo.
            </Text>
            <Text style={footerTextSecondary}>
              This is an automated confirmation email from Rhivo.
            </Text>
            <Text style={footerText}>
              Se non hai richiesto questa cancellazione, contatta {businessName} immediatamente.
            </Text>
            <Text style={footerTextSecondary}>
              If you did not request this cancellation, please contact{' '}
              {businessName} immediately.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default CancellationConfirmationEmail;

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
  marginBottom: '32px',
  paddingTop: '24px',
};

const h1 = {
  fontSize: '30px',
  fontWeight: '700',
  color: '#111827',
  margin: '0 0 4px 0',
  letterSpacing: '-0.011em',
};

const h1Secondary = {
  fontSize: '18px',
  fontWeight: '500',
  color: '#9ca3af',
  margin: '0 0 12px 0',
  letterSpacing: '-0.011em',
};

const subtitle = {
  fontSize: '16px',
  color: '#6b7280',
  margin: '0 0 4px 0',
};

const subtitleSecondary = {
  fontSize: '14px',
  color: '#9ca3af',
  margin: '0',
};

const h2 = {
  fontSize: '20px',
  fontWeight: '600',
  color: '#111827',
  margin: '0 0 4px 0',
};

const h2Secondary = {
  fontSize: '14px',
  fontWeight: '500',
  color: '#9ca3af',
  margin: '0 0 12px 0',
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

const messageSection = {
  marginBottom: '24px',
};

const messageText = {
  fontSize: '14px',
  color: '#6b7280',
  lineHeight: '1.6',
  margin: '0 0 6px 0',
};

const messageTextSecondary = {
  fontSize: '13px',
  color: '#9ca3af',
  lineHeight: '1.6',
  margin: '0',
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

const ctaText = {
  fontSize: '16px',
  color: '#111827',
  margin: '0 0 4px 0',
  fontWeight: '500',
};

const ctaTextSecondary = {
  fontSize: '14px',
  color: '#9ca3af',
  margin: '0 0 16px 0',
  fontWeight: '500',
};

const buttonPrimary = {
  display: 'inline-block',
  padding: '12px 32px',
  background: 'linear-gradient(to right, #14b8a6, #10b981)', // teal to green gradient for primary CTA
  color: '#ffffff',
  borderRadius: '16px', // rounded-2xl for emphasis
  textDecoration: 'none',
  fontWeight: '600',
  fontSize: '14px',
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

const footerTextSecondary = {
  fontSize: '11px',
  color: '#d1d5db',
  margin: '2px 0',
  lineHeight: '1.5',
};
