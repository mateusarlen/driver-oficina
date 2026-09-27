@echo off
title Enviar DRIVER para o GitHub
color 0B
cd /d C:\DRIVER_CLOUD
set "PATH=C:\Program Files\Git\cmd;C:\Program Files\Git\bin;C:\Program Files\Git\mingw64\bin;%PATH%"

echo ========================================================
echo   ENVIANDO PROJETO DRIVER PARA O SEU GITHUB
echo   Repositorio: https://github.com/mateusarlen/driver-oficina.git
echo ========================================================
echo.
echo Se aparecer uma janela do navegador ou da Microsoft/GitHub,
echo clique em "Sign in with your browser" ou faca login.
echo.
echo Aguarde...
echo.

"C:\Program Files\Git\cmd\git.exe" push -u origin main

echo.
if %errorlevel% equ 0 (
    color 0A
    echo ========================================================
    echo   SUCESSO! O app DRIVER foi enviado para o seu GitHub!
    echo ========================================================
) else (
    color 0C
    echo ========================================================
    echo   Nao foi possivel enviar. Tente novamente ou verifique.
    echo ========================================================
)
echo.
pause
