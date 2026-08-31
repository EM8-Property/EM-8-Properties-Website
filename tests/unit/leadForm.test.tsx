import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LeadForm, type FieldSpec } from '@/components/forms/LeadForm'
import { HONEYPOT_FIELD } from '@/lib/leads'

const fields: FieldSpec[] = [
  { name: 'firstName', label: 'First name', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
]

const ok = () => new Response(JSON.stringify({ ok: true, id: 'x' }))

beforeEach(() => {
  vi.restoreAllMocks()
})

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('First name'), 'Dana')
  await user.type(screen.getByLabelText('Email'), 'dana@example.com')
  await user.click(screen.getByRole('button', { name: 'Send' }))
}

describe('LeadForm', () => {
  it('posts the source with the submission', async () => {
    const bodies: string[] = []
    vi.stubGlobal('fetch', async (_url: string, init?: RequestInit) => {
      bodies.push(String(init?.body))
      return ok()
    })
    const user = userEvent.setup()

    render(<LeadForm source="keep-in-touch" fields={fields} submitLabel="Send" />)
    await fillAndSubmit(user)

    await waitFor(() => expect(bodies).toHaveLength(1))
    const body = JSON.parse(bodies[0]!)
    expect(body.source).toBe('keep-in-touch')
    expect(body.email).toBe('dana@example.com')
  })

  it('surfaces an error instead of failing silently', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ ok: false, error: 'Nope' }), { status: 400 })),
    )
    const user = userEvent.setup()

    render(<LeadForm source="keep-in-touch" fields={fields} submitLabel="Send" />)
    await fillAndSubmit(user)

    expect(await screen.findByRole('alert')).toHaveTextContent('Nope')
  })

  it('surfaces a network failure rather than appearing to succeed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline')
      }),
    )
    const user = userEvent.setup()

    render(<LeadForm source="keep-in-touch" fields={fields} submitLabel="Send" />)
    await fillAndSubmit(user)

    expect(await screen.findByRole('alert')).toBeDefined()
  })

  it('confirms success to the user', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ok()))
    const user = userEvent.setup()

    render(<LeadForm source="keep-in-touch" fields={fields} submitLabel="Send" />)
    await fillAndSubmit(user)

    expect(await screen.findByText(/thank you/i)).toBeDefined()
  })

  it('carries a honeypot field that is hidden from people and assistive tech', () => {
    const { container } = render(
      <LeadForm source="keep-in-touch" fields={fields} submitLabel="Send" />,
    )
    const honeypot = container.querySelector(`input[name="${HONEYPOT_FIELD}"]`)
    expect(honeypot).not.toBeNull()
    expect(honeypot?.getAttribute('tabindex')).toBe('-1')
    expect(honeypot?.closest('[aria-hidden="true"]')).not.toBeNull()
  })

  it('disables the button while sending so a double click cannot double-submit', async () => {
    let release: (() => void) | undefined
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            release = () => resolve(ok())
          }),
      ),
    )
    const user = userEvent.setup()

    render(<LeadForm source="keep-in-touch" fields={fields} submitLabel="Send" />)
    await fillAndSubmit(user)

    await waitFor(() => expect(screen.getByRole('button')).toBeDisabled())
    release?.()
  })
})
