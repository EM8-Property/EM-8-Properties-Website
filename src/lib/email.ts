import 'server-only'
import type { EmailSender } from './leads'
import { resolveSenderAddress } from './emailFrom'

/**
 * Email is the working channel: Hunter assembles the Agora import sheet from these
 * notifications. The `lead` document written first is the safety net, not the workflow.
 *
 * The `from` domain must be verified in Resend before anything sends. An unverified
 * sender fails at the API, which `submitLead` records as `emailed: false` on the lead
 * document — the lead is still saved, but nobody is told, so verify the domain before
 * launch. Set `RESEND_FROM` to override the sender while testing.
 */
export const resendSender: EmailSender = {
  async send({ subject, body }) {
    const apiKey = process.env.RESEND_API_KEY
    const to = process.env.LEAD_NOTIFICATION_EMAIL
    if (!apiKey || !to) {
      throw new Error('RESEND_API_KEY or LEAD_NOTIFICATION_EMAIL is not configured')
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: resolveSenderAddress(process.env.RESEND_FROM),
        to: [to],
        subject,
        text: body,
      }),
    })

    if (!res.ok) {
      throw new Error(`Resend failed: ${res.status}`)
    }
  },
}
