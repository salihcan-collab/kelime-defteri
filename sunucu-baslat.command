#!/bin/bash
# Lexio'yu yerel bir web sunucusu üzerinden açar.
# Sadece dosyaya çift tıklayarak açmak sorun çıkarırsa kullanın.
cd "$(dirname "$0")"
echo ""
echo "  Lexio çalışıyor -> http://localhost:8000"
echo "  Kapatmak için bu pencereyi kapatın veya Ctrl+C yapın."
echo ""
(sleep 1 && (open http://localhost:8000 2>/dev/null || xdg-open http://localhost:8000 2>/dev/null)) &
exec python3 sunucu.py
