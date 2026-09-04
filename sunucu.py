"""Lexio'yu yerel bir sunucudan açar.

Düz `python -m http.server` dosyaları tarayıcının önbelleğine bırakır: yeni bir
sürüm indirdiğinde tarayıcı eski app.js'i kullanmaya devam eder ve uygulama
güncellenmemiş gibi görünür. Buradaki tek fark, her yanıta "bunu saklama"
demesi.

İkinci bir işi daha var, yalnızca kart üretici sayfası için: /nvidia/ ile
başlayan istekleri build.nvidia.com'a iletir. Bir tarayıcı, karşı taraf
açıkça izin vermedikçe başka bir siteye istek atamaz; NVIDIA izin veriyorsa
buna hiç gerek yok, vermiyorsa üretici sayfası bu yoldan çalışır. İstek bu
bilgisayardan çıkar, anahtar da öyle — arada başka kimse yok.
"""
import http.server, socketserver, webbrowser, threading, urllib.request, urllib.error

PORT = 8000
RELAY = '/nvidia/'
UPSTREAM = 'https://integrate.api.nvidia.com'

class NoCache(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path.startswith(RELAY):
            length = int(self.headers.get('Content-Length') or 0)
            return self.relay(self.rfile.read(length) if length else None)
        self.send_error(405)

    def do_GET(self):
        if self.path.startswith(RELAY):
            return self.relay(None)
        super().do_GET()

    def relay(self, body):
        """Aynı isteği NVIDIA'ya sorar ve yanıtı olduğu gibi geri verir.
        Hata da bir yanıttır: 401 ya da 429 sayfaya ulaşmalı ki sayfa
        anahtarın kabul edilmediğini ya da beklemesi gerektiğini anlasın."""
        req = urllib.request.Request(
            UPSTREAM + self.path[len(RELAY) - 1:],
            data=body, method='POST' if body is not None else 'GET',
            headers={k: v for k, v in self.headers.items()
                     if k.lower() in ('authorization', 'content-type', 'accept')})
        try:
            r = urllib.request.urlopen(req, timeout=300)
            code, head, out = r.status, r.headers, r.read()
        except urllib.error.HTTPError as e:
            code, head, out = e.code, e.headers, e.read()
        except Exception as e:
            code, head, out = 502, {}, str(e).encode()
        self.send_response(code)
        self.send_header('Content-Type', head.get('Content-Type', 'application/json')
                         if hasattr(head, 'get') else 'application/json')
        self.send_header('Content-Length', str(len(out)))
        if hasattr(head, 'get') and head.get('Retry-After'):
            self.send_header('Retry-After', head.get('Retry-After'))
        self.end_headers()
        self.wfile.write(out)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, *args):
        pass                      # sessiz çalışsın

if __name__ == '__main__':
    socketserver.ThreadingTCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(('', PORT), NoCache) as httpd:
        url = 'http://localhost:%d' % PORT
        print('')
        print('  Lexio calisiyor  ->  ' + url)
        print('  Kart uretici     ->  ' + url + '/tools/uret.html')
        print('')
        print('  Kapatmak icin bu pencereyi kapatin.')
        threading.Timer(1.0, lambda: webbrowser.open(url)).start()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
