/**
 * Segurança — Análise de Dependências
 * Cobre: item 5 (análise de dependências)
 *
 * Executa npm audit e valida que não existem vulnerabilidades críticas ou
 * de alto risco nas dependências do projeto.
 */

import { spawnSync } from 'child_process'
import { join } from 'path'

interface AuditVulnerability {
  severity: string
  title: string
  url: string
  via?: unknown[]
}

interface AuditReport {
  metadata?: {
    vulnerabilities?: {
      critical?: number
      high?: number
      moderate?: number
      low?: number
      info?: number
      total?: number
    }
  }
  vulnerabilities?: Record<string, AuditVulnerability>
}

const projectRoot = join(__dirname, '../../../')

function runAudit(): AuditReport {
  const result = spawnSync('npm', ['audit', '--json'], {
    cwd: projectRoot,
    encoding: 'utf-8',
    shell: true,
  })

  const output = result.stdout || ''
  if (!output.trim()) {
    throw new Error('npm audit não retornou saída')
  }

  return JSON.parse(output) as AuditReport
}

describe('Segurança — Análise de Dependências [item 5]', () => {
  let auditReport: AuditReport

  beforeAll(() => {
    auditReport = runAudit()
  }, 60_000)

  it('npm audit executa sem erros internos', () => {
    expect(auditReport).toBeDefined()
    expect(auditReport).toHaveProperty('metadata')
  })

  it('não há vulnerabilidades CRÍTICAS nas dependências', () => {
    const critical = auditReport.metadata?.vulnerabilities?.critical ?? 0
    if (critical > 0) {
      const criticalVulns = Object.values(auditReport.vulnerabilities ?? {})
        .filter(v => v.severity === 'critical')
        .map(v => `• ${v.title} — ${v.url}`)
        .join('\n')
      throw new Error(`${critical} vulnerabilidade(s) crítica(s) encontrada(s):\n${criticalVulns}`)
    }
    expect(critical).toBe(0)
  })

  it('não há vulnerabilidades de ALTO risco nas dependências', () => {
    const high = auditReport.metadata?.vulnerabilities?.high ?? 0
    if (high > 0) {
      const highVulns = Object.values(auditReport.vulnerabilities ?? {})
        .filter(v => v.severity === 'high')
        .map(v => `• ${v.title} — ${v.url}`)
        .join('\n')
      throw new Error(`${high} vulnerabilidade(s) de alto risco encontrada(s):\n${highVulns}`)
    }
    expect(high).toBe(0)
  })

  it('exibe resumo de vulnerabilidades moderadas e baixas (informativo)', () => {
    const vulns = auditReport.metadata?.vulnerabilities ?? {}
    const moderate = vulns.moderate ?? 0
    const low = vulns.low ?? 0
    const total = vulns.total ?? 0

    // Teste informativo — não falha para moderate/low, apenas registra
    console.info(
      `\n  Resumo do audit:\n` +
      `    Total: ${total} | Moderado: ${moderate} | Baixo: ${low}`
    )

    // Passa sempre — visibilidade sem bloquear CI
    expect(total).toBeGreaterThanOrEqual(0)
  })
})
