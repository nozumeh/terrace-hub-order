import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text } from '@react-email/components'

interface Props {
  siteName?: string
  siteUrl?: string
  recipient?: string
  confirmationUrl?: string
  token?: string
  email?: string
  oldEmail?: string
  newEmail?: string
}

export const SignupEmail = (props: Props) => {
  const { siteName, recipient, confirmationUrl } = props
  return (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>¡Bienvenido a Terraza Gourmet! Confirma tu email para empezar.</Preview>
    <Body style={main}>
      <Section style={wrapper}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>TERRAZA GOURMET</Text>
            <Text style={tagline}>City Market · Caracas</Text>
          </Section>
          <Section style={body}>
            <Heading style={h1}>¡Bienvenido a Terraza Gourmet!</Heading>
            <Text style={text}>Gracias por unirte. Tu almuerzo en City Market está a un solo click. Confirma tu correo para activar tu cuenta y empezar a pedir.</Text>
            
            <Section style={{ textAlign: 'center', margin: '8px 0 24px' }}>
              <Button style={button} href={confirmationUrl}>Confirmar mi email</Button>
            </Section>
            <Text style={footer}>Si no creaste esta cuenta, puedes ignorar este correo. — Terraza Gourmet City Market</Text>
          </Section>
        </Container>
      </Section>
    </Body>
  </Html>
  )
}

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif', margin: 0, padding: 0 }
const wrapper = { backgroundColor: '#ffffff', padding: '32px 16px' }
const container = { maxWidth: '560px', margin: '0 auto', backgroundColor: '#ffffff', border: '1px solid #ece7d8', borderRadius: '12px', overflow: 'hidden' }
const header = { backgroundColor: '#0D1117', padding: '28px 24px', textAlign: 'center' as const }
const brand = { color: '#D4A843', fontSize: '22px', fontWeight: 'bold' as const, margin: 0, letterSpacing: '0.5px' }
const tagline = { color: '#cbb88a', fontSize: '12px', margin: '6px 0 0', letterSpacing: '0.5px' }
const body = { padding: '32px 28px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0D1117', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#5b5f66', lineHeight: '1.6', margin: '0 0 20px' }
const button = { backgroundColor: '#D4A843', color: '#0D1117', fontSize: '15px', fontWeight: 'bold' as const, borderRadius: '8px', padding: '14px 28px', textDecoration: 'none', display: 'inline-block' }
const code = { fontSize: '28px', fontWeight: 'bold' as const, color: '#0D1117', letterSpacing: '6px', backgroundColor: '#faf6ea', border: '1px solid #ece7d8', borderRadius: '8px', padding: '16px 20px', textAlign: 'center' as const, margin: '8px 0 24px' }
const link = { color: '#D4A843', textDecoration: 'underline' }
const footer = { fontSize: '12px', color: '#9aa0a6', margin: '24px 0 0', textAlign: 'center' as const, padding: '0 24px 24px' }
const divider = { borderTop: '1px solid #ece7d8', margin: '24px 0' }
