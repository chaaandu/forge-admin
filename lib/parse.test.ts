import { describe, expect, it } from 'vitest'
import type { Grid } from './google.ts'
import { parse, parseCheckin, serialToDate, type Sources } from './parse.ts'

// 2026-09-15 as a Sheets serial.
const SEP15 = 46280

function sources(over: Partial<Sources> = {}): Sources {
  return {
    teamLinks: [
      ['Team ID', 'LINK', 'Mentor Name', 'Team Members', 'Venture Name', 'Product'],
      ['', '', '', '', '', ''],
      ['VBC101', 'x', 'Tara Quill', 'A One, B Two', 'BLUNNT', 'Socks'],
      ['VBC102', 'x', 'tara quill', '', 'snackerly', ''],
      ['VBC103', 'x', 'Tara Quill', '', 'Third', ''],
      ['VBC104', 'x', 'Tara Quill', '', 'Disbanded', ''],
      ['VBC105', 'x', '', '', 'No Mentor', ''],
    ],
    summary: [
      ['Team ID', 'Revenue (proof) ₹', 'Units sold', 'Paid orders', 'New cust.', 'Repeat orders', 'AOV ₹',
        'Online / Organic ₹', 'Offline ₹', 'Affiliate / Influencer Mktg ₹', 'Performance Mktg ₹', 'B2B ₹'],
      ['', 999999],
      ['VBC101', 1500, 3, 2, 2, 0, 750, 500, 1000, 0, 0, 0],
      ['VBC104', 5000, 1, 1, 1, 0, 5000, 0, 5000, 0, 0, 0],
    ],
    dailyDump: [
      ['Team ID', 'Date', 'Week', 'Type', 'Channel', 'Customer', 'Description', 'Units', 'Amount (₹)',
        'Proof type', 'Proof reference', 'Proof available', 'Verified', 'Money in (₹)'],
      ['VBC101', SEP15 + 0.52, 3, 'Sale', 'Offline', '', '', 1, 1000, '', '', 'Yes', '', 1000],
      ['VBC101', SEP15 + 0.9, 3, 'Sale', 'Online', '', '', 1, 500, '', '', 'Yes', '', 500],
      // Unproven: Amount is set, Money in is 0. Money in is what counts.
      ['VBC101', SEP15 + 1, 3, 'Sale', 'Online', '', '', 1, 700, '', '', 'No', '', 0],
      ['VBC104', SEP15, 3, 'Sale', 'Offline', '', '', 1, 5000, '', '', 'Yes', '', 5000],
    ],
    weekly: [
      ['Team ID', 'Week', 'Revenue'],
      ['VBC101', 3, 1500],
      ['VBC101', 4, 200],
    ],
    cohort: [['Key', 'Value'], ['current_open_week', 4]],
    mentorTabs: [
      [
        ['Tara Quill — My Teams'],
        [''],
        [''],
        ['Team ID', 'Student Name(s)', 'Company / Venture', 'Pace vs Target', 'Mentor Assessment', 'Wk1 Notes', 'Wk2 Notes'],
        // Deliberately out of roster order: rows are matched on their own Team ID.
        ['VBC102', '', 'a stale name', '#N/A', 'Lagging', 'Preparedness - \nData & pitch - \nInterpersonal skills - \n\nOther Notes'],
        ['VBC101', '', 'undecided', 'On Pace', 'On Track',
          'Preparedness - 9/10\nData & pitch - 8/10\nInterpersonal skills - 7/10\n\nOther Notes\n- strong start',
          'Website done.'],
      ],
    ],
    ...over,
  }
}

