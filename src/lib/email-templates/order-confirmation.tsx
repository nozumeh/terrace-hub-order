import * as React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface OrderItem { name: string; quantity: number; variant?: string }
interface Props {
  orderNumber?: string | number
  customerName?: string
  store?: string
  floor?: string
  items?: OrderItem[]
  notes?: string
}

const OrderConfirmationEmail = ({ orderNumber, customerName, store, floor, items = [], notes }: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>{`Pedido #${orderNumber ?? ''} confirmado · Terraza Gourmet`}</Preview>
    <Body style={main}>
      <Section style={wrapper}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>TERRAZA GOURMET</Text>
            <Text style={tagline}>City Market · Caracas</Text>
          </Section>
          <Section style={body}>
            <Heading style={h1}>¡Recibimos tu pedido!</Heading>
            <Text style={orderNum}>PEDIDO #{String(orderNumber ?? '').padStart(4, '0')}</Text>
            <Text style={text}>
              {customerName ? `Hola ${customerName}, ` : 'Hola, '}
              gracias por tu pedido. Lo estamos preparando con cariño y te lo llevamos a tu tienda.
            </Text>

            <Section style={infoBox}>
              <Text style={infoLabel}>Entrega</Text>
              <Text style={infoValue}>{store ?? '—'}</Text>
              <Text style={infoLabel}>Piso</Text>
              <Text style={{ ...infoValue, margin: 0 }}>{floor ?? '—'}</Text>
            </Section>

            <Text style={{ ...infoLabel, margin: '0 0 8px' }}>Tu pedido</Text>
            <Section style={{ margin: '0 0 20px' }}>
              {items.map((it, i) => (
                <Text key={i} style={itemRow}>
                  <strong>{it.quantity}×</strong> {it.name}
                  {it.variant ? ` — ${it.variant}` : ''}
                </Text>
              ))}
            </Section>

            {notes && (
              <Section style={infoBox}>
                <Text style={infoLabel}>Notas</Text>
                <Text style={{ ...text, margin: 0 }}>{notes}</Text>
              </Section>
            )}

            <Text style={footer}>Recibirás notificaciones cuando tu pedido cambie de estado.</Text>
          </Section>
        </Container>
      </Section>
    </Body>
  </Html>
)

export const template = {
  component: OrderConfirmationEmail,
  subject: (d: Record<string, any>) => `Pedido #${String(d.orderNumber ?? '').padStart(4, '0')} confirmado · Terraza Gourmet`,
  displayName: 'Confirmación de pedido',
  previewData: {
    orderNumber: 1234,
    customerName: 'María',
    store: 'Farmatodo',
    floor: '3',
    items: [
      { name: 'Bowl mediterráneo', quantity: 1, variant: 'Con pollo' },
      { name: 'Jugo verde', quantity: 2 },
    ],
    notes: 'Sin cebolla por favor',
  },
} satisfies TemplateEntry

export default OrderConfirmationEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif', margin: 0, padding: 0 }
const wrapper = { backgroundColor: '#ffffff', padding: '32px 16px' }
const container = { maxWidth: '560px', margin: '0 auto', backgroundColor: '#ffffff', border: '1px solid #ece7d8', borderRadius: '12px', overflow: 'hidden' }
const header = { backgroundColor: '#0D1117', padding: '28px 24px', textAlign: 'center' as const }
const brand = { color: '#D4A843', fontSize: '22px', fontWeight: 'bold' as const, margin: 0, letterSpacing: '0.5px' }
const tagline = { color: '#cbb88a', fontSize: '12px', margin: '6px 0 0', letterSpacing: '0.5px' }
const body = { padding: '32px 28px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0D1117', margin: '0 0 8px' }
const orderNum = { fontSize: '14px', color: '#D4A843', fontWeight: 'bold' as const, margin: '0 0 20px', letterSpacing: '1px' }
const text = { fontSize: '15px', color: '#5b5f66', lineHeight: '1.6', margin: '0 0 16px' }
const infoBox = { backgroundColor: '#faf6ea', border: '1px solid #ece7d8', borderRadius: '8px', padding: '16px 18px', margin: '0 0 20px' }
const infoLabel = { fontSize: '11px', color: '#9aa0a6', textTransform: 'uppercase' as const, letterSpacing: '1px', margin: '0 0 4px' }
const infoValue = { fontSize: '15px', color: '#0D1117', fontWeight: 'bold' as const, margin: '0 0 12px' }
const itemRow = { fontSize: '14px', color: '#0D1117', padding: '8px 0', borderBottom: '1px solid #ece7d8' }
const statusBadge = { display: 'inline-block', backgroundColor: '#D4A843', color: '#0D1117', fontSize: '13px', fontWeight: 'bold' as const, padding: '8px 18px', borderRadius: '20px', letterSpacing: '0.5px' }
const footer = { fontSize: '12px', color: '#9aa0a6', margin: '24px 0 0', textAlign: 'center' as const }
