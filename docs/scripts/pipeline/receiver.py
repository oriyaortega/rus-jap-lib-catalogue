"""Tiny local receiver: POST /save?name=xxx.json writes the request body into the scratchpad 'inbox' folder.
GET / serves a blank page so a tab can navigate here and post same-origin."""
import http.server, os, re, urllib.parse

INBOX = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'inbox')
os.makedirs(INBOX, exist_ok=True)

class H(http.server.BaseHTTPRequestHandler):
    def cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Access-Control-Allow-Private-Network', 'true')

    def do_OPTIONS(self):
        self.send_response(204); self.cors(); self.end_headers()

    def do_GET(self):
        m = re.match(r'^/inbox/([\w.-]+)$', self.path)
        if m and os.path.exists(os.path.join(INBOX, m.group(1))):
            data = open(os.path.join(INBOX, m.group(1)), 'rb').read()
            self.send_response(200); self.cors()
            self.send_header('Content-Type', 'application/json; charset=utf-8'); self.end_headers()
            self.wfile.write(data); return
        self.send_response(200); self.cors()
        self.send_header('Content-Type', 'text/html; charset=utf-8'); self.end_headers()
        self.wfile.write(b'<!doctype html><title>receiver</title><p>ok</p>')

    def do_POST(self):
        q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        name = re.sub(r'[^\w.-]', '_', (q.get('name') or ['data.json'])[0])
        body = self.rfile.read(int(self.headers.get('Content-Length', 0)))
        with open(os.path.join(INBOX, name), 'wb') as f:
            f.write(body)
        self.send_response(200); self.cors(); self.end_headers()
        self.wfile.write(f'saved {name} {len(body)}'.encode())

http.server.ThreadingHTTPServer(('127.0.0.1', 8766), H).serve_forever()