describe('parse', () => {
  const d = parse(sources())

  it('leaves out disbanded teams everywhere', () => {
    expect(d.teams.map((t) => t.id)).toEqual(['VBC101', 'VBC102', 'VBC103', 'VBC105'])
    expect(d.mentors.flatMap((m) => m.teamIds)).not.toContain('VBC104')
  })

  it('prints venture names exactly as the master writes them', () => {
    expect(d.teams[0].venture).toBe('BLUNNT')
    expect(d.teams[1].venture).toBe('snackerly')
  })

  it('takes the venture name from the master, never from a mentor tab', () => {
    expect(d.teams[0].venture).not.toBe('undecided')
  })

  it('groups a mentor across spellings and shows the majority one', () => {
    expect(d.mentors).toHaveLength(1)
    expect(d.mentors[0]).toMatchObject({ name: 'Tara Quill', slug: 'tara-quill', teamIds: ['VBC101', 'VBC102', 'VBC103'] })
    expect(d.teams.find((t) => t.id === 'VBC105')!.mentorKey).toBeNull()
  })

  it('reads revenue and the channel split by header', () => {
    expect(d.teams[0]).toMatchObject({ revenue: 1500, units: 3, orders: 2, aov: 750 })
    expect(d.teams[0].channels).toEqual({ offline: 1000, online: 500, influencer: 0, performance: 0, b2b: 0 })
  })

  it('a team missing from the summary reads zero rather than disappearing', () => {
    expect(d.teams[2].revenue).toBe(0)
  })

  it('builds daily revenue from Money in, so unproven sales do not count', () => {
    expect(d.teams[0].daily).toEqual([{ date: '2026-09-15', revenue: 1500 }])
  })

  it('reads weekly revenue and the current week', () => {
    expect(d.teams[0].weekly).toEqual({ 3: 1500, 4: 200 })
    expect(d.currentWeek).toBe(4)
  })

  it('matches mentor rows by Team ID, and reads a sheet error as absent', () => {
    expect(d.teams[0]).toMatchObject({ pace: 'On Pace', assessment: 'On Track' })
    expect(d.teams[1]).toMatchObject({ pace: null, assessment: 'Lagging' })
    expect(d.teams[2]).toMatchObject({ pace: null, assessment: null, checkins: [] })
  })

  it('does not count the empty template as a check-in', () => {
    expect(d.teams[1].checkins).toEqual([])
    expect(d.teams[0].checkins.map((c) => c.week)).toEqual([1, 2])
  })

  it('fails loudly when a column it needs is renamed', () => {
    const bad = sources()
    bad.summary = [['Team ID', 'Revenue ₹'], ['VBC101', 1]]
    expect(() => parse(bad)).toThrow(/Daily Team Summary/)
  })

  it('fails loudly on a tab that is not a mentor tab', () => {
    expect(() => parse(sources({ mentorTabs: [[['Milestone', 'Cumulative Target']]] as Grid[] }))).toThrow(/mentor tab/)
  })
})

describe('parseCheckin', () => {
  it('reads scores out of ten and the notes beneath them', () => {
    expect(parseCheckin(1, 'Preparedness - 9/10\nData & pitch - 8/10\nInterpersonal skills - 7/10\n\nOther Notes\n- strong start')).toEqual({
      week: 1,
      preparedness: { value: 9, outOf: 10 },
      dataPitch: { value: 8, outOf: 10 },
      interpersonal: { value: 7, outOf: 10 },
      notes: '- strong start',
    })
  })

  it('keeps a bare score without inventing a scale for it', () => {
    expect(parseCheckin(3, 'Preparedness - 5\nData & pitch - 6\nInterpersonal skills - 6')!.preparedness).toEqual({ value: 5, outOf: null })
  })

  it('takes free text alone as a check-in', () => {
    expect(parseCheckin(4, 'very confident about offline, need to push for other channels')).toMatchObject({
      preparedness: null,
      notes: 'very confident about offline, need to push for other channels',
    })
  })

  it('treats the template and a blank as no check-in', () => {
    expect(parseCheckin(1, 'Preparedness - \nData & pitch - \nInterpersonal skills - \n\nOther Notes')).toBeNull()
    expect(parseCheckin(1, '')).toBeNull()
    expect(parseCheckin(1, undefined)).toBeNull()
  })
})

describe('serialToDate', () => {
  it('drops the time of day', () => {
    expect(serialToDate(SEP15)).toBe('2026-09-15')
    expect(serialToDate(SEP15 + 0.99)).toBe('2026-09-15')
  })
})
