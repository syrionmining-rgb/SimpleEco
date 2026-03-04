@echo off
cd /d "%~dp0"

set "VENV=%~dp0venv"
set "PY=%~dp0venv\Scripts\python.exe"
set "PIP=%~dp0venv\Scripts\pip.exe"
set "SCRIPT=%~dp0link.py"

:: ── Cria o venv local se ainda nao existir ───────────────────────────
if not exist "%PY%" (
    echo Criando ambiente virtual em venv\...
    python -m venv "%VENV%"
    if errorlevel 1 (
        echo.
        echo ERRO: Python nao encontrado no sistema.
        echo Instale o Python 3.10+ em https://python.org e tente novamente.
        pause
        exit /b 1
    )
    echo Ambiente criado com sucesso.
)

:: ── Instala / atualiza dependencias ─────────────────────────────────
echo Verificando dependencias...
"%PIP%" install dbfread supabase watchdog python-dotenv pywebview -q --disable-pip-version-check

:: ── Abre o Link ──────────────────────────────────────────────────────
echo Abrindo Simple^&Eco Link...
start "" "%PY%" "%SCRIPT%"
