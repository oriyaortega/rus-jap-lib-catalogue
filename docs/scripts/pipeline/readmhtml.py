"""Extract the main HTML part of an .mhtml file and print its visible text plus edition/work links."""
import sys, email, re
from email import policy
from html.parser import HTMLParser

msg = email.message_from_binary_file(open(sys.argv[1], 'rb'), policy=policy.default)
html = None
for part in msg.walk():
    if part.get_content_type() == 'text/html':
        html = part.get_content()
        print('LOCATION:', part.get('Content-Location'))
        break

class P(HTMLParser):
    def __init__(self):
        super().__init__(); self.out = []; self.skip = 0; self.links = []; self.href = None
    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'): self.skip += 1
        if tag in ('br', 'p', 'div', 'li', 'tr', 'h1', 'h2', 'h3', 'td'): self.out.append('\n')
        if tag == 'a':
            self.href = dict(attrs).get('href')
    def handle_endtag(self, tag):
        if tag in ('script', 'style'): self.skip -= 1
        if tag == 'a': self.href = None
    def handle_data(self, d):
        if self.skip: return
        self.out.append(d)
        if self.href and re.search(r'/(edition|work)\d+', self.href) and d.strip():
            self.links.append((re.search(r'(edition|work)\d+', self.href).group(0), d.strip()))

p = P(); p.feed(html)
text = re.sub(r'\n\s*\n+', '\n', ''.join(p.out))
open(sys.argv[2], 'w', encoding='utf-8').write(text)
open(sys.argv[3], 'w', encoding='utf-8').write('\n'.join(f'{a}\t{b}' for a, b in p.links))
print('text chars', len(text), 'links', len(p.links))
