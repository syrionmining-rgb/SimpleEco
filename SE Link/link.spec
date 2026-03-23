# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec — Simple&Eco Link
# Gera:  App/SimpleEcoLink.exe  (standalone, sem precisar do Python)

block_cipher = None

a = Analysis(
    ['link.py'],
    pathex=['.'],
    binaries=[],
    datas=[
        # Interface HTML
        ('gui',              'gui'),
        # Módulo de sync (importado dinamicamente em runtime)
        ('sync_supabase.py', '.'),
    ],
    hiddenimports=[
        # pywebview — backend Edge/Chromium no Windows
        'webview',
        'webview.platforms.winforms',
        'webview.platforms.edgechromium',
        # watchdog
        'watchdog.observers',
        'watchdog.observers.winapi',
        'watchdog.observers.polling',
        'watchdog.events',
        # supabase
        'supabase',
        'supabase._sync.client',
        'gotrue',
        'httpx',
        'postgrest',
        'realtime',
        'storage3',
        # pg8000 (DDL direto + TRUNCATE)
        'pg8000',
        'pg8000.native',
        'scramp',
        'asn1crypto',
        # outros
        'dotenv',
        'dbfread',
        'dbfread.ifiles',
        'encodings',
        'encodings.utf_8',
        'encodings.cp1252',
        'encodings.latin_1',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['tkinter', 'matplotlib', 'numpy', 'pandas', 'scipy'],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='SimpleEcoLink',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,           # sem janela de console
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='link_icon.ico',
)
