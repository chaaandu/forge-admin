"""
Turns downloaded copies of the two sheets into fixtures/*.json, shaped the way
the Sheets API returns them (UNFORMATTED_VALUE, dates as serial numbers,
trailing blanks trimmed), so the snapshot tests run the real parser on real data.

fixtures/ is gitignored: these carry student names and mentor notes.

    python3 scripts/xlsx-to-fixtures.py [MASTER.xlsx] [MENTOR.xlsx]

Defaults to the copies in ../forge-byob-tv-main.
"""
import datetime, json, os, sys
import openpyxl

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
WALL = os.path.join(os.path.dirname(ROOT), 'forge-byob-tv-main')
EPOCH = datetime.datetime(1899, 12, 30)


def newest(prefix):
    files = [f for f in os.listdir(WALL) if f.startswith(prefix) and f.endswith('.xlsx')]
    if not files:
        sys.exit(f'no {prefix}*.xlsx in {WALL}')
    return os.path.join(WALL, max(files, key=lambda f: os.path.getmtime(os.path.join(WALL, f))))


def cell(v):
    if v is None:
        return ''
    if isinstance(v, datetime.datetime):
        return (v - EPOCH).total_seconds() / 86400
    if isinstance(v, datetime.date):
        return (datetime.datetime(v.year, v.month, v.day) - EPOCH).days
    if isinstance(v, float) and v.is_integer():
        return int(v)
    return v


def grid(ws):
    out = []
    for row in ws.iter_rows(values_only=True):
        r = [cell(v) for v in row]
        while r and r[-1] == '':
            r.pop()
        out.append(r)
    while out and not out[-1]:
        out.pop()
    return out


def dump(path, name):
    wb = openpyxl.load_workbook(path, data_only=True)
    data = {'tabs': [{'title': ws.title, 'hidden': ws.sheet_state != 'visible'} for ws in wb.worksheets],
            'grids': {ws.title: grid(ws) for ws in wb.worksheets}}
    os.makedirs(os.path.join(ROOT, 'fixtures'), exist_ok=True)
    out = os.path.join(ROOT, 'fixtures', name)
    with open(out, 'w') as f:
        json.dump(data, f, ensure_ascii=False)
    print(f'{os.path.basename(path)} -> fixtures/{name}')


master = sys.argv[1] if len(sys.argv) > 1 else newest('Forge C1 BYOB_MASTER')
mentor = sys.argv[2] if len(sys.argv) > 2 else newest('PGP_Forge_Mentor_Dashboard')
dump(master, 'master.json')
dump(mentor, 'mentor.json')
