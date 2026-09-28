/**
 * The only code that talks to Google.
 *
 * Read-only by construction: the token is minted with the `spreadsheets.readonly`
 * scope, so Google refuses a write whatever the sheet's sharing says — the
 * service account may be an Editor somewhere else, and that must not matter here.
 *
 * Deliberately free of `server-only` so `scripts/check-sheets.ts` can run it
 * under plain node. `lib/sheets.ts` is the server-only door the app uses.
 */
import { JWT } from 'google-auth-library'

const SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly'
const API = 'https://sheets.googleapis.com/v4/spreadsheets'

/** A cell as the Sheets API returns it with UNFORMATTED_VALUE: dates are serial numbers. */
export type Cell = string | number | boolean
export type Grid = Cell[][]

export type Tab = { title: string; hidden: boolean }

let client: JWT | null = null

function jwt(): JWT {
  if (client) return client
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const key = process.env.GOOGLE_PRIVATE_KEY
  if (!email || !key) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY must be set (see .env.example)')
  }
  // Env files carry the key's newlines as the two characters \n.
  client = new JWT({ email, key: key.replace(/\\n/g, '\n'), scopes: [SCOPE] })
  return client
}

async function get(url: string): Promise<unknown> {
  const { token } = await jwt().getAccessToken()
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Sheets API ${res.status}: ${body.slice(0, 300)}`)
  }
  return res.json()
}

export async function listTabs(spreadsheetId: string): Promise<Tab[]> {
  const data = (await get(`${API}/${spreadsheetId}?fields=sheets.properties(title,hidden)`)) as {
    sheets: { properties: { title: string; hidden?: boolean } }[]
  }
  return data.sheets.map((s) => ({ title: s.properties.title, hidden: s.properties.hidden ?? false }))
}

/** Reads whole tabs in one request. Returns grids keyed by tab title. */
export async function readTabs(spreadsheetId: string, titles: string[]): Promise<Record<string, Grid>> {
  if (titles.length === 0) return {}
  const params = new URLSearchParams({ valueRenderOption: 'UNFORMATTED_VALUE', dateTimeRenderOption: 'SERIAL_NUMBER' })
  // A tab name in A1 notation is quoted, and a quote inside it is doubled.
  for (const t of titles) params.append('ranges', `'${t.replace(/'/g, "''")}'`)
  const data = (await get(`${API}/${spreadsheetId}/values:batchGet?${params}`)) as {
    valueRanges: { values?: Grid }[]
  }
  const out: Record<string, Grid> = {}
  titles.forEach((t, i) => {
    out[t] = data.valueRanges[i]?.values ?? []
  })
  return out
}
