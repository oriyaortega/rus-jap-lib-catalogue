"""Minimal .xlsx reader (no openpyxl): prints every sheet as tab-separated rows."""
import sys, zipfile, re
import xml.etree.ElementTree as ET

NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
      'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}

def col_idx(ref):
    letters = re.match(r'[A-Z]+', ref).group(0)
    n = 0
    for ch in letters:
        n = n * 26 + (ord(ch) - 64)
    return n - 1

z = zipfile.ZipFile(sys.argv[1])
shared = []
if 'xl/sharedStrings.xml' in z.namelist():
    for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si', NS):
        shared.append(''.join(t.text or '' for t in si.iter('{%s}t' % NS['m'])))
wb = ET.fromstring(z.read('xl/workbook.xml'))
rels = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
target = {r.get('Id'): r.get('Target') for r in rels}
for sh in wb.find('m:sheets', NS):
    rid = sh.get('{%s}id' % NS['r'])
    path = 'xl/' + target[rid].lstrip('/').replace('xl/', '')
    root = ET.fromstring(z.read(path))
    print('=== SHEET', sh.get('name'))
    for row in root.iter('{%s}row' % NS['m']):
        cells = {}
        for c in row.findall('m:c', NS):
            v = c.find('m:v', NS)
            t = c.get('t')
            if t == 's' and v is not None:
                val = shared[int(v.text)]
            elif t == 'inlineStr':
                val = ''.join(x.text or '' for x in c.iter('{%s}t' % NS['m']))
            else:
                val = v.text if v is not None else ''
            cells[col_idx(c.get('r'))] = val
        if cells:
            mx = max(cells)
            print(row.get('r') + '\t' + '\t'.join((cells.get(i) or '').replace('\n', ' / ') for i in range(mx + 1)))
