/**
 * Segurança — Superfície de Ataque XSS (análise estática)
 * Cobre: item 10 (XSS), item 13 (revisão de APIs)
 *
 * Escaneia os arquivos-fonte para identificar padrões que introduzem
 * vulnerabilidades XSS: dangerouslySetInnerHTML, eval, innerHTML, document.write.
 */

import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'

function getSourceFiles(dir: string, excludeDirs: string[] = []): string[] {
  const files: string[] = []
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return files
  }
  for (const entry of entries) {
    if (excludeDirs.includes(entry)) continue
    const fullPath = join(dir, entry)
    try {
      if (statSync(fullPath).isDirectory()) {
        files.push(...getSourceFiles(fullPath, excludeDirs))
      } else if (/\.(tsx?|jsx?)$/.test(entry)) {
        files.push(fullPath)
      }
    } catch {
      // ignora arquivos inacessíveis
    }
  }
  return files
}

const srcDir = join(__dirname, '../..')
const sourceFiles = getSourceFiles(srcDir, ['__tests__', 'node_modules'])

function readFile(path: string): string {
  return readFileSync(path, 'utf-8')
}

describe('Segurança — Superfície XSS (análise estática) [items 10, 13]', () => {
  it('nenhum arquivo usa dangerouslySetInnerHTML', () => {
    const violations: string[] = []
    for (const file of sourceFiles) {
      if (readFile(file).includes('dangerouslySetInnerHTML')) {
        violations.push(file.replace(srcDir, 'src'))
      }
    }
    expect(violations).toEqual([])
  })

  it('nenhum arquivo usa eval()', () => {
    const violations: string[] = []
    for (const file of sourceFiles) {
      const content = readFile(file)
      // Detecta eval( mas ignora "evaluate" e comentários de disable
      if (/\beval\s*\(/.test(content)) {
        violations.push(file.replace(srcDir, 'src'))
      }
    }
    expect(violations).toEqual([])
  })

  it('nenhum arquivo atribui diretamente a .innerHTML', () => {
    const violations: string[] = []
    for (const file of sourceFiles) {
      const content = readFile(file)
      // Busca padrões como element.innerHTML = ... mas não innerHTML=""
      if (/\.innerHTML\s*=(?!=)/.test(content)) {
        violations.push(file.replace(srcDir, 'src'))
      }
    }
    expect(violations).toEqual([])
  })

  it('nenhum arquivo usa document.write()', () => {
    const violations: string[] = []
    for (const file of sourceFiles) {
      if (readFile(file).includes('document.write(')) {
        violations.push(file.replace(srcDir, 'src'))
      }
    }
    expect(violations).toEqual([])
  })

  it('nenhum arquivo usa new Function() para execução dinâmica', () => {
    const violations: string[] = []
    for (const file of sourceFiles) {
      if (/new\s+Function\s*\(/.test(readFile(file))) {
        violations.push(file.replace(srcDir, 'src'))
      }
    }
    expect(violations).toEqual([])
  })

  it('variáveis de ambiente VITE_ não contêm segredos hardcoded nos fontes', () => {
    // Verifica que as URLs de produção / chaves não estão hardcoded no código
    const sensitivePatterns = [
      /eyJ[A-Za-z0-9_-]{20,}/, // JWT tokens hardcoded
      /service_role[_\s]?key/i, // Supabase service role key
    ]
    const violations: string[] = []
    for (const file of sourceFiles) {
      const content = readFile(file)
      for (const pattern of sensitivePatterns) {
        if (pattern.test(content)) {
          violations.push(file.replace(srcDir, 'src'))
          break
        }
      }
    }
    expect(violations).toEqual([])
  })
})
