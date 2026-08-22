@echo off
REM Lexio'yu yerel bir web sunucusu uzerinden acar.
REM Sadece dosyaya cift tiklayarak acmak sorun cikarirsa kullanin.
cd /d "%~dp0"
echo.
echo   Lexio calisiyor.
echo   Tarayicinizda su adresi acin:  http://localhost:8000
echo   Kapatmak icin bu pencereyi kapatin.
echo.
python -m http.server 8000 || py -m http.server 8000
pause
