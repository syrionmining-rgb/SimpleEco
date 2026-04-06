"""
Fix double-encoded UTF-8 strings in a TypeScript file.
When PowerShell reads UTF-8 as Windows-1252 (ANSI) then writes as UTF-8,
every non-ASCII byte gets double-encoded. This script reverses that.
"""

import sys

# Windows-1252: bytes 0x80-0x9F map to specific Unicode points (the rest map to same code point)
CP1252_BYTE_TO_UNI = {
    0x80: '\u20ac', 0x82: '\u201a', 0x83: '\u0192', 0x84: '\u201e',
    0x85: '\u2026', 0x86: '\u2020', 0x87: '\u2021', 0x88: '\u02c6',
    0x89: '\u2030', 0x8a: '\u0160', 0x8b: '\u2039', 0x8c: '\u0152',
    0x8e: '\u017d', 0x91: '\u2018', 0x92: '\u2019', 0x93: '\u201c',
    0x94: '\u201d', 0x95: '\u2022', 0x96: '\u2013', 0x97: '\u2014',
    0x98: '\u02dc', 0x99: '\u2122', 0x9a: '\u0161', 0x9b: '\u203a',
    0x9c: '\u0153', 0x9e: '\u017e', 0x9f: '\u0178',
}
# Undefined cp1252 bytes that Python passes through as their Unicode equivalents
UNDEFINED_BYTES = {0x81, 0x8d, 0x8f, 0x90, 0x9d}

# Build reverse: Unicode char -> original byte value
UNI_TO_BYTE = {}
# ASCII passthrough
for b in range(0x80):
    UNI_TO_BYTE[chr(b)] = b
# Windows-1252 special mappings (0x80-0x9F defined)
for b, u in CP1252_BYTE_TO_UNI.items():
    UNI_TO_BYTE[u] = b
# Undefined bytes: Python maps them to same code point
for b in UNDEFINED_BYTES:
    UNI_TO_BYTE[chr(b)] = b
# Latin-1 supplement: 0xA0-0xFF map to same Unicode code point
for b in range(0xa0, 0x100):
    UNI_TO_BYTE[chr(b)] = b


def fix_mojibake(content: str) -> str:
    result = []
    i = 0
    while i < len(content):
        c = content[i]
        if ord(c) < 0x80:
            # ASCII - keep as-is
            result.append(c)
            i += 1
        elif c in UNI_TO_BYTE:
            # Collect a run of chars that map to non-ASCII bytes
            run = bytearray()
            j = i
            while j < len(content) and content[j] in UNI_TO_BYTE:
                run.append(UNI_TO_BYTE[content[j]])
                j += 1
            # Try to decode the byte run as UTF-8
            try:
                decoded = run.decode('utf-8')
                result.append(decoded)
                i = j
            except UnicodeDecodeError:
                # Partial decode: try byte by byte to salvage as much as possible
                k = 0
                while k < len(run):
                    # Try to find the longest valid UTF-8 sequence starting at k
                    decoded_char = None
                    for length in [4, 3, 2, 1]:
                        if k + length <= len(run):
                            try:
                                decoded_char = run[k:k+length].decode('utf-8')
                                k += length
                                break
                            except:
                                pass
                    if decoded_char is not None:
                        result.append(decoded_char)
                    else:
                        # Keep the original mojibake char
                        result.append(content[i + k])
                        k += 1
                i = j
        else:
            # Character outside our mapping (genuine Unicode already correct, or emoji etc.)
            result.append(c)
            i += 1
    return ''.join(result)


if __name__ == '__main__':
    filepath = r"c:\Users\Arthu\OneDrive\Área de Trabalho\G.Form\G.Form 2.0\G.Form\src\pages\AdminPanel.tsx"
    
    with open(filepath, 'r', encoding='utf-8') as f:
        original = f.read()
    
    fixed = fix_mojibake(original)
    
    # Sanity check: count remaining mojibake indicators
    orig_bad = sum(1 for c in original if ord(c) > 0x7f)
    fixed_bad = sum(1 for c in fixed if ord(c) > 0x7f)
    
    # Show a few fixed samples
    orig_lines = original.split('\n')
    fixed_lines = fixed.split('\n')
    print("Sample fixes:")
    for i, (a, b) in enumerate(zip(orig_lines, fixed_lines)):
        if a != b:
            print(f"  L{i+1}: {a[:80]}")
            print(f"    -> {b[:80]}")
            print()
    
    print(f"Original non-ASCII chars: {orig_bad}")
    print(f"Fixed non-ASCII chars:    {fixed_bad}")
    print(f"Reduction: {orig_bad - fixed_bad} chars fixed")
    
    # Write back
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(fixed)
    print("File written successfully.")
