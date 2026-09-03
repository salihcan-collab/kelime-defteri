"""Lexio'yu yerel bir sunucudan açar.

Düz `python -m http.server` dosyaları tarayıcının önbelleğine bırakır: yeni bir
sürüm indirdiğinde tarayıcı eski app.js'i kullanmaya devam eder ve uygulama
güncellenmemiş gibi görünür. Buradaki tek fark, her yanıta "bunu saklama"
demesi.
"""
import http.server, socketserver, webbrowser, threading

PORT = 8000

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, *args):
        pass                      # sessiz çalışsın

if __name__ == '__main__':
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(('', PORT), NoCache) as httpd:
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
