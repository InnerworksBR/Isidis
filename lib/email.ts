import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// Configure your verified sender domain in Resend
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'MagicPlace <noreply@magicplace.com.br>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://magicplace.com.br'

// ─── Shared Layout ──────────────────────────────────────────────────────────

function emailLayout(content: string): string {
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#0f0a1a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="100%" style="max-width:560px;" cellpadding="0" cellspacing="0">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6d28d9,#8b5cf6);border-radius:12px 12px 0 0;padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:28px;">🔮</p>
              <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">MagicPlace</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background:#1a1030;padding:32px 40px;border-left:1px solid #2d1f4e;border-right:1px solid #2d1f4e;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#120c24;border-radius:0 0 12px 12px;border:1px solid #2d1f4e;border-top:none;padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#6b5fa0;font-size:12px;">
                Você está recebendo este email porque tem uma conta na MagicPlace.<br/>
                <a href="${APP_URL}" style="color:#8b5cf6;text-decoration:none;">magicplace.com.br</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function primaryButton(text: string, url: string): string {
    return `<a href="${url}" style="display:inline-block;margin-top:24px;padding:14px 28px;background:linear-gradient(135deg,#6d28d9,#8b5cf6);color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">${text}</a>`
}

function h2(text: string): string {
    return `<h2 style="margin:0 0 12px;color:#e2d9f3;font-size:20px;font-weight:700;">${text}</h2>`
}

function p(text: string): string {
    return `<p style="margin:0 0 10px;color:#a89bc9;font-size:15px;line-height:1.6;">${text}</p>`
}

function infoBox(content: string): string {
    return `<div style="margin:20px 0;padding:16px 20px;background:#2a1850;border-left:3px solid #8b5cf6;border-radius:6px;color:#c4b5fd;font-size:14px;line-height:1.6;">${content}</div>`
}

// ─── Email: Pedido Pago → Cartomante ────────────────────────────────────────

export async function sendOrderPaidToReader({
    readerEmail,
    readerName,
    orderId,
    gigTitle,
    clientName,
    amount,
}: {
    readerEmail: string
    readerName: string
    orderId: string
    gigTitle: string
    clientName: string
    amount: number
}) {
    const formattedAmount = (amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    const orderUrl = `${APP_URL}/dashboard/cartomante/pedido/${orderId}`

    const body = emailLayout(`
        ${h2('💰 Novo pedido confirmado!')}
        ${p(`Olá, <strong style="color:#e2d9f3;">${readerName}</strong>! Temos ótimas notícias.`)}
        ${p('Um cliente acabou de confirmar o pagamento para um dos seus serviços.')}
        ${infoBox(`
            <strong>Serviço:</strong> ${gigTitle}<br/>
            <strong>Cliente:</strong> ${clientName}<br/>
            <strong>Valor recebido:</strong> ${formattedAmount}
        `)}
        ${p('Acesse o painel para ver os detalhes e começar a preparar a leitura.')}
        <div style="text-align:center;">
            ${primaryButton('Ver Pedido', orderUrl)}
        </div>
    `)

    return resend.emails.send({
        from: FROM_EMAIL,
        to: readerEmail,
        subject: `💰 Novo pedido pago — ${gigTitle}`,
        html: body,
    })
}

// ─── Email: Pedido Pago → Cliente ───────────────────────────────────────────

export async function sendOrderPaidToClient({
    clientEmail,
    clientName,
    orderId,
    gigTitle,
    readerName,
}: {
    clientEmail: string
    clientName: string
    orderId: string
    gigTitle: string
    readerName: string
}) {
    const orderUrl = `${APP_URL}/dashboard/minhas-tiragens`

    const body = emailLayout(`
        ${h2('✨ Seu pedido foi confirmado!')}
        ${p(`Olá, <strong style="color:#e2d9f3;">${clientName}</strong>!`)}
        ${p('Seu pagamento foi confirmado com sucesso. A cartomante já foi notificada e em breve começará a preparar sua leitura.')}
        ${infoBox(`
            <strong>Serviço:</strong> ${gigTitle}<br/>
            <strong>Cartomante:</strong> ${readerName}
        `)}
        ${p('Você receberá outro email assim que a sua leitura estiver pronta.')}
        <div style="text-align:center;">
            ${primaryButton('Ver Meus Pedidos', orderUrl)}
        </div>
    `)

    return resend.emails.send({
        from: FROM_EMAIL,
        to: clientEmail,
        subject: `✨ Pedido confirmado — ${gigTitle}`,
        html: body,
    })
}

// ─── Email: Leitura Entregue → Cliente ──────────────────────────────────────

export async function sendReadingDelivered({
    clientEmail,
    clientName,
    orderId,
    gigTitle,
    readerName,
}: {
    clientEmail: string
    clientName: string
    orderId: string
    gigTitle: string
    readerName: string
}) {
    const readingUrl = `${APP_URL}/dashboard/leitura/${orderId}`

    const body = emailLayout(`
        ${h2('🔮 Sua leitura chegou!')}
        ${p(`Olá, <strong style="color:#e2d9f3;">${clientName}</strong>!`)}
        ${p(`A sua leitura de <strong style="color:#e2d9f3;">${gigTitle}</strong> por <strong style="color:#e2d9f3;">${readerName}</strong> está pronta e disponível no seu painel.`)}
        ${p('Clique no botão abaixo para acessar o resultado da sua tiragem.')}
        <div style="text-align:center;">
            ${primaryButton('Ver Minha Leitura 🔮', readingUrl)}
        </div>
        ${p('Não esqueça de deixar uma avaliação após ver sua leitura. Isso ajuda outros clientes e apoia a cartomante!')}
    `)

    return resend.emails.send({
        from: FROM_EMAIL,
        to: clientEmail,
        subject: `🔮 Sua leitura está pronta — ${gigTitle}`,
        html: body,
    })
}

// ─── Email: Pedido Cancelado → Cliente ──────────────────────────────────────

export async function sendOrderCanceled({
    clientEmail,
    clientName,
    gigTitle,
}: {
    clientEmail: string
    clientName: string
    gigTitle: string
}) {
    const body = emailLayout(`
        ${h2('Pedido Cancelado')}
        ${p(`Olá, <strong style="color:#e2d9f3;">${clientName}</strong>.`)}
        ${p(`Informamos que o seu pedido de <strong style="color:#e2d9f3;">${gigTitle}</strong> foi cancelado.`)}
        ${infoBox('Se o pagamento foi realizado, o estorno será processado automaticamente. Em caso de dúvidas, entre em contato conosco pelo suporte.')}
        <div style="text-align:center;">
            ${primaryButton('Ir para o Suporte', `${APP_URL}/dashboard/tickets`)}
        </div>
    `)

    return resend.emails.send({
        from: FROM_EMAIL,
        to: clientEmail,
        subject: `Pedido cancelado — ${gigTitle}`,
        html: body,
    })
}

// ─── Email: Ticket respondido → Usuário ─────────────────────────────────────

export async function sendTicketReply({
    userEmail,
    userName,
    ticketId,
    ticketSubject,
    replyPreview,
}: {
    userEmail: string
    userName: string
    ticketId: string
    ticketSubject: string
    replyPreview: string
}) {
    const ticketUrl = `${APP_URL}/dashboard/tickets/${ticketId}`

    const body = emailLayout(`
        ${h2('📬 Resposta no seu ticket de suporte')}
        ${p(`Olá, <strong style="color:#e2d9f3;">${userName}</strong>!`)}
        ${p('Nossa equipe respondeu ao seu ticket de suporte.')}
        ${infoBox(`
            <strong>Assunto:</strong> ${ticketSubject}<br/><br/>
            <em>${replyPreview.length > 200 ? replyPreview.substring(0, 200) + '...' : replyPreview}</em>
        `)}
        <div style="text-align:center;">
            ${primaryButton('Ver Resposta Completa', ticketUrl)}
        </div>
    `)

    return resend.emails.send({
        from: FROM_EMAIL,
        to: userEmail,
        subject: `📬 Resposta ao ticket: ${ticketSubject}`,
        html: body,
    })
}

// ─── Email: Novo Gig Pendente → Admins ──────────────────────────────────────

export async function sendAdminGigPending({
    adminEmails,
    gigId,
    gigTitle,
    readerName,
}: {
    adminEmails: string[]
    gigId: string
    gigTitle: string
    readerName: string
}) {
    if (adminEmails.length === 0) return

    const approvalUrl = `${APP_URL}/admin/approvals/${gigId}`

    const body = emailLayout(`
        ${h2('✨ Novo Gig aguardando aprovação')}
        ${p('Um novo serviço foi criado e está aguardando revisão do administrador.')}
        ${infoBox(`
            <strong>Serviço:</strong> ${gigTitle}<br/>
            <strong>Cartomante:</strong> ${readerName}
        `)}
        <div style="text-align:center;">
            ${primaryButton('Revisar Gig', approvalUrl)}
        </div>
    `)

    return resend.emails.send({
        from: FROM_EMAIL,
        to: adminEmails,
        subject: `✨ Novo gig pendente — ${gigTitle}`,
        html: body,
    })
}

// ─── Email: Novo Usuário Pendente → Admins ──────────────────────────────────

export async function sendAdminUserPending({
    adminEmails,
    userName,
}: {
    adminEmails: string[]
    userName: string
}) {
    if (adminEmails.length === 0) return

    const usersUrl = `${APP_URL}/admin/users`

    const body = emailLayout(`
        ${h2('👤 Nova aprovação de cartomante pendente')}
        ${p('Um usuário solicitou verificação para atuar como cartomante na plataforma.')}
        ${infoBox(`
            <strong>Usuário:</strong> ${userName}
        `)}
        <div style="text-align:center;">
            ${primaryButton('Revisar Usuários', usersUrl)}
        </div>
    `)

    return resend.emails.send({
        from: FROM_EMAIL,
        to: adminEmails,
        subject: `👤 Nova cartomante aguardando aprovação — ${userName}`,
        html: body,
    })
}
