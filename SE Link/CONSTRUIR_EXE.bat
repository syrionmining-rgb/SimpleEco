@echo off
setlocal
title Simple&Eco Link — Construtor de EXE
cd /d "%~dp0"

echo.
echo  ===================================================
echo   Simple^&Eco Link — Gerando executavel standalone
echo  ===================================================
echo.

REM ── 1. Localiza Python ────────────────────────────────────────────────────
set PY=
if exist "..\venv\Scripts\python.exe"   set PY=..\venv\Scripts\python.exe
if exist "..\\.venv\Scripts\python.exe" set PY=..\.venv\Scripts\python.exe
if exist "venv\Scripts\python.exe"      set PY=venv\Scripts\python.exe

if "%PY%"=="" (
    where python >nul 2>&1
    if not errorlevel 1 set PY=python
)

if "%PY%"=="" (
    echo [ERRO] Python nao encontrado. Instale o Python 3.10+ e tente novamente.
    pause
    exit /b 1
)
echo [OK] Python: %PY%

REM ── 2. Instala/atualiza dependencias ─────────────────────────────────────
echo.
echo [1/3] Instalando dependencias...
"%PY%" -m pip install pyinstaller dbfread supabase watchdog python-dotenv pywebview ^
    --quiet --disable-pip-version-check
if errorlevel 1 (
    echo [ERRO] Falha ao instalar dependencias.
    pause
    exit /b 1
)
echo [OK] Dependencias instaladas.

REM ── 3. Limpa builds anteriores ───────────────────────────────────────────
echo.
echo [2/3] Limpando builds anteriores...
if exist "%TEMP%\se_build"       rmdir /s /q "%TEMP%\se_build"
if exist "App\SimpleEcoLink.exe" del /f /q "App\SimpleEcoLink.exe"

REM ── 4. Compila com PyInstaller ───────────────────────────────────────────
echo.
echo [3/3] Compilando... (pode demorar 2-5 minutos)
"%PY%" -m PyInstaller link.spec --distpath App --workpath "%TEMP%\se_build" --noconfirm --clean
if errorlevel 1 (
    echo.
    echo [ERRO] Falha na compilacao. Verifique as mensagens acima.
    pause
    exit /b 1
)

REM ── 5. Copia .env para a pasta App ────────────────────────────────────────
if exist ".env" (
    copy /y ".env" "App\.env" >nul
    echo [OK] .env copiado para App\.env
)

REM ── 6. Limpa pasta temporaria build/ ─────────────────────────────────────
if exist "build" rmdir /s /q "build"

echo.
echo  ===================================================
echo   PRONTO!  App\SimpleEcoLink.exe gerado com sucesso
echo  ===================================================
echo.
echo  Para distribuir: copie a pasta App\ para o outro PC.
echo  O arquivo App\.env ja contem as credenciais.
echo.
pause
