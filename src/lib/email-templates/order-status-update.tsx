import * as React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

type Status = 'preparing' | 'on_the_way' | 'delivered'

interface Props {
  orderNumber?: string | number
  customerName?: string
  status?: Status
  store?: string
  floor?: string
}

const STATUS_TEXT: Record<Status, { title: string; label: string; body: string }> = {
  preparing:   { title: 'Estamos preparando tu pedido', label: 'PREPARANDO',   body: 'La cocina ya está manos a la obra. Te avisamos cuando salga en camino.' },
  on_the_way:  { title: 'Tu pedido va en camino',       label: 'EN CAMINO',    body: 'Tu runner ya salió hacia tu tienda. Llegará en pocos minutos.' },
  delivered:   { title: '¡Pedido entregado!',           label: 'ENTREGADO',    body: 'Esperamos que lo disfrutes. ¡Gracias por elegir Terraza Gourmet!' },
}

const OrderStatusUpdateEmail = ({ orderNumber, customerName, status = 'preparing', store, floor }: Props) => {
  const info = STATUS_TEXT[status] ?? STATUS_TEXT.preparing
  return (
    <Html lang="es" dir="ltr">
      <Head />
      <Preview>{`Pedido #${orderNumber ?? ''}: ${info.label}`}</Preview>
      <Body style={main}>
        <Section style={wrapper}>
          <Container style={container}>
            <Section style={header}>
              <Text style={brand}>TERRAZA GOURMET</Text>
              <Text style={tagline}>City Market · Caracas</Text>
            </Section>
            <Section style={body}>
              <Heading style={h1}>{info.title}</Heading>
              <Text style={orderNum}>PEDIDO #{String(orderNumber ?? '').padStart(4, '0')}</Text>
              <Section style={{ textAlign: 'center', margin: '8px 0 24px' }}>
                <Text style={statusBadge}>{info.label}</Text>
              </Section>
              <Text style={text}>
                {customerName ? `Hola ${customerName}, ` : 'Hola, '}
                {info.body}
              </Text>
              {(store || floor) && (
                <Section style={infoBox}>
                  <Text style={infoLabel}>Entrega</Text>
                  <Text style={infoValue}>{store ?? '—'}</Text>
                  <Text style={infoLabel}>Piso</Text>
                  <Text style={{ ...infoValue, margin: 0 }}>{floor ?? '—'}</Text>
                </Section>
              )}
              <Text style={footer}>Terraza Gourmet City Market</Text>
            </Section>
          </Container>
        </Section>
      </Body>
    </Html>
  )
}

export const template = {
  component: OrderStatusUpdateEmail,
  subject: (d: Record<string, any>) => {
    const labels: Record<string, string> = { preparing: 'Preparando', on_the_way: 'En camino', delivered: 'Entregado' }
    const num = String(d.orderNumber ?? '').padStart(4, '0')
    return `Pedido #${num}: ${labels[d.status] ?? 'Actualización'}`
  },
  displayName: 'Actualización de estado de pedido',
  previewData: {
    orderNumber: 1234,
    customerName: 'María',
    status: 'on_the_way',
    store: 'Farmatodo',
    floor: '3',
  },
} satisfies TemplateEntry

export default OrderStatusUpdateEmail

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
