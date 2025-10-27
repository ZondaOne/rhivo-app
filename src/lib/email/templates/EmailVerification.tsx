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

interface EmailVerificationProps {
  userName: string;
  verificationUrl: string;
  expiryHours?: number;
}

export const EmailVerification = ({
  userName = 'John Doe',
  verificationUrl = 'https://rhivo.app/auth/verify-email?token=abc123',
  expiryHours = 24,
}: EmailVerificationProps) => {
  return (
    <Html>
      <Head />
      <Preview>Verifica il tuo account Rhivo - Verify your Rhivo account</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={h1}>Verifica la tua Email</Heading>
            <Text style={h1Secondary}>Verify Your Email</Text>
            <Text style={subtitle}>
              Ciao {userName}, benvenuto su Rhivo!
            </Text>
            <Text style={subtitleSecondary}>
              Hi {userName}, welcome to Rhivo!
            </Text>
          </Section>

          {/* Main Content */}
          <Section style={contentBox}>
            <Text style={paragraph}>
              Grazie per esserti registrato su Rhivo. Per completare la registrazione
              e accedere al tuo account, clicca sul pulsante qui sotto per verificare
              il tuo indirizzo email.
            </Text>
            <Text style={paragraphSecondary}>
              Thanks for signing up for Rhivo. To complete your registration and access
              your account, please click the button below to verify your email address.
            </Text>
          </Section>

          {/* Verification Button */}
          <Section style={buttonSection}>
            <Link href={verificationUrl} style={button}>
              Verifica Email / Verify Email
            </Link>
          </Section>

          {/* Alternative Link */}
          <Section style={linkSection}>
            <Text style={alternativeText}>
              Se il pulsante non funziona, copia e incolla questo link nel tuo browser:
            </Text>
            <Text style={alternativeTextSecondary}>
              If the button doesn&apos;t work, copy and paste this link into your browser:
            </Text>
            <Text style={linkText}>
              <Link href={verificationUrl} style={link}>
                {verificationUrl}
              </Link>
            </Text>
          </Section>

          {/* Security Notice */}
          <Hr style={hr} />
          <Section style={securitySection}>
            <Text style={securityTitle}>Informazioni sulla Sicurezza / Security Information</Text>
            <Text style={securityText}>
              • Questo link scadrà tra {expiryHours} ore / This link expires in {expiryHours} hours
            </Text>
            <Text style={securityText}>
              • Se non hai creato questo account, ignora questa email / If you didn&apos;t create this account, please ignore this email
            </Text>
            <Text style={securityText}>
              • Non condividere questo link con nessuno / Never share this link with anyone
            </Text>
          </Section>

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              Questa è un&apos;email automatica da Rhivo.
            </Text>
            <Text style={footerTextSecondary}>
              This is an automated email from Rhivo.
            </Text>
            <Text style={footerText}>
              Se hai bisogno di aiuto, visita il nostro centro assistenza.
            </Text>
            <Text style={footerTextSecondary}>
              If you need help, visit our support center.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default EmailVerification;

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

const contentBox = {
  backgroundColor: '#f9fafb',
  borderRadius: '12px',
  padding: '24px',
  marginBottom: '24px',
};

const paragraph = {
  fontSize: '15px',
  color: '#374151',
  margin: '0 0 12px 0',
  lineHeight: '1.6',
};

const paragraphSecondary = {
  fontSize: '14px',
  color: '#9ca3af',
  margin: '0',
  lineHeight: '1.6',
};

const buttonSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  display: 'inline-block',
  padding: '14px 40px',
  backgroundColor: '#14b8a6', // teal-500
  color: '#ffffff',
  borderRadius: '16px', // rounded-2xl for emphasis
  textDecoration: 'none',
  fontWeight: '600',
  fontSize: '16px',
};

const linkSection = {
  textAlign: 'center' as const,
  marginBottom: '24px',
};

const alternativeText = {
  fontSize: '13px',
  color: '#6b7280',
  margin: '0 0 4px 0',
};

const alternativeTextSecondary = {
  fontSize: '12px',
  color: '#9ca3af',
  margin: '0 0 12px 0',
};

const linkText = {
  fontSize: '12px',
  margin: '8px 0',
};

const link = {
  color: '#14b8a6',
  textDecoration: 'underline',
  wordBreak: 'break-all' as const,
};

const securitySection = {
  backgroundColor: '#f9fafb', // gray-50
  borderRadius: '12px',
  padding: '24px',
  marginTop: '24px',
  border: '1px solid #e5e7eb', // gray-200
};

const securityTitle = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#111827', // gray-900
  margin: '0 0 12px 0',
};

const securityText = {
  fontSize: '13px',
  color: '#6b7280', // gray-500
  margin: '4px 0',
  lineHeight: '1.5',
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
