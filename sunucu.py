"""Lexio'yu yerel bir sunucudan açar.

İki işi var. Birincisi: düz `python -m http.server` dosyaları tarayıcının
önbelleğine bırakır — yeni bir sürüm indirdiğinde tarayıcı eski app.js'i
kullanmaya devam eder ve uygulama güncellenmemiş gibi görünür. Buradaki tek
fark, her yanıta "bunu saklama" demesi.

İkincisi, ve asıl önemlisi: tarayıcı kaydettiklerini açıldığı adrese göre
ayırır. Dosyaya çift tıklayarak açılan sayfa (file://) ile buradan açılan
sayfa (http://localhost:8000) tarayıcı için iki ayrı yerdir, ve birinin
kelimelerini diğeri göremez. Kelimelerini buradan yazdıysan, buradan aç.
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
    socketserver.ThreadingTCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(('', PORT), NoCache) as httpd:
        url = 'http://localhost:%d' % PORT
        print('')
        print('  Lexio calisiyor  ->  ' + url)
        print('')
        print('  Kapatmak icin bu pencereyi kapatin.')
        threading.Timer(1.0, lambda: webbrowser.open(url)).start()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
