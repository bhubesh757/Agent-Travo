export type TripStatus = 'requested' | 'planning' | 'proposal_ready' | 'awaiting_approval' | 'booked' | 'failed' | string

export type Trip = {
  id: string
  origin: string
  destination: string
  start_date: string | null
  end_date: string | null
  travelers: number
  status: TripStatus
  proposal_version?: number
  proposal?: TripProposal | null
  approval_decision?: 'approve' | 'reject' | null
  budget?: { amount: string | number | null; currency: string; range?: string | null } | null
  created_at?: string
}

export type TripProposal = {
  version: number
  source: string
  label: string
  destination: string
  days: Array<{ date: string; title: string; ideas: string[] }>
  budget: {
    currency: string
    amount: string | null
    range: string | null
    minimum: string | null
    maximum: string | null
    estimated_total: string | null
    note: string
  }
  approval_required: boolean
  generated_at: string
}

export type CreateTripInput = {
  origin: string
  destination: string
  start_date: string
  end_date: string
  travelers: number
  budget: { amount: string; currency: 'INR' }
  interests: string[]
  booking_requires_approval: true
}

const API = '/api/v1'

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let detail = `Request failed (${response.status})`
    try {
      const body = await response.json()
      if (typeof body?.detail === 'string') detail = body.detail
      else if (Array.isArray(body?.detail)) detail = body.detail.map((entry: { msg?: string }) => entry.msg).filter(Boolean).join(' ')
    } catch { /* leave the status message */ }
    throw new Error(detail)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export async function listTrips(signal?: AbortSignal): Promise<Trip[]> {
  const data = await parseResponse<Trip[] | { items?: Trip[]; trips?: Trip[] }>(await fetch(`${API}/trips`, { signal }))
  if (Array.isArray(data)) return data
  return data.items ?? data.trips ?? []
}

export async function createTrip(input: CreateTripInput): Promise<Trip> {
  return parseResponse<Trip>(await fetch(`${API}/trips`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  }))
}

export async function getTrip(id: string): Promise<Trip> {
  return parseResponse<Trip>(await fetch(`${API}/trips/${encodeURIComponent(id)}`))
}

export async function startPlanning(id: string): Promise<void> {
  await parseResponse(await fetch(`${API}/trips/${encodeURIComponent(id)}/plan`, { method: 'POST' }))
}

export async function decideTrip(id: string, decision: 'approve' | 'reject', proposalVersion: number): Promise<Trip> {
  return parseResponse<Trip>(await fetch(`${API}/trips/${encodeURIComponent(id)}/decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision, proposal_version: proposalVersion }),
  }))
}
