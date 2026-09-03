@echo off
REM Lexio'yu yerel bir web sunucusu uzerinden acar.
REM Sadece dosyaya cift tiklayarak acmak sorun cikarirsa kullanin.
cd /d "%~dp0"
python sunucu.py || py sunucu.py
pause
