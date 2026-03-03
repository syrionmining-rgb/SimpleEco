Set-Location $PSScriptRoot
& ".venv\Scripts\uvicorn.exe" server.main:app --host 0.0.0.0 --port 8001 --reload
