import pymupdf, sys, glob
files = sorted(glob.glob('PDF_DIR/Библиография Японии*.pdf'))
for f in files:
    d = pymupdf.open(f)
    key = f[-13:-4].replace(' ', '_')
    txt = []
    for i, p in enumerate(d):
        txt.append(f'\n=====PAGE {i+1}=====\n' + p.get_text())
    open(f'SCRATCH/bib/{key}.txt', 'w', encoding='utf-8').write(''.join(txt))
    print(f, d.page_count, d.metadata.get('producer'), sum(len(t) for t in txt))
