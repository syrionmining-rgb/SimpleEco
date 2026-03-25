import React, { useState, useEffect, useMemo } from 'react'
import {
  Sun, Moon, LogOut, Settings, Users, Database, Package, Home, Box,
  ScrollText, RefreshCw, Search, ChevronDown, ChevronUp, ChevronLeft,
  GitBranch, Plus, X, Check, Monitor, Smartphone, ScanLine, Trash2, Pencil, Menu, MapPin,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const ADMIN_MODULE_STORAGE_KEY = 'se_admin_selected_module'
const ADMIN_MODULE_IDS = ['dashboard', 'orders', 'sectors', 'products', 'clients', 'database', 'settings', 'logs'] as const
type AdminModuleId = (typeof ADMIN_MODULE_IDS)[number]

function isValidAdminModule(value: string | null): value is AdminModuleId {
  if (!value) return false
  return (ADMIN_MODULE_IDS as readonly string[]).includes(value)
}

// ── Sidebar item ──────────────────────────────────────────────────────────────

interface SidebarItemProps { title: string; icon: LucideIcon; active?: boolean; onClick: () => void }
function SidebarItem({ title, icon: Icon, active, onClick }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm font-medium transition-all ${
        active
          ? 'bg-[#FF8C00] text-white shadow-sm'
          : 'text-[var(--th-txt-3)] hover:bg-[var(--th-hover)] hover:text-[var(--th-txt-1)]'
      }`}
    >
      <Icon strokeWidth={1.5} className="w-4 h-4 shrink-0" />
      <span className="flex-1">{title}</span>
    </button>
  )
}

function SidebarSection({ label }: { label: string }) {
  return (
    <p className="px-3 pt-5 pb-1.5 text-[11px] font-semibold uppercase tracking-widest text-[var(--th-txt-4)]">
      {label}
    </p>
  )
}

// ── Interfaces ────────────────────────────────────────────────────────────────

interface SeLinkLog {
  id: number
  created_at: string
  level: string
  message: string
}

interface SyncConfigRow {
  dbf_name: string
  table_name: string | null
  pk_field: string | null
  enabled: boolean
  discovered: boolean
  found_at: string | null
}

interface PedidoRow {
  [key: string]: unknown
  CODIGO?: string; NOME?: string; CLIENTE?: string; PREVISAO?: string; VENDA?: string
  SALDO?: number | string | null; TOTAL?: number | string | null
  PRODUCAO?: number | string | null; FATURADOS?: number | string | null
  OC?: string; PEDCLIENTE?: string | number | null
}
interface TalaoRow {
  [key: string]: unknown
  CODIGO?: string; PEDIDO?: string; ITEM?: string; REFERENCIA?: string
  REMESSA?: string; TOTAL?: number | string | null; CANCELADO?: unknown; FATURADO?: unknown
  NUMEROS?: string; GRADE?: string; DE_ATE?: string
}
interface TalsetorRow {
  [key: string]: unknown
  TALAO?: string; SETOR?: string; NOMESET?: string; DATA?: string
  QTDE?: number | string | null; REMESSA?: string
}
interface ClienteRow {
  [key: string]: unknown
  CODIGO?: string; NOME?: string; FANTASIA?: string
  CNPJ?: string; CHAVE?: string
  ENDERECO?: string; NUMERO?: string; COMPL?: string; BAIRRO?: string
  CIDADE?: string; ESTADO?: string; CEP?: string
  INCLUIDO?: string; ATUALIZADO?: string
}
interface DeviceLogRow {
  id: string; username: string | null; nome: string | null; ip: string | null
  device_type: string | null; os: string | null; browser: string | null
  created_at: string | null; expires_at: string | null; revoked_at: string | null
  user_agent: string | null; status: string | null
}
interface FichaRow {
  [key: string]: unknown
  CODIGO?: string; NOME?: string; REFER?: string; NOMECOR?: string
  MATRIZ?: string | number | null; NAVALHA?: string | number | null
  COR01?: string; COR02?: string; COR03?: string; OBS?: string
  GRADE?: string; CONSTRUC?: string; SALTO?: string; PALMILHA?: string
  FORMA?: string; LINHA?: string; PROD_TXT?: string
}
interface PeditenRow {
  [key: string]: unknown
  CODIGO?: string; ITEM?: string; REFERENCIA?: string; REMESSA?: string; LOTE?: string
}
interface GradeRow {
  [key: string]: unknown
  CODIGO?: string; NOME?: string; GRADE?: string
}
interface PedimateRow {
  [key: string]: unknown
  CODIGO?: string; ITEM?: string; TIPO?: string; NOMESET?: string
  MATERIAL?: string; NOMEMAT?: string; UNI?: string; CONSUMO?: number | string | null
}
interface MoviprodRow {
  [key: string]: unknown
  CODIGO?: string; SETOR?: string; DATAENT?: string; HORAENT?: string; DATASDA?: string
}
interface SequesetRow {
  [key: string]: unknown
  CODIGO?: string; SETOR?: string; SEQ?: string; TALAO?: unknown
}

interface RemessaNode { codigo: string; movimentos: TalsetorRow[]; qtdeTotal: number }
interface TalaoNode { talao: TalaoRow; remessas: RemessaNode[] }
interface PedidoNode { pedido: PedidoRow; taloes: TalaoNode[] }
interface RemessaTreeNode {
  remessa: string; totalQtde: number
  taloes: Array<{ talao: TalaoRow; pedido: PedidoRow | undefined; clienteNome: string; fichaNome: string; movimentos: TalsetorRow[]; latestSetor: string }>
}
interface ProdItem {
  id: number; nome: string; descricao: string | null; ativo: boolean; created_at: string
}
interface ProdEtapa {
  id: number; item_id: number; nome: string; ordem: number; created_at: string
}
interface PedidoFluxo {
  id: number; pedido_codigo: string; item_id: number; created_at: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function asText(value: unknown): string { return value === null || value === undefined ? '' : String(value) }
function fmtDate(value: unknown): string {
  const raw = asText(value).trim(); if (!raw) return '—'
  const d = new Date(raw); return Number.isNaN(d.getTime()) ? raw : d.toLocaleDateString('pt-BR')
}
function fmtNumber(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  const n = Number(value); return Number.isFinite(n) ? n.toLocaleString('pt-BR') : asText(value)
}
function toNumber(value: unknown): number { const n = Number(value); return Number.isFinite(n) ? n : 0 }
function isTruthy(value: unknown): boolean {
  if (!value) return false
  const s = String(value).trim().toUpperCase()
  return s === '1' || s === 'S' || s === 'SIM' || s === 'TRUE'
}
function parseNumeros(numeros: unknown): Array<{ slot: number; qty: number }> {
  const s = String(numeros ?? '').trim()
  if (s.length < 63) return []
  const body = s.slice(0, 60)
  const result: Array<{ slot: number; qty: number }> = []
  for (let i = 0; i < 15; i++) {
    const qty = parseInt(body.slice(i * 4, i * 4 + 4), 10)
    if (!isNaN(qty) && qty > 0) result.push({ slot: 32 + i, qty })
  }
  return result
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AdminPanel() {
  const [selectedModule, setSelectedModule] = useState<AdminModuleId>(() => {
    const stored = localStorage.getItem(ADMIN_MODULE_STORAGE_KEY)
    return isValidAdminModule(stored) ? stored : 'dashboard'
  })

  // ── Orders state ─────────────────────────────────────────────────────────
  const [ordersSubTab, setOrdersSubTab] = useState<'pedidos' | 'remessas'>('pedidos')
  const [ordersSubTabOpen, setOrdersSubTabOpen] = useState(false)
  const [totalOrders, setTotalOrders] = useState<number | null>(null)
  const [orders, setOrders] = useState<PedidoRow[]>([])
  const [taloes, setTaloes] = useState<TalaoRow[]>([])
  const [talsetor, setTalsetor] = useState<TalsetorRow[]>([])
  const [clientes, setClientes] = useState<ClienteRow[]>([])
  const [fichas, setFichas] = useState<FichaRow[]>([])
  const [peditens, setPeditens] = useState<PeditenRow[]>([])
  const [grades, setGrades] = useState<GradeRow[]>([])
  const [pedimate, setPedimate] = useState<PedimateRow[]>([])
  const [expandedBom, setExpandedBom] = useState<Set<string>>(new Set())
  const [moviprod, setMoviprod] = useState<MoviprodRow[]>([])
  const [sequeset, setSequeset] = useState<SequesetRow[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersError, setOrdersError] = useState<string | null>(null)
  const [ordersQuery, setOrdersQuery] = useState('')
  const [remessasQuery, setRemessasQuery] = useState('')
  const [, setOrdersLastSync] = useState<Date | null>(null)
  const [selectedPedidoDetail, setSelectedPedidoDetail] = useState<PedidoNode | null>(null)
  const [selectedRemessaDetail, setSelectedRemessaDetail] = useState<RemessaTreeNode | null>(null)
  const [talaoSearch, setTalaoSearch] = useState('')
  const [talaoStatusFilter, setTalaoStatusFilter] = useState<'todos' | 'em_producao' | 'finalizado' | 'cancelado'>('todos')
  const [pedidoStatusFilter, setPedidoStatusFilter] = useState<'todos' | 'em_producao' | 'atrasado' | 'finalizado'>('todos')
  const [pedidoFluxoMap, setPedidoFluxoMap] = useState<Map<string, PedidoFluxo>>(new Map())
  const [pedidoFluxoSaving, setPedidoFluxoSaving] = useState(false)
  const [pedidoFluxoSelect, setPedidoFluxoSelect] = useState<number | ''>('')
  const [fluxoDropdownOpen, setFluxoDropdownOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // ── Logs state ────────────────────────────────────────────────────────────
  const [logs, setLogs] = useState<DeviceLogRow[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logsError, setLogsError] = useState<string | null>(null)
  const [logsLastSync, setLogsLastSync] = useState<Date | null>(null)
  const [selectedLog, setSelectedLog] = useState<DeviceLogRow | null>(null)
  const [logsQuery, setLogsQuery] = useState('')
  const [showClearLogsConfirm, setShowClearLogsConfirm] = useState(false)
  const [clearLogsLoading, setClearLogsLoading] = useState(false)

  // ── Clients state ─────────────────────────────────────────────────────────
  const [clientesAll, setClientesAll] = useState<ClienteRow[]>([])
  const [clientesLoading, setClientesLoading] = useState(false)
  const [clientesError, setClientesError] = useState<string | null>(null)
  const [clientesQuery, setClientesQuery] = useState('')
  const [clientesEstado, setClientesEstado] = useState('')
  const [clientesEstadoOpen, setClientesEstadoOpen] = useState(false)
  const [selectedCliente, setSelectedCliente] = useState<ClienteRow | null>(null)

  async function fetchClientes() {
    setClientesLoading(true); setClientesError(null)
    try {
      const rows = await fetchTableRows<ClienteRow>('clientes')
      rows.sort((a, b) => asText(a.NOME).localeCompare(asText(b.NOME), 'pt-BR'))
      setClientesAll(rows)
    } catch (err) {
      setClientesError(err instanceof Error ? err.message : 'Erro ao carregar clientes.')
    } finally { setClientesLoading(false) }
  }

  useEffect(() => {
    if (selectedModule === 'clients' && clientesAll.length === 0) void fetchClientes()
  }, [selectedModule])

  // ── Database / sync state ─────────────────────────────────────────────────
  const [forceSyncLoading, setForceSyncLoading] = useState(false)
  const [forceSyncStatus, setForceSyncStatus] = useState<'idle' | 'waiting' | 'done' | 'error'>('idle')
  const [forceSyncError, setForceSyncError] = useState<string | null>(null)
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null)
  const [seLinkOnline, setSeLinkOnline] = useState<boolean | null>(null)
  const [seLinkLogs, setSeLinkLogs] = useState<SeLinkLog[]>([])
  const [seLinkLogsClearing, setSeLinkLogsClearing] = useState(false)
  const [seLinkLogsFilter, setSeLinkLogsFilter] = useState<'ALL' | 'INFO' | 'WARNING' | 'ERROR'>('ALL')
  const [syncConfig, setSyncConfig] = useState<SyncConfigRow[]>([])
  const [syncConfigLoading, setSyncConfigLoading] = useState(false)
  const [syncConfigToggles, setSyncConfigToggles] = useState<Record<string, boolean>>({})
  const [syncConfigSearch, setSyncConfigSearch] = useState('')
  const [syncConfigFilter, setSyncConfigFilter] = useState<'all' | 'active'>('all')
  const [syncConfigSavedToggles, setSyncConfigSavedToggles] = useState<Record<string, boolean> | null>(null)
  const forceSyncPollRef = React.useRef<ReturnType<typeof setInterval> | null>(null)
  const heartbeatIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null)
  const logsEndRef = React.useRef<HTMLDivElement | null>(null)
  const logsChannelRef = React.useRef<ReturnType<typeof supabase.channel> | null>(null)

  // ── Scanner state ─────────────────────────────────────────────────────────
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scannerError, setScannerError] = useState<string | null>(null)
  const [scannerStatus, setScannerStatus] = useState<'loading' | 'scanning' | 'error'>('loading')
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null)
  const [lastScannedFormat, setLastScannedFormat] = useState<string | null>(null)
  const videoRef = React.useRef<HTMLVideoElement | null>(null)
  const scannerControlsRef = React.useRef<{ stop: () => void } | null>(null)
  const onScanRef = React.useRef<((code: string) => void) | null>(null)
  const lastScanRef = React.useRef<{ code: string; time: number }>({ code: '', time: 0 })

  async function fetchLastSync() {
    try {
      const { data } = await supabase.from('sync_log').select('ultima_sync, last_heartbeat').eq('id', 1).single()
      if (data?.ultima_sync) {
        const d = new Date(data.ultima_sync as string)
        setLastSyncTime(d.toLocaleString('pt-BR', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit', second: '2-digit',
        }))
      }
      const hb = data?.last_heartbeat as string | null | undefined
      if (hb) {
        setSeLinkOnline(Date.now() - new Date(hb).getTime() < 90_000)
      } else {
        setSeLinkOnline(false)
      }
      return null
    } catch { return null }
  }

  async function fetchSyncFlags() {
    try {
      const { data } = await supabase.from('sync_log').select('ultima_sync, force_sync, last_heartbeat').eq('id', 1).single()
      if (data?.ultima_sync) {
        const d = new Date(data.ultima_sync as string)
        setLastSyncTime(d.toLocaleString('pt-BR', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit', second: '2-digit',
        }))
      }
      const hb = data?.last_heartbeat as string | null | undefined
      if (hb) {
        setSeLinkOnline(Date.now() - new Date(hb).getTime() < 90_000)
      } else {
        setSeLinkOnline(false)
      }
      return data as { ultima_sync: string | null; force_sync: boolean | null } | null
    } catch { return null }
  }

  async function requestForceSync() {
    setForceSyncLoading(true); setForceSyncError(null); setForceSyncStatus('idle')
    try {
      const { error } = await supabase.from('sync_log').update({ force_sync: true }).eq('id', 1)
      if (error) throw new Error(error.message)
      setForceSyncLoading(false)
      setForceSyncStatus('waiting')

      // Polling: verifica a cada 3s se o SE Link já completou (force_sync voltou a false)
      if (forceSyncPollRef.current) clearInterval(forceSyncPollRef.current)
      forceSyncPollRef.current = setInterval(async () => {
        const data = await fetchSyncFlags()
        if (data && data.force_sync === false) {
          clearInterval(forceSyncPollRef.current!)
          forceSyncPollRef.current = null
          setForceSyncStatus('done')
          setTimeout(() => setForceSyncStatus('idle'), 4000)
        }
      }, 3000)

      // Timeout de segurança: 2 minutos
      setTimeout(() => {
        if (forceSyncPollRef.current) {
          clearInterval(forceSyncPollRef.current)
          forceSyncPollRef.current = null
          setForceSyncStatus(s => s === 'waiting' ? 'idle' : s)
        }
      }, 120_000)
    } catch (err) {
      setForceSyncError(err instanceof Error ? err.message : 'Erro ao solicitar sync.')
      setForceSyncStatus('error')
      setForceSyncLoading(false)
    }
  }

  async function fetchSeLinkLogs() {
    try {
      const { data } = await supabase
        .from('se_link_logs')
        .select('id, created_at, level, message')
        .order('id', { ascending: true })
        .limit(200)
      if (data) setSeLinkLogs(data as SeLinkLog[])
    } catch { /* ignore */ }
  }

  async function clearSeLinkLogs() {
    setSeLinkLogsClearing(true)
    try {
      await supabase.from('se_link_logs').delete().gt('id', 0)
      setSeLinkLogs([])
    } catch { /* ignore */ }
    setSeLinkLogsClearing(false)
  }

  async function fetchSyncConfig() {
    setSyncConfigLoading(true)
    try {
      const { data } = await supabase
        .from('sync_config')
        .select('dbf_name, table_name, pk_field, enabled, discovered, found_at')
        .order('dbf_name', { ascending: true })
      if (data) {
        setSyncConfig(data as SyncConfigRow[])
        const toggles: Record<string, boolean> = {}
        for (const row of data as SyncConfigRow[]) toggles[row.dbf_name] = row.enabled
        setSyncConfigToggles(toggles)
      }
    } catch { /* ignore */ }
    setSyncConfigLoading(false)
  }

  async function toggleSyncConfig(dbfName: string, enabled: boolean) {
    setSyncConfigToggles(prev => ({ ...prev, [dbfName]: enabled }))
    try {
      await supabase.from('sync_config').update({ enabled, updated_at: new Date().toISOString() }).eq('dbf_name', dbfName)
    } catch {
      setSyncConfigToggles(prev => ({ ...prev, [dbfName]: !enabled }))
    }
  }

  async function clearSyncSelection() {
    const enabledNames = Object.entries(syncConfigToggles).filter(([, v]) => v).map(([k]) => k)
    if (enabledNames.length === 0) return
    setSyncConfigSavedToggles({ ...syncConfigToggles })
    setSyncConfigToggles(prev => Object.fromEntries(Object.keys(prev).map(k => [k, false])))
    try {
      await supabase.from('sync_config').update({ enabled: false, updated_at: new Date().toISOString() }).in('dbf_name', enabledNames)
    } catch {
      setSyncConfigToggles(prev => ({ ...prev, ...syncConfigToggles }))
      setSyncConfigSavedToggles(null)
    }
  }

  async function restoreSyncSelection() {
    if (!syncConfigSavedToggles) return
    const saved = syncConfigSavedToggles
    setSyncConfigSavedToggles(null)
    setSyncConfigToggles(saved)
    const enabledNames = Object.entries(saved).filter(([, v]) => v).map(([k]) => k)
    const disabledNames = Object.entries(saved).filter(([, v]) => !v).map(([k]) => k)
    try {
      if (enabledNames.length) await supabase.from('sync_config').update({ enabled: true, updated_at: new Date().toISOString() }).in('dbf_name', enabledNames)
      if (disabledNames.length) await supabase.from('sync_config').update({ enabled: false, updated_at: new Date().toISOString() }).in('dbf_name', disabledNames)
    } catch { /* best effort */ }
  }

  useEffect(() => {
    if (logsEndRef.current) logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [seLinkLogs])

  useEffect(() => {
    if (selectedModule === 'database') {
      void fetchLastSync()
      void fetchSeLinkLogs()
      void fetchSyncConfig()
      heartbeatIntervalRef.current = setInterval(() => void fetchLastSync(), 30_000)

      // Realtime: escuta novos logs em tempo real
      const channel = supabase
        .channel('se_link_logs_stream')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'se_link_logs' },
          (payload) => {
            setSeLinkLogs(prev => {
              const next = [...prev, payload.new as SeLinkLog]
              return next.slice(-200)
            })
          })
        .subscribe()
      logsChannelRef.current = channel
    }
    return () => {
      if (forceSyncPollRef.current) clearInterval(forceSyncPollRef.current)
      if (heartbeatIntervalRef.current) { clearInterval(heartbeatIntervalRef.current); heartbeatIntervalRef.current = null }
      if (logsChannelRef.current) { void supabase.removeChannel(logsChannelRef.current); logsChannelRef.current = null }
    }
  }, [selectedModule])

  // ── Production Flow state ──────────────────────────────────────────────────
  const [prodItems, setProdItems] = useState<ProdItem[]>([])
  const [prodItemsLoading, setProdItemsLoading] = useState(false)
  const [prodItemsError, setProdItemsError] = useState<string | null>(null)
  const [prodItemsQuery, setProdItemsQuery] = useState('')
  const [selectedProdItem, setSelectedProdItem] = useState<ProdItem | null>(null)
  const [prodEtapas, setProdEtapas] = useState<ProdEtapa[]>([])
  const [prodEtapasLoading, setProdEtapasLoading] = useState(false)
  const [showNewItemForm, setShowNewItemForm] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemSaving, setNewItemSaving] = useState(false)
  const [newItemError, setNewItemError] = useState<string | null>(null)
  const [newEtapaName, setNewEtapaName] = useState('')
  const [newEtapaSaving, setNewEtapaSaving] = useState(false)
  const [etapaEditId, setEtapaEditId] = useState<number | null>(null)
  const [etapaEditName, setEtapaEditName] = useState('')
  const [editItemMode, setEditItemMode] = useState(false)
  const [editItemName, setEditItemName] = useState('')
  const [showDeleteItemConfirm, setShowDeleteItemConfirm] = useState(false)
  const [deleteItemLoading, setDeleteItemLoading] = useState(false)

  const { logout } = useAuth()
  const navigate = useNavigate()

  // ── Auth / Theme ──────────────────────────────────────────────────────────

  async function handleLogout() { await logout(); navigate('/login', { replace: true }) }

  function toggleTheme() {
    const next = localStorage.getItem('se_theme') === 'light' ? 'dark' : 'light'
    localStorage.setItem('se_theme', next)
    document.documentElement.classList.toggle('dark', next === 'dark')
  }

  const isDark = document.documentElement.classList.contains('dark')

  // ── Sidebar modules ───────────────────────────────────────────────────────

  const sidebarSections: Array<{ label: string; items: Array<{ id: AdminModuleId; title: string; icon: LucideIcon }> }> = [
    {
      label: 'Operações',
      items: [
        { id: 'dashboard', title: 'Dashboard', icon: Home },
        { id: 'orders',    title: 'Pedidos',   icon: Box },
        { id: 'sectors',   title: 'Fluxo de Produção', icon: GitBranch },
        { id: 'clients',   title: 'Clientes',  icon: Users },
      ],
    },
    {
      label: 'Produtos',
      items: [
        { id: 'products', title: 'Produtos', icon: Package },
      ],
    },
    {
      label: 'Sistema',
      items: [
        { id: 'database', title: 'Banco de Dados', icon: Database },
        { id: 'logs',     title: 'Logs',           icon: ScrollText },
        { id: 'settings', title: 'Configuração',   icon: Settings },
      ],
    },
  ]

  const recentActivities = [
    { title: 'Backup Automático', description: 'Backup completo do banco de dados executado com sucesso.', timestamp: '2h atrás', tag: 'sistema' },
    { title: 'Novo Usuário Cadastrado', description: 'João Silva foi adicionado ao sistema com permissões de operador.', timestamp: '4h atrás', tag: 'usuários' },
    { title: 'Erro de Sincronização', description: 'Falha na sincronização com o servidor externo. Necessária intervenção manual.', timestamp: '6h atrás', tag: 'erro' },
    { title: 'Atualização de Sistema', description: 'Nova versão disponível v2.1.3 com correções de bugs.', timestamp: '1 dia atrás', tag: 'atualização' },
  ]

  // ── Fetch helpers ─────────────────────────────────────────────────────────

  async function fetchTableRows<T extends Record<string, unknown>>(
    tableName: string, columns = '*'
  ): Promise<T[]> {
    const PAGE = 1000
    const { count, error: cErr } = await supabase
      .from(tableName).select('*', { count: 'exact', head: true })
    if (cErr) throw new Error(`${tableName}: ${cErr.message}`)
    if (!count) return []

    const totalPages = Math.ceil(count / PAGE)
    const CONCURRENCY = 5
    const allRows: T[] = []

    for (let start = 0; start < totalPages; start += CONCURRENCY) {
      const batch = Array.from({ length: Math.min(CONCURRENCY, totalPages - start) }, (_, i) => {
        const from = (start + i) * PAGE
        return supabase.from(tableName).select(columns).range(from, from + PAGE - 1)
      })
      const results = await Promise.all(batch)
      for (const { data, error } of results) {
        if (error) throw new Error(`${tableName}: ${error.message}`)
        if (data) allRows.push(...(data as unknown as T[]))
      }
    }
    return allRows
  }

  async function fetchAllOrders() {
    setOrdersLoading(true); setOrdersError(null)
    try {
      const [pedidosRows, taloesRows, talsetorRows, clientesRows, fichasRows] = await Promise.all([
        fetchTableRows<PedidoRow>('pedidos',  'CODIGO,NOME,CLIENTE,PREVISAO,VENDA,SALDO,TOTAL,PRODUCAO,FATURADOS,OC,PEDCLIENTE'),
        fetchTableRows<TalaoRow>('taloes',    'CODIGO,PEDIDO,ITEM,REFERENCIA,REMESSA,TOTAL,CANCELADO,FATURADO,NUMEROS,GRADE,DE_ATE'),
        fetchTableRows<TalsetorRow>('talsetor','TALAO,SETOR,NOMESET,DATA,QTDE,REMESSA'),
        fetchTableRows<ClienteRow>('clientes', 'CODIGO,NOME,FANTASIA,CNPJ,CHAVE,ENDERECO,NUMERO,COMPL,BAIRRO,CIDADE,ESTADO,CEP,INCLUIDO,ATUALIZADO'),
        fetchTableRows<FichaRow>('fichas',     'CODIGO,NOME,REFER,NOMECOR,MATRIZ,NAVALHA,COR01,COR02,COR03,OBS,GRADE,CONSTRUC,SALTO,PALMILHA,FORMA,LINHA,PROD_TXT'),
      ])
      pedidosRows.sort((a, b) => asText(a.CODIGO).localeCompare(asText(b.CODIGO), 'pt-BR'))
      taloesRows.sort((a, b) => {
        const r = asText(a.PEDIDO).localeCompare(asText(b.PEDIDO), 'pt-BR')
        return r !== 0 ? r : asText(a.CODIGO).localeCompare(asText(b.CODIGO), 'pt-BR')
      })
      talsetorRows.sort((a, b) => {
        const r = asText(a.TALAO).localeCompare(asText(b.TALAO), 'pt-BR')
        return r !== 0 ? r : asText(b.DATA).localeCompare(asText(a.DATA), 'pt-BR')
      })
      setOrders(pedidosRows); setTaloes(taloesRows); setTalsetor(talsetorRows)
      setClientes(clientesRows); setFichas(fichasRows); setOrdersLastSync(new Date())

      // peditens — tabela opcional, conecta talão → ficha via PEDIDO+ITEM
      try {
        const peditensRows = await fetchTableRows<PeditenRow>('peditens', 'CODIGO,ITEM,REFERENCIA,REMESSA,LOTE')
        setPeditens(peditensRows)
      } catch { /* tabela ainda não disponível no Supabase, ignora silenciosamente */ }

      // grades — tabela opcional, nome da grade por código
      try {
        const gradesRows = await fetchTableRows<GradeRow>('grades', 'CODIGO,NOME,GRADE')
        setGrades(gradesRows)
      } catch { /* ignora silenciosamente */ }

      // pedimate — tabela opcional, materiais por talão
      try {
        const pedimateRows = await fetchTableRows<PedimateRow>('pedimate', 'CODIGO,ITEM,TIPO,NOMESET,MATERIAL,NOMEMAT,UNI,CONSUMO')
        setPedimate(pedimateRows)
      } catch { /* ignora silenciosamente */ }

      // moviprod — posição atual do talão no chão de fábrica (scan de barcode)
      try {
        const moviprodRows = await fetchTableRows<MoviprodRow>('moviprod', 'CODIGO,SETOR,DATAENT,HORAENT,DATASDA')
        setMoviprod(moviprodRows)
      } catch { /* ignora silenciosamente */ }

      // sequeset — fluxo esperado de setores por ficha
      try {
        const sequesetRows = await fetchTableRows<SequesetRow>('sequeset', 'CODIGO,SETOR,SEQ,TALAO')
        setSequeset(sequesetRows)
      } catch { /* ignora silenciosamente */ }

      // pedido_fluxo — tabela opcional, vínculo de fluxo de produção por pedido
      void fetchPedidoFluxo()
    } catch (err) {
      setOrdersError(err instanceof Error ? err.message : 'Erro ao carregar.')
    } finally { setOrdersLoading(false) }
  }

  async function clearLogs() {
    setClearLogsLoading(true)
    try {
      const { error } = await supabase.rpc('limpar_historico_sessoes')
      if (error) throw new Error(error.message)
      setLogs([])
      setSelectedLog(null)
      setShowClearLogsConfirm(false)
    } catch (err) { setLogsError(err instanceof Error ? err.message : 'Erro ao limpar logs.') }
    finally { setClearLogsLoading(false) }
  }

  async function fetchLogs() {
    setLogsLoading(true); setLogsError(null)
    try {
      const { data, error } = await supabase.rpc('get_login_activity')
      if (error) throw new Error(error.message)
      setLogs((data ?? []) as DeviceLogRow[])
      setLogsLastSync(new Date())
    } catch (err) { setLogsError(err instanceof Error ? err.message : 'Erro ao carregar logs.') }
    finally { setLogsLoading(false) }
  }

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => { localStorage.setItem(ADMIN_MODULE_STORAGE_KEY, selectedModule) }, [selectedModule])

  useEffect(() => {
    async function run() { const { count, error } = await supabase.from('pedidos').select('*', { count: 'exact', head: true }); if (!error) setTotalOrders(count ?? 0) }
    void run(); const id = setInterval(() => { void run() }, 60_000); return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (selectedModule !== 'orders' && selectedModule !== 'clients') return
    if (orders.length === 0) void fetchAllOrders()
    const id = setInterval(() => { void fetchAllOrders() }, 60_000)
    return () => clearInterval(id)
  }, [selectedModule])

  useEffect(() => {
    if (selectedModule === 'sectors' || selectedModule === 'orders') {
      void fetchProdItems()
      void fetchAllProdEtapas()
    }
  }, [selectedModule])

  useEffect(() => {
    if (selectedModule !== 'logs') return
    void fetchLogs()
  }, [selectedModule])

  // ── Production Flow operations ────────────────────────────────────────────

  async function fetchPedidoFluxo() {
    try {
      const { data, error } = await supabase.from('pedido_fluxo').select('*')
      if (error) return // tabela ainda não existe
      const m = new Map<string, PedidoFluxo>()
      for (const row of (data ?? []) as PedidoFluxo[]) m.set(row.pedido_codigo, row)
      setPedidoFluxoMap(m)
    } catch { /* silent */ }
  }

  async function savePedidoFluxo(pedidoCodigo: string, itemId: number) {
    setPedidoFluxoSaving(true)
    try {
      const existing = pedidoFluxoMap.get(pedidoCodigo)
      if (existing) {
        await supabase.from('pedido_fluxo').update({ item_id: itemId }).eq('id', existing.id)
      } else {
        await supabase.from('pedido_fluxo').insert({ pedido_codigo: pedidoCodigo, item_id: itemId })
      }
      await fetchPedidoFluxo()
    } catch { /* silent */ }
    finally { setPedidoFluxoSaving(false) }
  }

  async function removePedidoFluxo(pedidoCodigo: string) {
    const existing = pedidoFluxoMap.get(pedidoCodigo)
    if (!existing) return
    try {
      await supabase.from('pedido_fluxo').delete().eq('id', existing.id)
      await fetchPedidoFluxo()
    } catch { /* silent */ }
  }

  async function fetchProdItems() {
    setProdItemsLoading(true); setProdItemsError(null)
    try {
      const { data, error } = await supabase.from('prod_items').select('*').order('nome')
      if (error) throw new Error(error.message)
      setProdItems((data ?? []) as ProdItem[])
    } catch (err) { setProdItemsError(err instanceof Error ? err.message : 'Erro ao carregar.') }
    finally { setProdItemsLoading(false) }
  }

  async function fetchProdEtapas(itemId: number) {
    setProdEtapasLoading(true)
    try {
      const { data, error } = await supabase.from('prod_etapas').select('*').eq('item_id', itemId).order('ordem')
      if (error) throw new Error(error.message)
      setProdEtapas((data ?? []) as ProdEtapa[])
    } catch { /* silent */ }
    finally { setProdEtapasLoading(false) }
  }

  async function fetchAllProdEtapas() {
    try {
      const { data, error } = await supabase.from('prod_etapas').select('*').order('ordem')
      if (error) return
      setProdEtapas((data ?? []) as ProdEtapa[])
    } catch { /* silent */ }
  }

  async function createProdItem() {
    if (!newItemName.trim()) return
    setNewItemSaving(true); setNewItemError(null)
    try {
      const { data, error } = await supabase.from('prod_items').insert({ nome: newItemName.trim(), descricao: null }).select().single()
      if (error) throw new Error(error.message)
      setNewItemName(''); setShowNewItemForm(false)
      await fetchProdItems()
      setSelectedProdItem(data as ProdItem)
      setProdEtapas([])
    } catch (err) { setNewItemError(err instanceof Error ? err.message : 'Erro ao criar.') }
    finally { setNewItemSaving(false) }
  }

  async function createProdEtapa() {
    if (!selectedProdItem || !newEtapaName.trim()) return
    setNewEtapaSaving(true)
    try {
      const nextOrdem = prodEtapas.length > 0 ? Math.max(...prodEtapas.map(e => e.ordem)) + 1 : 1
      const { error } = await supabase.from('prod_etapas').insert({
        item_id: selectedProdItem.id, nome: newEtapaName.trim(), ordem: nextOrdem,
      })
      if (error) throw new Error(error.message)
      setNewEtapaName('')
      await fetchProdEtapas(selectedProdItem.id)
    } catch { /* silent */ }
    finally { setNewEtapaSaving(false) }
  }

  async function deleteProdEtapa(id: number) {
    if (!selectedProdItem) return
    try {
      await supabase.from('prod_etapas').delete().eq('id', id)
      const remaining = prodEtapas.filter(e => e.id !== id).map((e, i) => ({ ...e, ordem: i + 1 }))
      setProdEtapas(remaining)
      for (const e of remaining) await supabase.from('prod_etapas').update({ ordem: e.ordem }).eq('id', e.id)
    } catch { /* silent */ }
  }

  async function moveEtapa(id: number, direction: 'up' | 'down') {
    const idx = prodEtapas.findIndex(e => e.id === id)
    if (idx === -1) return
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= prodEtapas.length) return
    const next = [...prodEtapas]
    ;[next[idx], next[targetIdx]] = [next[targetIdx], next[idx]]
    const reordered = next.map((e, i) => ({ ...e, ordem: i + 1 }))
    setProdEtapas(reordered)
    for (const e of reordered) await supabase.from('prod_etapas').update({ ordem: e.ordem }).eq('id', e.id)
  }

  async function saveEtapaName(id: number) {
    if (!etapaEditName.trim()) return
    try {
      await supabase.from('prod_etapas').update({ nome: etapaEditName.trim() }).eq('id', id)
      setProdEtapas(prev => prev.map(e => e.id === id ? { ...e, nome: etapaEditName.trim() } : e))
      setEtapaEditId(null)
    } catch { /* silent */ }
  }

  async function deleteProdItem() {
    if (!selectedProdItem) return
    setDeleteItemLoading(true)
    try {
      await supabase.from('prod_items').delete().eq('id', selectedProdItem.id)
      setSelectedProdItem(null); setProdEtapas([]); setShowDeleteItemConfirm(false)
      await fetchProdItems()
    } catch { /* silent */ }
    finally { setDeleteItemLoading(false) }
  }

  async function saveItemName() {
    if (!selectedProdItem || !editItemName.trim()) return
    try {
      await supabase.from('prod_items').update({ nome: editItemName.trim() }).eq('id', selectedProdItem.id)
      const updated = { ...selectedProdItem, nome: editItemName.trim() }
      setSelectedProdItem(updated)
      setProdItems(prev => prev.map(i => i.id === selectedProdItem.id ? updated : i))
      setEditItemMode(false)
    } catch { /* silent */ }
  }

  // ── Computed maps ─────────────────────────────────────────────────────────

  const cliMap = useMemo(() => {
    const m = new Map<string, ClienteRow>()
    for (const c of clientes) { const k = asText(c.CODIGO).trim(); if (k) m.set(k, c) }
    return m
  }, [clientes])

  const fichaMap = useMemo(() => {
    const m = new Map<string, FichaRow>()
    for (const f of fichas) { const k = asText(f.CODIGO).trim(); if (k) m.set(k, f) }
    return m
  }, [fichas])

  // peditemMap: "PEDIDO|ITEM" → REFERENCIA da ficha (via tabela peditens)
  const peditemMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of peditens) {
      const key = `${asText(p.CODIGO).trim()}|${asText(p.ITEM).trim()}`
      const ref = asText(p.REFERENCIA).trim()
      if (key && ref) m.set(key, ref)
    }
    return m
  }, [peditens])

  const pedidoMap = useMemo(() => {
    const m = new Map<string, PedidoRow>()
    for (const p of orders) { const k = asText(p.CODIGO).trim(); if (k) m.set(k, p) }
    return m
  }, [orders])

  const taloesByPedido = useMemo(() => {
    const m = new Map<string, TalaoRow[]>()
    for (const t of taloes) {
      const k = asText(t.PEDIDO).trim(); if (!k) continue
      if (!m.has(k)) m.set(k, []); m.get(k)!.push(t)
    }
    return m
  }, [taloes])

  const talsetorByTalao = useMemo(() => {
    const m = new Map<string, TalsetorRow[]>()
    for (const mv of talsetor) {
      const k = asText(mv.TALAO).trim(); if (!k) continue
      if (!m.has(k)) m.set(k, []); m.get(k)!.push(mv)
    }
    return m
  }, [talsetor])

  const gradeMap = useMemo(() => {
    const m = new Map<string, GradeRow>()
    for (const g of grades) { const k = asText(g.CODIGO).trim(); if (k) m.set(k, g) }
    return m
  }, [grades])

  const pedimateByTalao = useMemo(() => {
    const m = new Map<string, PedimateRow[]>()
    for (const p of pedimate) {
      const k = asText(p.CODIGO).trim(); if (!k) continue
      if (!m.has(k)) m.set(k, []); m.get(k)!.push(p)
    }
    return m
  }, [pedimate])

  const moviprodByTalao = useMemo(() => {
    const m = new Map<string, MoviprodRow>()
    for (const mv of moviprod) { const k = asText(mv.CODIGO).trim(); if (k) m.set(k, mv) }
    return m
  }, [moviprod])

  const sequesetByFicha = useMemo(() => {
    const m = new Map<string, SequesetRow[]>()
    for (const s of sequeset) {
      const k = asText(s.CODIGO).trim(); if (!k) continue
      if (!m.has(k)) m.set(k, []); m.get(k)!.push(s)
    }
    for (const [, steps] of m) steps.sort((a, b) => asText(a.SEQ).localeCompare(asText(b.SEQ)))
    return m
  }, [sequeset])

  const setorNameMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const mv of talsetor) {
      const sc = asText(mv.SETOR).trim(); const sn = asText(mv.NOMESET).trim()
      if (sc && sn && !m.has(sc)) m.set(sc, sn)
    }
    return m
  }, [talsetor])

  // ── Pedidos tree ──────────────────────────────────────────────────────────

  const filteredOrders = useMemo(() => {
    const q = ordersQuery.trim().toLowerCase(); if (!q) return orders
    return orders.filter(pedido => {
      const pc = asText(pedido.CODIGO).trim()
      const cli = cliMap.get(asText(pedido.CLIENTE).trim())
      const cliNome = asText(cli?.FANTASIA || cli?.NOME)
      if ([asText(pedido.CODIGO), asText(pedido.NOME), asText(pedido.CLIENTE), cliNome].some(v => v.toLowerCase().includes(q))) return true
      return (taloesByPedido.get(pc) ?? []).some(t => {
        const ref = asText(t.REFERENCIA).trim()
        const fn = asText(fichaMap.get(ref)?.NOME)
        if ([asText(t.CODIGO), asText(t.REMESSA), asText(t.ITEM), ref, fn].some(v => v.toLowerCase().includes(q))) return true
        return (talsetorByTalao.get(asText(t.CODIGO).trim()) ?? []).some(m =>
          [asText(m.REMESSA), asText(m.SETOR), asText(m.NOMESET)].some(v => v.toLowerCase().includes(q))
        )
      })
    })
  }, [orders, ordersQuery, taloesByPedido, talsetorByTalao, cliMap, fichaMap])

  const pedidoTree = useMemo<PedidoNode[]>(() => filteredOrders.map(pedido => {
    const pc = asText(pedido.CODIGO).trim()
    const taloesNodes: TalaoNode[] = (taloesByPedido.get(pc) ?? []).map(talao => {
      const tc = asText(talao.CODIGO).trim()
      const movs = talsetorByTalao.get(tc) ?? []
      const rm = new Map<string, TalsetorRow[]>()
      const ra = asText(talao.REMESSA).trim()
      for (const m of movs) { const rc = asText(m.REMESSA).trim() || '(sem remessa)'; if (!rm.has(rc)) rm.set(rc, []); rm.get(rc)!.push(m) }
      if (ra && !rm.has(ra)) rm.set(ra, [])
      const remessas: RemessaNode[] = [...rm.entries()].map(([codigo, ms]) => {
        const ord = ms.sort((a, b) => asText(b.DATA).localeCompare(asText(a.DATA), 'pt-BR'))
        const q = ms.reduce((s, r) => s + toNumber(r.QTDE), 0)
        return { codigo, movimentos: ord, qtdeTotal: q || (codigo === ra && ms.length === 0 ? toNumber(talao.TOTAL) : 0) }
      }).sort((a, b) => a.codigo.localeCompare(b.codigo, 'pt-BR'))
      return { talao, remessas }
    })
    return { pedido, taloes: taloesNodes }
  }), [filteredOrders, taloesByPedido, talsetorByTalao])

  // ── Remessas tree ─────────────────────────────────────────────────────────

  const remessaTree = useMemo<RemessaTreeNode[]>(() => {
    const m = new Map<string, RemessaTreeNode>()
    for (const talao of taloes) {
      const rc = asText(talao.REMESSA).trim(); if (!rc) continue
      const tc = asText(talao.CODIGO).trim()
      const pedido = pedidoMap.get(asText(talao.PEDIDO).trim())
      const cli = cliMap.get(asText(pedido?.CLIENTE).trim())
      const clienteNome = asText(cli?.FANTASIA || cli?.NOME) || asText(pedido?.CLIENTE) || '—'
      const fc = asText(talao.REFERENCIA).trim()
      const fichaNome = asText(fichaMap.get(fc)?.NOME) || fc || '—'
      const movs = (talsetorByTalao.get(tc) ?? []).filter(mv => asText(mv.REMESSA).trim() === rc).sort((a, b) => asText(b.DATA).localeCompare(asText(a.DATA), 'pt-BR'))
      const latestSetor = movs.length > 0 ? (asText(movs[0].NOMESET) || asText(movs[0].SETOR) || '—') : '—'
      if (!m.has(rc)) m.set(rc, { remessa: rc, totalQtde: 0, taloes: [] })
      const node = m.get(rc)!; node.totalQtde += toNumber(talao.TOTAL)
      node.taloes.push({ talao, pedido, clienteNome, fichaNome, movimentos: movs, latestSetor })
    }
    let result = [...m.values()].sort((a, b) => a.remessa.localeCompare(b.remessa, 'pt-BR'))
    const q = remessasQuery.trim().toLowerCase()
    if (q) result = result.filter(n => n.remessa.toLowerCase().includes(q) || n.taloes.some(t => [asText(t.talao.CODIGO), asText(t.pedido?.CODIGO), t.clienteNome, t.fichaNome, t.latestSetor].some(v => v.toLowerCase().includes(q))))
    return result
  }, [taloes, pedidoMap, cliMap, fichaMap, talsetorByTalao, remessasQuery])

  // ── Barcode scanner handler (ref updated every render for fresh closures) ──

  onScanRef.current = (code: string) => {
    const now = Date.now()
    const trimmed = code.trim()
    if (trimmed === lastScanRef.current.code && now - lastScanRef.current.time < 3000) return
    lastScanRef.current = { code: trimmed, time: now }
    setScannerError(null)

    const talao = taloes.find(t => asText(t.CODIGO).trim() === trimmed)
    if (!talao) { setScannerError(`"${trimmed}" não encontrado. Tente novamente.`); return }

    const pedidoCod = asText(talao.PEDIDO).trim()
    const pedido = pedidoMap.get(pedidoCod)
    if (!pedido) { setScannerError(`Pedido ${pedidoCod} não encontrado.`); return }

    const taloesNodes: TalaoNode[] = (taloesByPedido.get(pedidoCod) ?? []).map(t => {
      const tc = asText(t.CODIGO).trim()
      const movs = talsetorByTalao.get(tc) ?? []
      const rm = new Map<string, TalsetorRow[]>()
      const ra = asText(t.REMESSA).trim()
      for (const m of movs) { const rc = asText(m.REMESSA).trim() || '(sem remessa)'; if (!rm.has(rc)) rm.set(rc, []); rm.get(rc)!.push(m) }
      if (ra && !rm.has(ra)) rm.set(ra, [])
      const remessas: RemessaNode[] = [...rm.entries()].map(([codigo, ms]) => {
        const ord = [...ms].sort((a, b) => asText(b.DATA).localeCompare(asText(a.DATA), 'pt-BR'))
        const q = ms.reduce((s, r) => s + toNumber(r.QTDE), 0)
        return { codigo, movimentos: ord, qtdeTotal: q || (codigo === ra && ms.length === 0 ? toNumber(t.TOTAL) : 0) }
      }).sort((a, b) => a.codigo.localeCompare(b.codigo, 'pt-BR'))
      return { talao: t, remessas }
    })

    scannerControlsRef.current?.stop()
    scannerControlsRef.current = null
    setScannerOpen(false)
    setScannerError(null)
    setSelectedPedidoDetail({ pedido, taloes: taloesNodes })
    setOrdersSubTab('pedidos')
    setSelectedModule('orders')
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!scannerOpen) return
    setScannerError(null)
    setScannerStatus('loading')
    setLastScannedCode(null)
    setLastScannedFormat(null)
    lastScanRef.current = { code: '', time: 0 }

    let cancelled = false
    let rafId = 0
    let zxingControls: { stop: () => void } | null = null

    const stopAll = () => {
      cancelled = true
      cancelAnimationFrame(rafId)
      zxingControls?.stop()
      if (videoRef.current) {
        const stream = videoRef.current.srcObject as MediaStream | null
        stream?.getTracks().forEach(t => t.stop())
        videoRef.current.srcObject = null
      }
    }
    scannerControlsRef.current = { stop: stopAll }

    const start = async () => {
      if (cancelled || !videoRef.current) return
      const video = videoRef.current

      // ── 1. Start camera ───────────────────────────────────────────────────
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        video.srcObject = stream
        await video.play()

        // Apply zoom + continuous autofocus
        try {
          const track = stream.getVideoTracks()[0]
          const caps = track.getCapabilities?.() as Record<string, unknown> | undefined
          const adv: Record<string, unknown>[] = []
          if (caps?.zoom) {
            const z = caps.zoom as { min: number; max: number }
            adv.push({ zoom: Math.min(z.max, Math.max(z.min, 2.5)) })
          }
          if (caps?.focusMode && (caps.focusMode as string[]).includes('continuous')) {
            adv.push({ focusMode: 'continuous' })
          }
          if (adv.length) await track.applyConstraints({ advanced: adv as MediaTrackConstraintSet[] })
        } catch { /* constraints not supported */ }
      } catch (err) {
        if (!cancelled) {
          setScannerStatus('error')
          setScannerError(err instanceof Error ? err.message : 'Câmera indisponível.')
        }
        return
      }

      if (cancelled) return
      setScannerStatus('scanning')

      // ── 2. Choose decoder ─────────────────────────────────────────────────
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const BD = (globalThis as any).BarcodeDetector

      if (BD) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type NDResult = Array<{ rawValue: string; format: string }>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let nativeDetector: { detect: (src: any) => Promise<NDResult> } | null = null
        try {
          nativeDetector = new BD({ formats: ['itf', 'code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a'] })
        } catch {
          try { nativeDetector = new BD() } catch { /* not available */ }
        }

        if (nativeDetector) {
          const nd = nativeDetector

          const onResult = (results: NDResult) => {
            if (!cancelled && results.length > 0) {
              setLastScannedCode(results[0].rawValue)
              setLastScannedFormat(results[0].format)
              onScanRef.current?.(results[0].rawValue)
            }
          }

          // ── PATH A1: MediaStreamTrackProcessor + VideoFrame ───────────────
          // Camera frames delivered directly from GPU, no DOM/canvas overhead.
          // Same pipeline used by banking apps (Bradesco, Itaú, etc).
          // Available: Chrome 94+ / Android Chrome / Edge.
          const stream = video.srcObject as MediaStream | null
          const track = stream?.getVideoTracks()[0]

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (track && 'MediaStreamTrackProcessor' in (globalThis as any)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const processor = new (globalThis as any).MediaStreamTrackProcessor({ track })
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const frameReader: { read: () => Promise<{ value: any; done: boolean }>; cancel: () => Promise<void> } =
              processor.readable.getReader()

            // Override cleanup to also release the frame reader
            scannerControlsRef.current = { stop: () => { frameReader.cancel().catch(() => {}); stopAll() } }

            void (async () => {
              while (!cancelled) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let frame: any = null
                try {
                  const { value, done } = await frameReader.read()
                  if (done || cancelled) break
                  frame = value
                  const results = await nd.detect(frame)
                  onResult(results)
                } catch { /* NotFoundException / frame error — continue */ }
                finally { frame?.close() }
              }
            })()
            return
          }

          // ── PATH A2: rAF + detect(video) — fallback for Safari / older Chrome ──
          let detecting = false
          const loop = () => {
            if (cancelled) return
            rafId = requestAnimationFrame(loop)
            if (detecting || video.readyState < 2) return
            detecting = true
            nd.detect(video)
              .then(r => { detecting = false; onResult(r) })
              .catch(() => { detecting = false })
          }
          rafId = requestAnimationFrame(loop)
          return
        }
      }

      // PATH B — ZXing fallback (when BarcodeDetector unavailable: iOS < 17.2, Firefox…)
      // Only ITF + CODE_128: the two formats used on talões — ~4x faster than 8 formats.
      try {
        const [zxBrowser, zxLib] = await Promise.all([
          import('@zxing/browser'),
          import('@zxing/library'),
        ])
        if (cancelled) return

        const hints = new Map()
        hints.set(zxLib.DecodeHintType.POSSIBLE_FORMATS, [
          zxLib.BarcodeFormat.ITF,
          zxLib.BarcodeFormat.CODE_128,
        ])
        hints.set(zxLib.DecodeHintType.TRY_HARDER, true)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const reader = new (zxBrowser as any).BrowserMultiFormatReader(hints, {
          delayBetweenScanAttempts: 0,   // scan as fast as possible
          delayBetweenScanSuccess: 500,
        })

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const controls = await reader.decodeFromVideoElement(video, (result: any) => {
          if (result && !cancelled) {
            const code: string = result.getText()
            setLastScannedCode(code)
            setLastScannedFormat(String(result.getBarcodeFormat()))
            onScanRef.current?.(code)
          }
        })

        if (cancelled) { controls.stop(); return }
        zxingControls = controls
      } catch (err) {
        if (!cancelled) {
          setScannerStatus('error')
          setScannerError(err instanceof Error ? err.message : 'Decodificador indisponível.')
        }
      }
    }

    void start()

    // iOS Safari PWA: video stream freezes when app goes to background.
    // Re-play the video when the page becomes visible again.
    const onVisible = () => {
      if (!cancelled && videoRef.current?.paused) {
        videoRef.current.play().catch(() => {/* ignore */})
      }
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      stopAll()
      scannerControlsRef.current = null
    }
  }, [scannerOpen])

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
    {/* ── Mobile top navbar ── */}
    <nav className="sm:hidden fixed top-0 left-0 right-0 z-50 bg-[var(--th-card)]/90 backdrop-blur-xl border-b border-[var(--th-border)]">
      <div className="px-4 h-[54px] flex items-center justify-between">
        <div className="flex items-center gap-1 text-lg font-bold leading-tight">
          <span className="text-[var(--th-txt-1)]">Simple&amp;Eco</span>{' '}
          <span className="bg-gradient-to-r from-[#FF8C00] to-[#D81B60] bg-clip-text text-transparent">Admin</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => navigate('/')} className="p-2 rounded-lg text-[var(--th-txt-3)] hover:bg-[var(--th-hover)] transition-colors" aria-label="Produção">
            <Home className="w-5 h-5" />
          </button>
          <button onClick={() => setMobileMenuOpen(o => !o)} className="p-2 text-[var(--th-txt-1)]" aria-label="Menu">
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>
      {mobileMenuOpen && (
        <div className="border-t border-[var(--th-border)] px-4 pb-4 bg-[var(--th-card)] overflow-y-auto max-h-[calc(100vh-54px)]">
          {sidebarSections.map(section => (
            <div key={section.label}>
              <p className="px-1 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-widest text-[var(--th-txt-4)]">{section.label}</p>
              <div className="space-y-0.5">
                {section.items.map(m => (
                  <button key={m.id} onClick={() => { setSelectedModule(m.id); setMobileMenuOpen(false) }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm font-medium transition-all ${
                      selectedModule === m.id ? 'bg-[#FF8C00] text-white shadow-sm' : 'text-[var(--th-txt-3)] hover:bg-[var(--th-hover)] hover:text-[var(--th-txt-1)]'
                    }`}>
                    <m.icon strokeWidth={1.5} className="w-4 h-4 shrink-0" />
                    <span>{m.title}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="border-t border-[var(--th-border)] pt-3 mt-4 space-y-0.5">
            <button onClick={() => { toggleTheme(); setMobileMenuOpen(false) }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--th-txt-3)] hover:bg-[var(--th-hover)] hover:text-[var(--th-txt-1)] transition-all">
              {isDark ? <Sun strokeWidth={1.5} className="w-4 h-4 shrink-0" /> : <Moon strokeWidth={1.5} className="w-4 h-4 shrink-0" />}
              <span>{isDark ? 'Modo Claro' : 'Modo Escuro'}</span>
            </button>
            <button onClick={() => { void handleLogout(); setMobileMenuOpen(false) }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--th-txt-3)] hover:bg-red-500/10 hover:text-red-400 transition-all">
              <LogOut strokeWidth={1.5} className="w-4 h-4 shrink-0" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      )}
    </nav>

    <div className="flex h-screen overflow-hidden bg-[var(--th-page)] text-[var(--th-txt-1)] pt-[54px] sm:pt-0">

      {/* ── Sidebar ── */}
      <aside className="hidden sm:flex w-[260px] shrink-0 flex-col bg-[var(--th-card)]">
        {/* Logo */}
        <div className="px-4 py-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <img src="/ICONSE.png" alt="SimpleEco" className="w-8 h-8 rounded-lg shrink-0 object-cover" />
            <div>
              <p className="text-[13px] font-bold text-[var(--th-txt-1)] leading-none">Simple&amp;Eco</p>
              <p className="text-[11px] text-[var(--th-txt-4)] leading-none mt-0.5">Painel Admin</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 pb-3">
          {sidebarSections.map(section => (
            <div key={section.label}>
              <SidebarSection label={section.label} />
              <div className="space-y-0.5">
                {section.items.map(m => (
                  <SidebarItem key={m.id} title={m.title} icon={m.icon} active={selectedModule === m.id} onClick={() => setSelectedModule(m.id)} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 shrink-0 space-y-0.5">
          <button onClick={toggleTheme} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--th-txt-3)] hover:bg-[var(--th-hover)] hover:text-[var(--th-txt-1)] transition-all">
            {isDark ? <Sun strokeWidth={1.5} className="w-4 h-4 shrink-0" /> : <Moon strokeWidth={1.5} className="w-4 h-4 shrink-0" />}
            <span>{isDark ? 'Modo Claro' : 'Modo Escuro'}</span>
          </button>
          <button onClick={() => { void handleLogout() }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--th-txt-3)] hover:bg-red-500/10 hover:text-red-400 transition-all">
            <LogOut strokeWidth={1.5} className="w-4 h-4 shrink-0" />
            <span>Sair</span>
          </button>
        </div>

        {/* Version badge */}
        <div className="px-3 pb-4 shrink-0 flex justify-center">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#2a2a2a] text-[#888] text-[11px] leading-none">
            <span>version.</span>
            <span className="font-mono">{__COMMIT__}</span>
          </div>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── ORDERS ── */}
        {selectedModule === 'orders' && (
          <>
            {/* List panel */}
            <div className={`shrink-0 border-r border-[var(--th-border)] flex-col bg-[var(--th-card)] w-full sm:w-[380px] ${(selectedPedidoDetail || selectedRemessaDetail) ? 'hidden sm:flex' : 'flex'}`}>
              <div className="px-4 py-4 border-b border-[var(--th-border)] shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setOrdersSubTabOpen(o => !o)}
                        className={`flex items-center gap-1.5 pl-2.5 pr-2 py-1 rounded-lg border text-sm font-semibold transition-colors ${
                          ordersSubTabOpen
                            ? 'border-orange-500/50 bg-[var(--th-card)] ring-2 ring-orange-500/20 text-[var(--th-txt-1)]'
                            : 'border-[var(--th-border)] bg-[var(--th-card)] text-[var(--th-txt-1)] hover:border-orange-500/30'
                        }`}
                      >
                        {ordersSubTab === 'pedidos' ? 'Pedidos' : 'Remessas'}
                        <ChevronDown strokeWidth={2} className={`w-3 h-3 text-[var(--th-txt-4)] transition-transform ${ordersSubTabOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {ordersSubTabOpen && (
                        <div className="absolute z-50 top-full mt-1 left-0 min-w-[120px] rounded-lg border border-[var(--th-border)] bg-[var(--th-card)] shadow-lg overflow-hidden">
                          {(['pedidos', 'remessas'] as const).map(tab => (
                            <button
                              key={tab}
                              type="button"
                              onClick={() => { setOrdersSubTab(tab); setOrdersSubTabOpen(false) }}
                              className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-[var(--th-hover)] ${
                                ordersSubTab === tab ? 'text-orange-400 bg-orange-500/8 font-semibold' : 'text-[var(--th-txt-1)]'
                              }`}
                            >
                              {tab === 'pedidos' ? 'Pedidos' : 'Remessas'}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-xs bg-[var(--th-subtle)] px-2 py-0.5 rounded-full text-[var(--th-txt-4)]">
                      {ordersSubTab === 'pedidos' ? filteredOrders.length : remessaTree.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button type="button" onClick={() => setScannerOpen(true)} title="Escanear código de barras"
                      className="p-1.5 rounded text-[var(--th-txt-4)] hover:bg-[var(--th-hover)] transition-colors">
                      <ScanLine strokeWidth={1.5} className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => { void fetchAllOrders() }} title="Atualizar"
                      className="p-1.5 rounded text-[var(--th-txt-4)] hover:bg-[var(--th-hover)] transition-colors">
                      <RefreshCw strokeWidth={1.5} className={`w-3.5 h-3.5 ${ordersLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <Search strokeWidth={1.5} className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--th-txt-4)]" />
                  <input
                    value={ordersSubTab === 'pedidos' ? ordersQuery : remessasQuery}
                    onChange={e => ordersSubTab === 'pedidos' ? setOrdersQuery(e.target.value) : setRemessasQuery(e.target.value)}
                    placeholder={ordersSubTab === 'pedidos' ? 'Buscar pedido...' : 'Buscar remessa...'}
                    className="w-full rounded-lg border border-[var(--th-border)] bg-transparent pl-8 pr-3 py-1.5 text-xs text-[var(--th-txt-1)] placeholder:text-[var(--th-txt-4)] focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                  />
                </div>
                {ordersSubTab === 'pedidos' && (
                  <div className="flex gap-1 flex-wrap mt-2">
                    {([
                      { key: 'todos',      label: 'Todos' },
                      { key: 'em_producao',label: 'Em produção' },
                      { key: 'atrasado',   label: 'Atrasado' },
                      { key: 'finalizado', label: 'Finalizado' },
                    ] as const).map(({ key, label }) => {
                      const active = pedidoStatusFilter === key
                      return (
                        <button key={key} type="button" onClick={() => setPedidoStatusFilter(key)}
                          className={`text-[11px] px-2.5 py-1 rounded-full border font-medium transition-all ${
                            active
                              ? key === 'atrasado'
                                ? 'bg-red-500/15 text-red-400 border-red-500/30'
                                : key === 'finalizado'
                                  ? 'bg-green-500/15 text-green-400 border-green-500/30'
                                  : 'bg-orange-500/15 text-orange-400 border-orange-500/30'
                              : 'bg-[var(--th-subtle)] text-[var(--th-txt-4)] border-[var(--th-border)] hover:text-[var(--th-txt-1)]'
                          }`}>
                          {label}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {ordersError && <div className="px-3 py-2 text-xs text-red-400 bg-red-500/10 rounded-lg border border-red-500/20">{ordersError}</div>}
                {ordersLoading && orders.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-[var(--th-txt-3)]">Carregando...</div>
                )}

                {/* Pedidos list */}
                {ordersSubTab === 'pedidos' && !ordersLoading && pedidoTree.length === 0 && (
                  <div className="px-4 py-16 text-center text-sm text-[var(--th-txt-3)]">Nenhum pedido.</div>
                )}
                {ordersSubTab === 'pedidos' && (() => {
                  const calcFinalizado = (pNode: PedidoNode) => {
                    const active = pNode.taloes.filter(t => !isTruthy(t.talao.CANCELADO))
                    return active.length > 0 && active.every(tNode => {
                      const tc = asText(tNode.talao.CODIGO).trim()
                      return isTruthy(tNode.talao.FATURADO) || (talsetorByTalao.get(tc) ?? []).some(mv => /expedi/i.test(asText(mv.NOMESET) + asText(mv.SETOR)))
                    })
                  }
                  const calcAtrasado = (pNode: PedidoNode, finalizado: boolean) => {
                    if (finalizado) return false
                    const raw = asText(pNode.pedido.PREVISAO).trim()
                    if (!raw) return false
                    const d = new Date(raw); if (isNaN(d.getTime())) return false
                    const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
                    return d < hoje
                  }
                  const todosEmProd = pedidoTree.filter(p => !calcFinalizado(p))
                  const todosFinalizados = pedidoTree.filter(p => calcFinalizado(p))
                  const atrasados = todosEmProd.filter(p => calcAtrasado(p, false))
                  const emProdSemAtraso = todosEmProd.filter(p => !calcAtrasado(p, false))
                  const emProd = pedidoStatusFilter === 'todos'       ? todosEmProd
                               : pedidoStatusFilter === 'em_producao' ? emProdSemAtraso
                               : pedidoStatusFilter === 'atrasado'    ? atrasados
                               : []
                  const finalizados = (pedidoStatusFilter === 'todos' || pedidoStatusFilter === 'finalizado') ? todosFinalizados : []
                  const renderCard = (pNode: PedidoNode) => {
                    const pc = asText(pNode.pedido.CODIGO).trim() || 'SEM-CODIGO'
                    const cli = cliMap.get(asText(pNode.pedido.CLIENTE).trim())
                    const cliNome = asText(cli?.FANTASIA || cli?.NOME) || asText(pNode.pedido.CLIENTE) || '—'
                    const saldo = toNumber(pNode.pedido.SALDO)
                    const isSelected = selectedPedidoDetail?.pedido.CODIGO === pNode.pedido.CODIGO
                    const pedidoFinalizado = calcFinalizado(pNode)
                    const atrasado = calcAtrasado(pNode, pedidoFinalizado)
                    return (
                      <button
                        key={pc}
                        type="button"
                        onClick={() => { setSelectedPedidoDetail(pNode); setTalaoSearch(''); setTalaoStatusFilter('todos') }}
                        className={isSelected
                          ? `w-full text-left rounded-xl border px-4 py-3 transition-all ${atrasado ? 'border-red-500/40 bg-red-500/8' : 'border-orange-500/40 bg-orange-500/8'}`
                          : `w-full text-left rounded-xl border border-[var(--th-border)] bg-[var(--th-card)] px-4 py-3 transition-all ${atrasado ? 'hover:border-red-500/30 hover:bg-red-500/5' : 'hover:border-orange-500/30 hover:bg-orange-500/5'}`}
                      >
                        <div className="flex items-start gap-3 min-w-0 w-full">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="text-[11px] font-mono font-semibold text-[var(--th-txt-2)]">{pc}</span>
                              <span className="text-[var(--th-txt-4)] select-none">·</span>
                              <span className={`text-[11px] font-medium ${atrasado ? 'text-red-400' : 'text-[var(--th-txt-4)]'}`}>{fmtDate(pNode.pedido.PREVISAO)}</span>
                            </div>
                            <p className="text-[13px] font-medium text-[var(--th-txt-1)] truncate mb-0.5">{cliNome}</p>
                            {asText(pNode.pedido.PEDCLIENTE) && (
                              <p className="text-[11px] text-[var(--th-txt-4)] mb-1.5">O.C. <span className="font-mono text-[var(--th-txt-3)]">{asText(pNode.pedido.PEDCLIENTE)}</span></p>
                            )}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--th-subtle)] border border-[var(--th-border)] text-[11px] font-medium text-[var(--th-txt-4)]">
                                {pNode.taloes.length} Talões
                              </span>
                              {saldo > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--th-subtle)] border border-[var(--th-border)] text-[11px] font-medium text-[var(--th-txt-4)]">Unidades {fmtNumber(saldo)}</span>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0 flex flex-col items-end gap-1.5 pt-0.5">
                            {pedidoFinalizado
                              ? <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20 font-medium">Finalizado</span>
                              : atrasado
                                ? <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20 font-medium">Atrasado</span>
                                : <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/20 font-medium">Em produção</span>
                            }
                          </div>
                        </div>
                      </button>
                    )
                  }
                  return (
                    <>
                      {emProd.length > 0 && (
                        <>
                          {pedidoStatusFilter === 'todos' && (
                            <div className="px-2 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-widest text-[var(--th-txt-4)]">
                              Em Produção · {todosEmProd.length - atrasados.length}{atrasados.length > 0 ? ` · Atrasados ${atrasados.length}` : ''}
                            </div>
                          )}
                          {pedidoStatusFilter === 'em_producao' && (
                            <div className="px-2 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-widest text-[var(--th-txt-4)]">Em Produção · {emProd.length}</div>
                          )}
                          {pedidoStatusFilter === 'atrasado' && (
                            <div className="px-2 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-widest text-red-400">Atrasados · {emProd.length}</div>
                          )}
                          {emProd.map(renderCard)}
                        </>
                      )}
                      {finalizados.length > 0 && (
                        <>
                          <div className="px-2 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-widest text-[var(--th-txt-4)]">Finalizados · {finalizados.length}</div>
                          {finalizados.map(renderCard)}
                        </>
                      )}
                      {emProd.length === 0 && finalizados.length === 0 && (
                        <div className="px-4 py-16 text-center text-sm text-[var(--th-txt-3)]">Nenhum pedido.</div>
                      )}
                    </>
                  )
                })()}

                {/* Remessas list */}
                {ordersSubTab === 'remessas' && !ordersLoading && remessaTree.length === 0 && (
                  <div className="px-4 py-16 text-center text-sm text-[var(--th-txt-3)]">Nenhuma remessa.</div>
                )}
                {ordersSubTab === 'remessas' && remessaTree.map(rNode => {
                  const pedUnicos = [...new Set(rNode.taloes.map(t => asText(t.pedido?.CODIGO).trim()).filter(Boolean))]
                  const isSelected = selectedRemessaDetail?.remessa === rNode.remessa
                  return (
                    <button
                      key={rNode.remessa}
                      type="button"
                      onClick={() => setSelectedRemessaDetail(rNode)}
                      className={isSelected ? 'w-full text-left rounded-xl border border-orange-500/40 bg-orange-500/8 px-4 py-3 transition-all' : 'w-full text-left rounded-xl border border-[var(--th-border)] bg-[var(--th-card)] px-4 py-3 transition-all hover:border-orange-500/30 hover:bg-orange-500/5'}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center shrink-0 mt-0.5">
                          <Box strokeWidth={1.5} className="w-3.5 h-3.5 text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <span className="text-[13px] font-mono font-medium text-[var(--th-txt-1)] truncate">{rNode.remessa}</span>
                            <span className="text-[11px] text-[var(--th-txt-4)] shrink-0">{fmtNumber(rNode.totalQtde)} un</span>
                          </div>
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[11px] px-1 py-px rounded bg-[var(--th-subtle)] text-[var(--th-txt-4)] border border-[var(--th-border)]">{rNode.taloes.length} talões</span>
                          </div>
                          <p className="text-[11px] text-[var(--th-txt-4)] truncate">
                            Pedido(s): {pedUnicos.slice(0, 3).join(', ')}{pedUnicos.length > 3 ? ` +${pedUnicos.length - 3}` : ''}
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Detail panel */}
            <div className={`overflow-y-auto sm:flex-1 sm:p-5 ${(selectedPedidoDetail || selectedRemessaDetail) ? 'fixed inset-0 top-[54px] z-40 bg-[var(--th-page)] p-4 sm:static sm:inset-auto sm:z-auto sm:bg-transparent' : 'hidden sm:block'}`}>

              {/* Pedido detail — empty state */}
              {ordersSubTab === 'pedidos' && !selectedPedidoDetail && (
                <div className="flex flex-col items-center justify-center py-16 text-[var(--th-txt-4)]">
                  <Box strokeWidth={1} className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-sm">Selecione um pedido para ver detalhes</p>
                </div>
              )}

              {/* Pedido detail */}
              {ordersSubTab === 'pedidos' && selectedPedidoDetail && (() => {
                const pNode = selectedPedidoDetail
                const pc = asText(pNode.pedido.CODIGO).trim() || 'SEM-CODIGO'
                const cli = cliMap.get(asText(pNode.pedido.CLIENTE).trim())
                const cliNome = asText(cli?.FANTASIA || cli?.NOME) || asText(pNode.pedido.CLIENTE) || '—'
                const saldo = toNumber(pNode.pedido.SALDO)

                // Produtos distintos (referência + nome da ficha) dos talões deste pedido
                const produtosDistintos = (() => {
                  const seen = new Map<string, string>()
                  for (const tNode of pNode.taloes) {
                    const ref = asText(tNode.talao.REFERENCIA).trim()
                    if (!ref || seen.has(ref)) continue
                    const nome = asText(fichaMap.get(ref)?.NOME).trim() || ref
                    seen.set(ref, nome)
                  }
                  return [...seen.entries()]
                })()

                // Grade agregada do pedido: soma de todos os talões por slot
                const gradeAgregada = (() => {
                  const agg = new Array<number>(15).fill(0)
                  for (const tNode of pNode.taloes) {
                    for (const { slot, qty } of parseNumeros(tNode.talao.NUMEROS)) {
                      agg[slot - 32] += qty
                    }
                  }
                  return agg.map((qty, i) => ({ slot: 32 + i, qty })).filter(x => x.qty > 0)
                })()

                // Fluxo de produção vinculado a este pedido
                const fluxoVinculado = pedidoFluxoMap.get(pc)
                const fluxoItem = fluxoVinculado ? prodItems.find(i => i.id === fluxoVinculado.item_id) : null
                const fluxoEtapas = fluxoVinculado
                  ? prodItems.length > 0
                    ? (() => {
                        // Busca etapas do item em memória (já carregadas se o módulo sectors foi visitado)
                        // senão fica vazio até o usuário visitar sectors
                        return prodEtapas.filter(e => e.item_id === fluxoVinculado.item_id).sort((a, b) => a.ordem - b.ordem)
                      })()
                    : []
                  : []

                // Todos os movimentos de talsetor deste pedido
                const allMovs = pNode.taloes.flatMap(tNode =>
                  talsetorByTalao.get(asText(tNode.talao.CODIGO).trim()) ?? []
                )
                const passouExpedicaoPedido = allMovs.some(mv =>
                  /expedi/i.test(asText(mv.NOMESET) + asText(mv.SETOR))
                )
                const pedidoAtrasado = (() => {
                  if (passouExpedicaoPedido || saldo === 0) return false
                  const raw = asText(pNode.pedido.PREVISAO).trim()
                  if (!raw) return false
                  const d = new Date(raw); if (isNaN(d.getTime())) return false
                  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
                  return d < hoje
                })()
                // Etapas concluídas: qualquer talão passou por um setor com nome similar à etapa
                function etapaConcluida(etapaNome: string): boolean {
                  const n = etapaNome.toLowerCase()
                  return allMovs.some(mv =>
                    asText(mv.NOMESET).toLowerCase().includes(n) || asText(mv.SETOR).toLowerCase().includes(n)
                  )
                }

                const taloesFiltrados = pNode.taloes.filter(tNode => {
                  const tc = asText(tNode.talao.CODIGO).trim()
                  const fcD = asText(tNode.talao.REFERENCIA).trim()
                  const fc = fcD || peditemMap.get(`${asText(tNode.talao.PEDIDO).trim()}|${asText(tNode.talao.ITEM).trim()}`) || ''
                  const fn = asText(fichaMap.get(fc)?.NOME) || ''
                  const q = talaoSearch.toLowerCase().trim()
                  if (q && !tc.toLowerCase().includes(q) && !fc.toLowerCase().includes(q) && !fn.toLowerCase().includes(q)) return false
                  if (talaoStatusFilter !== 'todos') {
                    const canc = isTruthy(tNode.talao.CANCELADO)
                    const fat = isTruthy(tNode.talao.FATURADO)
                    const passou = (talsetorByTalao.get(tc) ?? []).some(mv => /expedi/i.test(asText(mv.NOMESET) + asText(mv.SETOR)))
                    const fin = !canc && (fat || passou)
                    if (talaoStatusFilter === 'cancelado' && !canc) return false
                    if (talaoStatusFilter === 'finalizado' && !fin) return false
                    if (talaoStatusFilter === 'em_producao' && (canc || fin)) return false
                  }
                  return true
                })

                return (
                  <div className="space-y-4">
                    <button className="sm:hidden flex items-center gap-1 text-sm font-medium text-[var(--th-txt-3)] hover:text-[var(--th-txt-1)] transition-colors -ml-1 mb-1" onClick={() => setSelectedPedidoDetail(null)}>
                      <ChevronLeft className="w-4 h-4" />Voltar
                    </button>
                    {/* ── Card unificado: pedido + fluxo + grade ── */}
                    <div className="rounded-xl border border-[var(--th-border)] bg-[var(--th-card)] overflow-hidden">

                      {/* Cabeçalho do pedido */}
                      <div className="px-4 pt-4 pb-3">
                        {/* Linha topo: info + X (desktop) */}
                        <div className="flex items-start gap-3">
                          <div className="min-w-0 flex-1">
                            {/* Nº Pedido + data */}
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="text-sm font-mono font-semibold text-[var(--th-txt-2)]">{pc}</span>
                              <span className="text-[var(--th-txt-4)] select-none">·</span>
                              <span className="text-sm text-[var(--th-txt-4)]">{fmtDate(pNode.pedido.PREVISAO)}</span>
                            </div>
                            {/* Nome do cliente */}
                            <button
                              type="button"
                              onClick={() => {
                                const cliRow = cliMap.get(asText(pNode.pedido.CLIENTE).trim())
                                if (cliRow) { setSelectedCliente(cliRow); setSelectedModule('clients') }
                              }}
                              className="text-base font-bold text-[var(--th-txt-1)] hover:text-orange-400 hover:underline transition-colors text-left leading-snug mb-0.5 block"
                            >{cliNome}</button>
                            {/* O.C. */}
                            {asText(pNode.pedido.PEDCLIENTE) && (
                              <p className="text-[11px] text-[var(--th-txt-4)] mb-1.5">O.C. <span className="font-mono text-[var(--th-txt-2)]">{asText(pNode.pedido.PEDCLIENTE)}</span></p>
                            )}
                            {/* Talões + Status badges */}
                            <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--th-subtle)] border border-[var(--th-border)] text-[11px] font-medium text-[var(--th-txt-4)]">
                                {pNode.taloes.length} Talões
                              </span>
                              {saldo === 0
                                ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border bg-green-500/15 text-green-400 border-green-500/30">Finalizado</span>
                                : pedidoAtrasado
                                  ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border bg-red-500/15 text-red-400 border-red-500/20">Atrasado</span>
                                  : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--th-subtle)] border border-[var(--th-border)] text-[11px] font-medium text-[var(--th-txt-4)]">Unidades {fmtNumber(saldo)}</span>
                              }
                            </div>
                            {/* Produtos */}
                            {produtosDistintos.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {produtosDistintos.map(([ref, nome]) => (
                                  <span key={ref} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] border bg-[var(--th-subtle)] border-[var(--th-border)]">
                                    <span className="font-mono text-[var(--th-txt-4)]">{ref}</span>
                                    {nome !== ref && <span className="text-[var(--th-txt-2)]">{nome}</span>}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          {/* X — só desktop */}
                          <button type="button" onClick={() => setSelectedPedidoDetail(null)} className="hidden sm:flex p-1.5 rounded hover:bg-[var(--th-hover)] text-[var(--th-txt-4)] shrink-0">
                            <X strokeWidth={1.5} className="w-4 h-4" />
                          </button>
                        </div>

                      </div>

                      {/* Fluxo de Produção */}
                      <div className="border-t border-[var(--th-border)]">
                        <div className="px-4 py-2 bg-[var(--th-subtle)] flex items-center justify-between">
                          <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--th-txt-4)]">Fluxo de Produção</p>
                          <div className="flex items-center gap-2">
                            {fluxoVinculado && fluxoItem && (
                              <span className="text-[11px] font-medium text-[var(--th-txt-2)]">{fluxoItem.nome}</span>
                            )}
                            {fluxoVinculado && !passouExpedicaoPedido && (
                              <button type="button" onClick={() => void removePedidoFluxo(pc)}
                                className="text-[11px] text-[var(--th-txt-4)] hover:text-red-400 transition-colors">
                                Remover
                              </button>
                            )}
                            {passouExpedicaoPedido && fluxoVinculado && (
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30 font-medium">Finalizado</span>
                            )}
                          </div>
                        </div>

                        {!passouExpedicaoPedido && (() => {
                          const effectiveId = pedidoFluxoSelect !== '' ? pedidoFluxoSelect : (fluxoVinculado?.item_id ?? '')
                          const displayNome = prodItems.find(i => i.id === effectiveId)?.nome
                          return (
                            <div className="px-4 py-3 border-b border-[var(--th-border)] flex items-center gap-2">
                              <div className="relative flex-1 sm:flex-none sm:w-40">
                                <button
                                  type="button"
                                  onClick={() => setFluxoDropdownOpen(o => !o)}
                                  className={`w-full flex items-center justify-between gap-2 pl-3 pr-2 py-1.5 rounded-lg border text-xs transition-colors ${
                                    fluxoDropdownOpen
                                      ? 'border-orange-500/50 bg-[var(--th-card)] ring-2 ring-orange-500/20 text-[var(--th-txt-1)]'
                                      : 'border-[var(--th-border)] bg-[var(--th-subtle)] text-[var(--th-txt-4)] hover:border-orange-500/30 hover:text-[var(--th-txt-1)]'
                                  }`}
                                >
                                  <span className="truncate">{displayNome ?? 'Selecionar fluxo…'}</span>
                                  <ChevronDown strokeWidth={2} className={`w-3 h-3 transition-transform shrink-0 ${fluxoDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {fluxoDropdownOpen && (
                                  <div className="absolute z-50 top-full mt-1 left-0 right-0 rounded-lg border border-[var(--th-border)] bg-[var(--th-card)] shadow-lg overflow-hidden">
                                    {prodItems.map(item => (
                                      <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => { setPedidoFluxoSelect(item.id); setFluxoDropdownOpen(false) }}
                                        className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-[var(--th-hover)] ${
                                          effectiveId === item.id ? 'text-orange-400 bg-orange-500/8 font-semibold' : 'text-[var(--th-txt-1)]'
                                        }`}
                                      >
                                        {item.nome}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <button
                                type="button"
                                disabled={effectiveId === '' || pedidoFluxoSaving}
                                onClick={() => { if (effectiveId !== '') void savePedidoFluxo(pc, effectiveId as number) }}
                                className="px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-medium disabled:opacity-40 hover:bg-orange-600 transition-colors shrink-0"
                              >
                                {pedidoFluxoSaving ? '…' : fluxoVinculado ? 'Alterar' : 'Atribuir'}
                              </button>
                            </div>
                          )
                        })()}

                        {fluxoVinculado && fluxoEtapas.length > 0 && (
                          <div className="px-4 py-3 flex flex-wrap gap-1.5 items-center">
                            {fluxoEtapas.map((etapa, idx) => {
                              const done = passouExpedicaoPedido || etapaConcluida(etapa.nome)
                              const isLast = idx === fluxoEtapas.length - 1
                              return (
                                <React.Fragment key={etapa.id}>
                                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border transition-all ${
                                    done
                                      ? 'bg-green-500/10 border-green-500/25 text-green-400'
                                      : 'bg-[var(--th-subtle)] border-[var(--th-border)] text-[var(--th-txt-4)]'
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${done ? 'bg-green-400' : 'bg-[var(--th-border)]'}`} />
                                    {etapa.nome}
                                  </span>
                                  {!isLast && <span className="text-[var(--th-txt-4)] text-[11px]">›</span>}
                                </React.Fragment>
                              )
                            })}
                          </div>
                        )}
                      </div>

                      {/* Grade do Pedido */}
                      {gradeAgregada.length > 0 && (
                        <div className="border-t border-[var(--th-border)]">
                          <div className="px-4 py-2 bg-[var(--th-subtle)] flex items-center justify-between">
                            <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--th-txt-4)]">Grade do Pedido</p>
                            <p className="text-[11px] text-[var(--th-txt-4)]">
                              Total: <span className="font-mono font-bold text-orange-400">{gradeAgregada.reduce((s, x) => s + x.qty, 0).toLocaleString('pt-BR')}</span> pares
                            </p>
                          </div>
                          <div className="px-4 py-3 flex flex-wrap gap-1.5">
                            {gradeAgregada.map(({ slot, qty }) => (
                              <div key={slot} className="flex flex-col items-center rounded-lg border border-[var(--th-border)] bg-[var(--th-subtle)] overflow-hidden" style={{ minWidth: 44 }}>
                                <span className="px-2 py-1.5 text-[11px] font-bold font-mono text-[var(--th-txt-2)] text-center w-full leading-none">{slot}</span>
                                <div className="w-full border-t border-[var(--th-border)]" />
                                <span className="px-2 py-1.5 text-sm font-bold font-mono text-orange-400 text-center w-full leading-none">{qty}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Talões — search + filter */}
                    {pNode.taloes.length > 0 && (
                      <div className="flex flex-col gap-2 mt-8 sm:mt-20">
                        <div className="relative">
                          <Search strokeWidth={1.5} className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--th-txt-4)] pointer-events-none" />
                          <input
                            type="text"
                            placeholder="Buscar talão, referência ou produto…"
                            value={talaoSearch}
                            onChange={e => setTalaoSearch(e.target.value)}
                            className="w-full rounded-lg border border-[var(--th-border)] bg-transparent pl-8 pr-3 py-1.5 text-xs text-[var(--th-txt-1)] placeholder:text-[var(--th-txt-4)] focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                          />
                          {talaoSearch && (
                            <button type="button" onClick={() => setTalaoSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--th-txt-4)] hover:text-[var(--th-txt-1)]">
                              <X strokeWidth={1.5} className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                          {(['todos', 'em_producao', 'finalizado', 'cancelado'] as const).map(f => {
                            const labels = { todos: 'Todos', em_producao: 'Em produção', finalizado: 'Finalizado', cancelado: 'Cancelado' }
                            const active = talaoStatusFilter === f
                            return (
                              <button key={f} type="button" onClick={() => setTalaoStatusFilter(f)}
                                className={`text-[11px] px-2.5 py-1 rounded-full border font-medium transition-all ${active ? 'bg-orange-500/15 text-orange-400 border-orange-500/30' : 'bg-[var(--th-subtle)] text-[var(--th-txt-4)] border-[var(--th-border)] hover:text-[var(--th-txt-1)]'}`}>
                                {labels[f]}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Talões */}
                    {pNode.taloes.length === 0 && (
                      <p className="text-sm text-center text-[var(--th-txt-3)] py-8">Esse pedido ainda não possui talões.</p>
                    )}
                    {taloesFiltrados.length === 0 && pNode.taloes.length > 0 && (
                      <p className="text-sm text-center text-[var(--th-txt-3)] py-6">Nenhum talão encontrado para os filtros aplicados.</p>
                    )}
                    <div className="flex flex-col gap-3 mt-8">
                      {taloesFiltrados.map(tNode => {
                        const tc = asText(tNode.talao.CODIGO).trim() || '—'
                        // Resolve referência: direto do talão → fallback via peditens (PEDIDO+ITEM)
                        const fcDireto = asText(tNode.talao.REFERENCIA).trim()
                        const pedidoCod = asText(tNode.talao.PEDIDO).trim()
                        const itemCod = asText(tNode.talao.ITEM).trim()
                        const fc = fcDireto || peditemMap.get(`${pedidoCod}|${itemCod}`) || ''
                        const ficha = fichaMap.get(fc)
                        const fn = asText(ficha?.NOME).trim()
                        const fMatriz = asText(ficha?.MATRIZ).trim()
                        const fNavalha = asText(ficha?.NAVALHA).trim()
                        const fCor = asText(ficha?.NOMECOR).trim()
                        const fObs = asText(ficha?.OBS).trim()
                        const fConstruc = asText(ficha?.CONSTRUC).trim()
                        const fSalto = asText(ficha?.SALTO).trim()
                        const fPalmilha = asText(ficha?.PALMILHA).trim()
                        const fForma = asText(ficha?.FORMA).trim()
                        const fLinha = asText(ficha?.LINHA).trim()
                        const fProdTxt = asText(ficha?.PROD_TXT).trim()
                        const gradeCode = asText(tNode.talao.GRADE).trim()
                        const gradeName = asText(gradeMap.get(gradeCode)?.NOME).trim()
                        const bomItems = pedimateByTalao.get(tc) ?? []
                        const bomExpanded = expandedBom.has(tc)
                        const canc = isTruthy(tNode.talao.CANCELADO)
                        const fat = isTruthy(tNode.talao.FATURADO)
                        const passouExpedicao = (talsetorByTalao.get(tc) ?? []).some(mv =>
                          /expedi/i.test(asText(mv.NOMESET) + asText(mv.SETOR))
                        )
                        const finalizado = !canc && (fat || passouExpedicao)
                        const grade = parseNumeros(tNode.talao.NUMEROS)
                        const statusBorder = canc ? 'border-red-500/25' : finalizado ? 'border-green-500/25' : 'border-[var(--th-border)]'
                        const statusBar = canc ? 'bg-red-500' : finalizado ? 'bg-green-500' : 'bg-[var(--th-accent)]'
                        return (
                          <div key={tc} className={`rounded-xl border ${statusBorder} bg-[var(--th-card)] overflow-hidden`}>
                            {/* Header */}
                            <div className="flex items-stretch gap-0">
                              {/* Status accent bar */}
                              <div className={`w-1 shrink-0 ${statusBar} opacity-60`} />
                              <div className="flex-1 flex items-center justify-between gap-4 px-4 py-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                                    <span className="inline-flex items-center gap-1.5 bg-[var(--th-subtle)] border border-[var(--th-border)] px-2.5 py-1 rounded-md">
                                      <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--th-txt-4)]">Talão</span>
                                      <span className="font-mono font-bold text-sm text-[var(--th-txt-1)] tracking-wide leading-none">{tc}</span>
                                    </span>
                                    {canc
                                      ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border bg-red-500/15 text-red-400 border-red-500/30">Cancelado</span>
                                      : finalizado
                                        ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border bg-green-500/15 text-green-400 border-green-500/30">{fat ? 'Faturado' : 'Finalizado'}</span>
                                        : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border bg-orange-500/15 text-orange-400 border-orange-500/30">Em produção</span>
                                    }
                                  </div>
                                  {fn && <p className="text-xs text-[var(--th-txt-3)] truncate max-w-[320px]">{fn}</p>}
                                </div>
                                <div className="shrink-0 text-right">
                                  <p className="text-[11px] text-[var(--th-txt-4)] mb-0.5 uppercase tracking-widest">Total</p>
                                  <p className="text-lg font-bold font-mono text-orange-400 leading-none">{fmtNumber(tNode.talao.TOTAL)}</p>
                                </div>
                              </div>
                            </div>
                            {/* Meta strip — linha 1: identificação */}
                            <div className="flex gap-4 px-4 py-1.5 bg-[var(--th-subtle)] border-t border-[var(--th-border)] flex-wrap">
                              <span className="text-[11px] text-[var(--th-txt-4)]">Item <span className="font-mono text-[var(--th-txt-2)]">{asText(tNode.talao.ITEM) || '—'}</span></span>
                              <span className="text-[11px] text-[var(--th-txt-4)]">Ref <span className="font-mono text-[var(--th-txt-2)]">{fc || '—'}</span></span>
                              <span className="text-[11px] text-[var(--th-txt-4)]">Remessa <span className="font-mono text-[var(--th-txt-2)]">{asText(tNode.talao.REMESSA) || '—'}</span></span>
                              {asText(pNode.pedido.PEDCLIENTE) && (
                                <span className="text-[11px] text-[var(--th-txt-4)]">O.C. <span className="font-mono text-[var(--th-txt-2)]">{asText(pNode.pedido.PEDCLIENTE)}</span></span>
                              )}
                            </div>
                            {/* Fluxo de Produção — baseado em sequeset (rota por ficha) + talsetor/moviprod (scans) */}
                            {(() => {
                              const steps = sequesetByFicha.get(fc) ?? []
                              if (steps.length === 0) return null
                              const tsForTalao = talsetorByTalao.get(tc) ?? []
                              const passedSetores = new Set(tsForTalao.map(mv => asText(mv.SETOR).trim()))
                              const currentMovi = moviprodByTalao.get(tc)
                              const currentSetor = (currentMovi && !asText(currentMovi.DATASDA).trim()) ? asText(currentMovi.SETOR).trim() : null
                              const scanSteps = steps.filter(s => s.TALAO !== false)
                              const passedCount = scanSteps.filter(s => passedSetores.has(asText(s.SETOR).trim())).length
                              const totalCount = scanSteps.length
                              const progress = totalCount > 0 ? (passedCount / totalCount) * 100 : 0
                              return (
                                <div className="px-4 py-3 border-t border-[var(--th-border)]">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--th-txt-4)]">Fluxo</span>
                                    <span className="text-[11px] font-mono text-[var(--th-txt-3)]">{passedCount}/{totalCount} setores</span>
                                  </div>
                                  <div className="h-1 rounded-full bg-[var(--th-border)] mb-3 overflow-hidden">
                                    <div className={`h-full rounded-full transition-all duration-500 ${canc ? 'bg-red-500' : passedCount === totalCount && totalCount > 0 ? 'bg-green-500' : 'bg-[var(--th-accent)]'}`} style={{ width: `${progress}%` }} />
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {steps.map((step, idx) => {
                                      const sc = asText(step.SETOR).trim()
                                      const needsScan = step.TALAO !== false
                                      const passed = passedSetores.has(sc)
                                      const isCurrent = sc === currentSetor
                                      const latestMv = tsForTalao.filter(mv => asText(mv.SETOR).trim() === sc).sort((a, b) => asText(b.DATA).localeCompare(asText(a.DATA)))[0]
                                      const sName = asText(latestMv?.NOMESET).trim() || setorNameMap.get(sc) || sc
                                      const short = sName.length > 11 ? sName.slice(0, 10) + '…' : sName
                                      return (
                                        <div key={idx} title={`${sName}${latestMv?.DATA ? ' — ' + fmtDate(latestMv.DATA) : ''}`}
                                          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${
                                            !needsScan ? 'opacity-40 bg-[var(--th-subtle)] border-[var(--th-border)] text-[var(--th-txt-4)]'
                                            : passed ? 'bg-green-500/10 border-green-500/25 text-green-400'
                                            : isCurrent ? 'bg-orange-500/15 border-orange-500/30 text-orange-400 ring-1 ring-orange-500/20'
                                            : 'bg-[var(--th-subtle)] border-[var(--th-border)] text-[var(--th-txt-4)]'
                                          }`}>
                                          <span className="shrink-0 leading-none">{passed ? '✓' : isCurrent ? '●' : '○'}</span>
                                          <span>{short}</span>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              )
                            })()}
                            {/* Meta strip — linha 2: dados da ficha (matriz, navalha, cor) */}
                            {(fMatriz || fNavalha || fCor) && (
                              <div className="flex gap-4 px-4 py-1.5 border-t border-[var(--th-border)] flex-wrap">
                                {fMatriz && <span className="text-[11px] text-[var(--th-txt-4)]">Matriz <span className="font-mono text-[var(--th-txt-2)]">{fMatriz}</span></span>}
                                {fNavalha && <span className="text-[11px] text-[var(--th-txt-4)]">Navalha <span className="font-mono text-[var(--th-txt-2)]">{fNavalha}</span></span>}
                                {fCor && <span className="text-[11px] text-[var(--th-txt-4)]">Cor <span className="font-mono text-[var(--th-txt-2)]">{fCor}</span></span>}
                              </div>
                            )}
                            {/* OBS da ficha */}
                            {fObs && (
                              <div className="px-4 py-1.5 border-t border-[var(--th-border)]">
                                <span className="text-[11px] text-[var(--th-txt-4)]">Obs. <span className="text-[var(--th-txt-2)]">{fObs}</span></span>
                              </div>
                            )}
                            {/* Meta strip — linha 3: detalhes de construção da ficha */}
                            {(fConstruc || fSalto || fPalmilha || fForma || fLinha || fProdTxt) && (
                              <div className="flex gap-4 px-4 py-1.5 border-t border-[var(--th-border)] flex-wrap">
                                {fProdTxt && <span className="text-[11px] text-[var(--th-txt-4)]">Tipo <span className="font-mono text-[var(--th-txt-2)]">{fProdTxt}</span></span>}
                                {fLinha && <span className="text-[11px] text-[var(--th-txt-4)]">Linha <span className="font-mono text-[var(--th-txt-2)]">{fLinha}</span></span>}
                                {fConstruc && <span className="text-[11px] text-[var(--th-txt-4)]">Construção <span className="font-mono text-[var(--th-txt-2)]">{fConstruc}</span></span>}
                                {fSalto && <span className="text-[11px] text-[var(--th-txt-4)]">Salto <span className="font-mono text-[var(--th-txt-2)]">{fSalto}</span></span>}
                                {fPalmilha && <span className="text-[11px] text-[var(--th-txt-4)]">Palmilha <span className="font-mono text-[var(--th-txt-2)]">{fPalmilha}</span></span>}
                                {fForma && <span className="text-[11px] text-[var(--th-txt-4)]">Forma <span className="font-mono text-[var(--th-txt-2)]">{fForma}</span></span>}
                              </div>
                            )}
                            {/* Grade */}
                            {grade.length > 0 && (
                              <div className="px-4 py-3 border-t border-[var(--th-border)]">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--th-txt-4)]">Grade</span>
                                  {gradeCode && <span className="font-mono text-[11px] text-[var(--th-txt-3)]">{gradeCode}</span>}
                                  {gradeName && <span className="text-[11px] text-[var(--th-txt-3)]">— {gradeName}</span>}
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {grade.map(({ slot, qty }) => (
                                    <div key={slot} className="flex flex-col items-center rounded-lg border border-[var(--th-border)] bg-[var(--th-subtle)] overflow-hidden" style={{ minWidth: 38 }}>
                                      <span className="px-1.5 py-1 text-[11px] font-bold font-mono text-[var(--th-txt-2)] text-center w-full leading-none">{slot}</span>
                                      <div className="w-full border-t border-[var(--th-border)]" />
                                      <span className="px-1.5 py-1 text-[11px] font-bold font-mono text-orange-400 text-center w-full leading-none">{qty}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {/* Materiais (BOM) */}
                            {bomItems.length > 0 && (
                              <div className="border-t border-[var(--th-border)]">
                                <button
                                  type="button"
                                  onClick={() => setExpandedBom(prev => {
                                    const next = new Set(prev)
                                    next.has(tc) ? next.delete(tc) : next.add(tc)
                                    return next
                                  })}
                                  className="w-full px-4 py-2 bg-[var(--th-subtle)] flex items-center justify-between hover:bg-[var(--th-hover)] transition-colors"
                                >
                                  <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--th-txt-4)]">Materiais</p>
                                  <span className="text-[11px] text-[var(--th-txt-4)]">{bomExpanded ? '▲' : '▼'} {bomItems.length}</span>
                                </button>
                                {bomExpanded && (
                                  <div className="divide-y divide-[var(--th-border)]">
                                    {bomItems.map((bom, i) => (
                                      <div key={i} className="flex items-center gap-3 px-4 py-2 hover:bg-[var(--th-hover)] transition-colors">
                                        <div className="flex-1 min-w-0">
                                          <p className="text-[11px] font-medium text-[var(--th-txt-2)] truncate">{asText(bom.NOMEMAT) || '—'}</p>
                                          <p className="text-[10px] text-[var(--th-txt-4)]">{asText(bom.NOMESET) || asText(bom.TIPO) || ''}</p>
                                        </div>
                                        {(bom.CONSUMO != null && bom.CONSUMO !== '') && (
                                          <span className="text-[11px] font-mono text-orange-400 shrink-0">{fmtNumber(bom.CONSUMO)} <span className="text-[var(--th-txt-4)]">{asText(bom.UNI)}</span></span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                            {/* Histórico de setores */}
                            {(() => {
                              const movs = [...(talsetorByTalao.get(tc) ?? [])].sort((a, b) => asText(b.DATA).localeCompare(asText(a.DATA), 'pt-BR'))
                              if (movs.length === 0) return null
                              return (
                                <div className="border-t border-[var(--th-border)]">
                                  <div className="px-4 py-2 bg-[var(--th-subtle)] flex items-center justify-between">
                                    <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--th-txt-4)]">Histórico</p>
                                    <span className="text-[11px] text-[var(--th-txt-4)]">{movs.length} registro(s)</span>
                                  </div>
                                  <div className="divide-y divide-[var(--th-border)]">
                                    {movs.map((mv, i) => (
                                      <div key={i} className="flex items-center gap-3 px-4 py-2 hover:bg-[var(--th-hover)] transition-colors">
                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500/50 shrink-0" />
                                        <span className="text-[11px] font-mono text-[var(--th-txt-4)] shrink-0 w-[72px]">{fmtDate(mv.DATA)}</span>
                                        <span className="text-[11px] font-medium text-[var(--th-txt-2)] flex-1 truncate">{asText(mv.NOMESET) || asText(mv.SETOR) || '—'}</span>
                                        <span className="text-[11px] font-mono text-orange-400 shrink-0">{fmtNumber(mv.QTDE)}</span>
                                        {asText(mv.REMESSA) && (
                                          <span className="text-[11px] px-1.5 py-0.5 rounded bg-[var(--th-subtle)] text-[var(--th-txt-4)] border border-[var(--th-border)] shrink-0 font-mono">{asText(mv.REMESSA)}</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )
                            })()}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}

              {/* Remessa detail — empty state */}
              {ordersSubTab === 'remessas' && !selectedRemessaDetail && (
                <div className="flex flex-col items-center justify-center py-16 text-[var(--th-txt-4)]">
                  <Box strokeWidth={1} className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-sm">Selecione uma remessa para ver detalhes</p>
                </div>
              )}

              {/* Remessa detail */}
              {ordersSubTab === 'remessas' && selectedRemessaDetail && (() => {
                const rNode = selectedRemessaDetail
                const pedUnicos = [...new Set(rNode.taloes.map(t => asText(t.pedido?.CODIGO).trim()).filter(Boolean))]
                const cliUnicos = [...new Set(rNode.taloes.map(t => t.clienteNome).filter(n => n !== '—'))]
                return (
                  <div className="space-y-4">
                    <button className="sm:hidden flex items-center gap-1.5 text-sm text-[var(--th-txt-3)] hover:text-[var(--th-txt-1)] transition-colors py-1" onClick={() => setSelectedRemessaDetail(null)}>
                      <ChevronLeft className="w-4 h-4" />Voltar
                    </button>
                    <div className="flex items-start gap-4 pb-4 border-b border-[var(--th-border)]">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center shrink-0">
                        <Box strokeWidth={1.5} className="w-5 h-5 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-bold font-mono text-[var(--th-txt-1)] mb-1">{rNode.remessa}</h2>
                        <div className="flex items-center gap-4 text-xs text-[var(--th-txt-4)] flex-wrap">
                          <span>{rNode.taloes.length} talões</span>
                          <span>Qtd total: {fmtNumber(rNode.totalQtde)}</span>
                          <span>Pedido(s): {pedUnicos.slice(0, 3).join(', ')}{pedUnicos.length > 3 ? ` +${pedUnicos.length - 3}` : ''}</span>
                          <span>Cliente(s): {cliUnicos.slice(0, 2).join(', ')}{cliUnicos.length > 2 ? ` +${cliUnicos.length - 2}` : ''}</span>
                        </div>
                      </div>
                      <button type="button" onClick={() => setSelectedRemessaDetail(null)} className="p-1.5 rounded hover:bg-[var(--th-hover)] text-[var(--th-txt-4)] shrink-0">
                        <X strokeWidth={1.5} className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="overflow-auto rounded-xl border border-[var(--th-border)]">
                        <table className="w-full text-xs min-w-[640px]">
                          <thead><tr className="border-b border-[var(--th-border)] bg-[var(--th-subtle)]">
                            <th className="px-3 py-2 text-left text-[11px] font-medium text-[var(--th-txt-4)] uppercase tracking-widest">Talão</th>
                            <th className="px-3 py-2 text-left text-[11px] font-medium text-[var(--th-txt-4)] uppercase tracking-widest">Pedido</th>
                            <th className="px-3 py-2 text-left text-[11px] font-medium text-[var(--th-txt-4)] uppercase tracking-widest">Item</th>
                            <th className="px-3 py-2 text-left text-[11px] font-medium text-[var(--th-txt-4)] uppercase tracking-widest">Produto</th>
                            <th className="px-3 py-2 text-left text-[11px] font-medium text-[var(--th-txt-4)] uppercase tracking-widest">Cliente</th>
                            <th className="px-3 py-2 text-left text-[11px] font-medium text-[var(--th-txt-4)] uppercase tracking-widest">Qtd</th>
                            <th className="px-3 py-2 text-left text-[11px] font-medium text-[var(--th-txt-4)] uppercase tracking-widest">Último Setor</th>
                            <th className="px-3 py-2 text-left text-[11px] font-medium text-[var(--th-txt-4)] uppercase tracking-widest">Status</th>
                          </tr></thead>
                          <tbody className="divide-y divide-[var(--th-border)]">
                            {rNode.taloes.map((t, i) => {
                              const canc = isTruthy(t.talao.CANCELADO), fat = isTruthy(t.talao.FATURADO)
                              return (
                                <tr key={i} className="hover:bg-[var(--th-hover)]">
                                  <td className="px-3 py-2 font-mono text-[var(--th-txt-2)]">{asText(t.talao.CODIGO) || '—'}</td>
                                  <td className="px-3 py-2 font-mono text-[var(--th-txt-2)]">{asText(t.pedido?.CODIGO) || '—'}</td>
                                  <td className="px-3 py-2 text-[var(--th-txt-3)]">{asText(t.talao.ITEM) || '—'}</td>
                                  <td className="px-3 py-2 text-[var(--th-txt-2)] max-w-[160px] truncate">{t.fichaNome}</td>
                                  <td className="px-3 py-2 text-[var(--th-txt-2)] max-w-[140px] truncate">{t.clienteNome}</td>
                                  <td className="px-3 py-2 text-[var(--th-txt-2)]">{fmtNumber(t.talao.TOTAL)}</td>
                                  <td className="px-3 py-2 text-[var(--th-txt-3)]">{t.latestSetor}</td>
                                  <td className="px-3 py-2">
                                    {canc ? <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border bg-red-500/15 text-red-400 border-red-500/30">Cancelado</span>
                                      : fat ? <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border bg-green-500/15 text-green-400 border-green-500/30">Faturado</span>
                                        : <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border bg-orange-500/15 text-orange-400 border-orange-500/30">Em produção</span>}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>

                      {rNode.taloes.some(t => t.movimentos.length > 0) && (
                        <div className="rounded-xl border border-[var(--th-border)] overflow-hidden">
                          <div className="px-3 py-2 bg-[var(--th-subtle)] border-b border-[var(--th-border)] text-[11px] font-medium text-[var(--th-txt-4)] uppercase tracking-widest">Histórico de Setores</div>
                          <div className="overflow-auto">
                            <table className="w-full text-xs min-w-[480px]">
                              <thead><tr className="border-b border-[var(--th-border)] bg-[var(--th-subtle)]">
                                <th className="px-3 py-2 text-left text-[11px] font-medium text-[var(--th-txt-4)] uppercase tracking-widest">Talão</th>
                                <th className="px-3 py-2 text-left text-[11px] font-medium text-[var(--th-txt-4)] uppercase tracking-widest">Data</th>
                                <th className="px-3 py-2 text-left text-[11px] font-medium text-[var(--th-txt-4)] uppercase tracking-widest">Setor</th>
                                <th className="px-3 py-2 text-left text-[11px] font-medium text-[var(--th-txt-4)] uppercase tracking-widest">Nome Setor</th>
                                <th className="px-3 py-2 text-left text-[11px] font-medium text-[var(--th-txt-4)] uppercase tracking-widest">Qtd</th>
                              </tr></thead>
                              <tbody className="divide-y divide-[var(--th-border)]">
                                {rNode.taloes.flatMap(t => t.movimentos.map((mv, mi) => (
                                  <tr key={`${t.talao.CODIGO}|${mi}`} className="hover:bg-[var(--th-hover)]">
                                    <td className="px-3 py-2 font-mono text-[var(--th-txt-3)]">{asText(t.talao.CODIGO) || '—'}</td>
                                    <td className="px-3 py-2 text-[var(--th-txt-2)]">{fmtDate(mv.DATA)}</td>
                                    <td className="px-3 py-2 text-[var(--th-txt-2)]">{asText(mv.SETOR) || '—'}</td>
                                    <td className="px-3 py-2 text-[var(--th-txt-2)]">{asText(mv.NOMESET) || '—'}</td>
                                    <td className="px-3 py-2 text-[var(--th-txt-2)]">{fmtNumber(mv.QTDE)}</td>
                                  </tr>
                                )))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}

            </div>
          </>
        )}

        {/* ── LOGS ── */}
        {selectedModule === 'logs' && (() => {
          const q = logsQuery.trim().toLowerCase()
          const filteredLogs = q
            ? logs.filter(l =>
                (l.username ?? '').toLowerCase().includes(q) ||
                (l.ip ?? '').toLowerCase().includes(q) ||
                (l.os ?? '').toLowerCase().includes(q) ||
                (l.browser ?? '').toLowerCase().includes(q) ||
                (l.device_type ?? '').toLowerCase().includes(q)
              )
            : logs
          const uniqueUsers = new Set(logs.map(l => l.username).filter(Boolean)).size
          const lastAccess = logs[0]?.created_at
            ? new Date(logs[0].created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
            : null
          return (
            <>
              {/* List panel */}
              <div className={`shrink-0 border-r border-[var(--th-border)] flex-col bg-[var(--th-card)] w-full sm:w-[300px] ${selectedLog ? 'hidden sm:flex' : 'flex'}`}>
                <div className="px-4 py-4 border-b border-[var(--th-border)] shrink-0">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[var(--th-txt-1)]">Logs</span>
                      <span className="text-xs bg-[var(--th-subtle)] px-2 py-0.5 rounded-full text-[var(--th-txt-4)]">{filteredLogs.length}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {logsLastSync && (
                        <span className="text-[11px] text-[var(--th-txt-4)]">
                          {logsLastSync.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      <button type="button" onClick={() => { void fetchLogs() }} className="p-1.5 rounded text-[var(--th-txt-4)] hover:bg-[var(--th-hover)] transition-colors">
                        <RefreshCw strokeWidth={1.5} className={`w-3.5 h-3.5 ${logsLoading ? 'animate-spin' : ''}`} />
                      </button>
                      <button type="button" onClick={() => setShowClearLogsConfirm(true)} className="p-1.5 rounded text-[var(--th-txt-4)] hover:bg-red-500/10 hover:text-red-400 transition-colors">
                        <Trash2 strokeWidth={1.5} className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <Search strokeWidth={1.5} className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--th-txt-4)]" />
                    <input
                      value={logsQuery}
                      onChange={e => setLogsQuery(e.target.value)}
                      placeholder="Buscar usuário, IP, OS..."
                      className="w-full rounded-lg border border-[var(--th-border)] bg-transparent pl-8 pr-3 py-1.5 text-xs text-[var(--th-txt-1)] placeholder:text-[var(--th-txt-4)] focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {logsError && <div className="px-3 py-2 text-xs text-red-400 bg-red-500/10 rounded-lg border border-red-500/20">{logsError}</div>}
                  {logsLoading && logs.length === 0 && (
                    <div className="px-4 py-8 text-center text-sm text-[var(--th-txt-3)]">Carregando...</div>
                  )}
                  {!logsLoading && logs.length === 0 && !logsError && (
                    <div className="px-4 py-16 text-center text-sm text-[var(--th-txt-3)]">Nenhum acesso registrado.</div>
                  )}
                  {!logsLoading && logs.length > 0 && filteredLogs.length === 0 && (
                    <div className="px-4 py-16 text-center text-sm text-[var(--th-txt-3)]">Nenhum resultado.</div>
                  )}
                  {filteredLogs.map(log => {
                    const isMobile = log.device_type === 'Mobile' || log.device_type === 'Tablet'
                    const ts = log.created_at
                      ? new Date(log.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                      : '—'
                    const isSelected = selectedLog?.id === log.id
                    return (
                      <button
                        key={log.id}
                        type="button"
                        onClick={() => setSelectedLog(log)}
                        className={isSelected ? 'w-full text-left rounded-xl border border-orange-500/40 bg-orange-500/8 px-4 py-3 transition-all' : 'w-full text-left rounded-xl border border-[var(--th-border)] bg-[var(--th-card)] px-4 py-3 transition-all hover:border-orange-500/30 hover:bg-orange-500/5'}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-[var(--th-subtle)] border border-[var(--th-border)] flex items-center justify-center shrink-0 mt-0.5">
                            {isMobile
                              ? <Smartphone strokeWidth={1.5} className="w-3.5 h-3.5 text-[var(--th-txt-4)]" />
                              : <Monitor strokeWidth={1.5} className="w-3.5 h-3.5 text-[var(--th-txt-4)]" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                              <span className="text-[13px] font-medium text-[var(--th-txt-1)] truncate">{log.username || '—'}</span>
                              <span className="text-[11px] text-[var(--th-txt-4)] shrink-0">{ts}</span>
                            </div>
                            <p className="text-[11px] font-mono text-[var(--th-txt-3)] truncate mb-0.5">{log.ip || '—'}</p>
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] px-1 py-px rounded bg-[var(--th-subtle)] text-[var(--th-txt-4)] border border-[var(--th-border)]">{log.os || '—'}</span>
                              <span className="text-[11px] px-1 py-px rounded bg-[var(--th-subtle)] text-[var(--th-txt-4)] border border-[var(--th-border)]">{log.browser || '—'}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Detail panel */}
              <div className={`overflow-y-auto sm:flex-1 sm:p-5 ${selectedLog ? 'fixed inset-0 top-[54px] z-40 bg-[var(--th-page)] p-4 sm:static sm:inset-auto sm:z-auto sm:bg-transparent' : 'hidden sm:block'}`}>
                {!selectedLog && (
                  <div className="flex flex-col h-full">
                    {/* Stats */}
                    <div className="pb-4 border-b border-[var(--th-border)]">
                      <h2 className="text-base font-semibold text-[var(--th-txt-1)] mb-4">Resumo de Acessos</h2>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: 'Total de Acessos', value: logs.length.toString() },
                          { label: 'Usuários Únicos', value: uniqueUsers.toString() },
                          { label: 'Último Acesso', value: lastAccess ?? '—' },
                        ].map(stat => (
                          <div key={stat.label} className="rounded-xl border border-[var(--th-border)] bg-[var(--th-card)] px-4 py-3">
                            <p className="text-[11px] font-medium text-[var(--th-txt-4)] uppercase tracking-widest mb-1">{stat.label}</p>
                            <p className="text-lg font-bold text-[var(--th-txt-1)]">{stat.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Full table */}
                    <div className="flex-1 overflow-auto pt-4">
                      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--th-txt-4)] mb-3">Todos os registros</p>
                      <div className="rounded-xl border border-[var(--th-border)] overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-[var(--th-border)] bg-[var(--th-subtle)]">
                              <th className="px-3 py-2.5 text-left text-[11px] font-medium text-[var(--th-txt-4)] uppercase tracking-widest">Data / Hora</th>
                              <th className="px-3 py-2.5 text-left text-[11px] font-medium text-[var(--th-txt-4)] uppercase tracking-widest">Usuário</th>
                              <th className="px-3 py-2.5 text-left text-[11px] font-medium text-[var(--th-txt-4)] uppercase tracking-widest">IP</th>
                              <th className="px-3 py-2.5 text-left text-[11px] font-medium text-[var(--th-txt-4)] uppercase tracking-widest">Dispositivo</th>
                              <th className="px-3 py-2.5 text-left text-[11px] font-medium text-[var(--th-txt-4)] uppercase tracking-widest">OS</th>
                              <th className="px-3 py-2.5 text-left text-[11px] font-medium text-[var(--th-txt-4)] uppercase tracking-widest">Browser</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--th-border)]">
                            {filteredLogs.length === 0 && (
                              <tr><td colSpan={6} className="px-3 py-8 text-center text-[var(--th-txt-3)]">Nenhum registro.</td></tr>
                            )}
                            {filteredLogs.map(log => {
                              const isMobile = log.device_type === 'Mobile' || log.device_type === 'Tablet'
                              const ts = log.created_at
                                ? new Date(log.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
                                : '—'
                              return (
                                <tr key={log.id} onClick={() => setSelectedLog(log)} className="hover:bg-[var(--th-hover)] cursor-pointer">
                                  <td className="px-3 py-2.5 text-[var(--th-txt-3)] whitespace-nowrap">{ts}</td>
                                  <td className="px-3 py-2.5 font-medium text-[var(--th-txt-1)]">{log.username || '—'}</td>
                                  <td className="px-3 py-2.5 font-mono text-[var(--th-txt-3)]">{log.ip || '—'}</td>
                                  <td className="px-3 py-2.5">
                                    <span className="inline-flex items-center gap-1 text-[var(--th-txt-3)]">
                                      {isMobile
                                        ? <Smartphone strokeWidth={1.5} className="w-3 h-3" />
                                        : <Monitor strokeWidth={1.5} className="w-3 h-3" />}
                                      {log.device_type || '—'}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5 text-[var(--th-txt-3)]">{log.os || '—'}</td>
                                  <td className="px-3 py-2.5 text-[var(--th-txt-3)]">{log.browser || '—'}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {selectedLog && (() => {
                  const log = selectedLog
                  const isMobile = log.device_type === 'Mobile' || log.device_type === 'Tablet'
                  const ts = log.created_at
                    ? new Date(log.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    : '—'
                  return (
                    <div className="space-y-4">
                      <button className="sm:hidden flex items-center gap-1.5 text-sm text-[var(--th-txt-3)] hover:text-[var(--th-txt-1)] transition-colors py-1" onClick={() => setSelectedLog(null)}>
                        <ChevronLeft className="w-4 h-4" />Voltar
                      </button>
                      <div className="flex items-start justify-between gap-4 pb-4 border-b border-[var(--th-border)]">
                        <div className="min-w-0">
                          <div className="flex items-center gap-3 flex-wrap mb-1">
                            <span className="inline-flex items-center gap-2 text-lg font-bold text-[var(--th-txt-1)]">
                              {isMobile
                                ? <Smartphone strokeWidth={1.5} className="w-5 h-5 text-[var(--th-txt-3)]" />
                                : <Monitor strokeWidth={1.5} className="w-5 h-5 text-[var(--th-txt-3)]" />}
                              {log.username || '—'}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border bg-green-500/15 text-green-400 border-green-500/30">{log.status || 'login'}</span>
                          </div>
                          <p className="text-xs text-[var(--th-txt-4)]">{ts}</p>
                        </div>
                        <button type="button" onClick={() => setSelectedLog(null)} className="p-1.5 rounded hover:bg-[var(--th-hover)] text-[var(--th-txt-4)] shrink-0">
                          <X strokeWidth={1.5} className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: 'IP', value: log.ip || '—', mono: true },
                          { label: 'Dispositivo', value: log.device_type || '—', mono: false },
                          { label: 'Sistema Operacional', value: log.os || '—', mono: false },
                          { label: 'Navegador', value: log.browser || '—', mono: false },
                          { label: 'Status', value: log.status || '—', mono: false },
                          { label: 'ID do Registro', value: String(log.id), mono: true },
                        ].map(({ label, value, mono }) => (
                          <div key={label} className="rounded-lg border border-[var(--th-border)] bg-[var(--th-card)] px-3 py-2.5">
                            <p className="text-[11px] font-medium text-[var(--th-txt-4)] uppercase tracking-widest mb-1">{label}</p>
                            <p className={`text-sm text-[var(--th-txt-1)] ${mono ? 'font-mono' : ''}`}>{value}</p>
                          </div>
                        ))}
                      </div>

                      {log.user_agent && (
                        <div className="rounded-xl border border-[var(--th-border)] bg-[var(--th-card)] p-4">
                          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--th-txt-4)] mb-3">User Agent</p>
                          <p className="text-xs font-mono text-[var(--th-txt-3)] break-all leading-relaxed">{log.user_agent}</p>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            </>
          )
        })()}

        {/* ── CLEAR LOGS MODAL ── */}
        {showClearLogsConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowClearLogsConfirm(false)} />
            <div className="relative bg-[var(--th-card)] border border-[var(--th-border)] rounded-2xl shadow-2xl p-6 w-[340px] flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                  <Trash2 strokeWidth={1.5} className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--th-txt-1)]">Limpar histórico</p>
                  <p className="text-xs text-[var(--th-txt-4)] mt-0.5">Esta ação não pode ser desfeita</p>
                </div>
              </div>
              <p className="text-sm text-[var(--th-txt-3)] leading-relaxed">
                Todos os registros de acesso serão <span className="text-red-400 font-medium">deletados permanentemente</span>. Deseja continuar?
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowClearLogsConfirm(false)}
                  className="flex-1 py-2 rounded-lg border border-[var(--th-border)] text-sm text-[var(--th-txt-2)] hover:bg-[var(--th-hover)] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => { void clearLogs() }}
                  disabled={clearLogsLoading}
                  className="flex-1 py-2 rounded-lg bg-red-500 hover:bg-red-600 disabled:opacity-50 text-sm font-medium text-white transition-colors"
                >
                  {clearLogsLoading ? 'Deletando...' : 'Deletar tudo'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── SECTORS (Production Flow) ── */}
        {selectedModule === 'sectors' && (() => {
          const q = prodItemsQuery.trim().toLowerCase()
          const filtered = q ? prodItems.filter(i => i.nome.toLowerCase().includes(q)) : prodItems
          return (
            <>
              {/* List panel */}
              <div className={`shrink-0 border-r border-[var(--th-border)] flex-col bg-[var(--th-card)] w-full sm:w-[300px] ${selectedProdItem ? 'hidden sm:flex' : 'flex'}`}>
                <div className="px-4 py-4 border-b border-[var(--th-border)] shrink-0">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[var(--th-txt-1)]">Itens</span>
                      <span className="text-xs bg-[var(--th-subtle)] px-2 py-0.5 rounded-full text-[var(--th-txt-4)]">{filtered.length}</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button type="button" onClick={() => void fetchProdItems()}
                        className="p-1.5 rounded text-[var(--th-txt-4)] hover:bg-[var(--th-hover)] transition-colors">
                        <RefreshCw strokeWidth={1.5} className={`w-3.5 h-3.5 ${prodItemsLoading ? 'animate-spin' : ''}`} />
                      </button>
                      <button type="button" onClick={() => { setShowNewItemForm(v => !v); setNewItemName(''); setNewItemError(null) }}
                        className={`p-1.5 rounded transition-colors ${showNewItemForm ? 'bg-orange-500/15 text-orange-400' : 'text-[var(--th-txt-4)] hover:bg-[var(--th-hover)]'}`}>
                        <Plus strokeWidth={1.5} className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {showNewItemForm && (
                    <div className="rounded-lg border border-[var(--th-border)] p-3 space-y-2 bg-[var(--th-subtle)] mb-3">
                      <input
                        value={newItemName}
                        onChange={e => setNewItemName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') void createProdItem() }}
                        placeholder="Nome do item *"
                        autoFocus
                        className="w-full rounded-lg border border-[var(--th-border)] bg-transparent px-3 py-1.5 text-xs text-[var(--th-txt-1)] placeholder:text-[var(--th-txt-4)] focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                      />
                      {newItemError && <p className="text-[11px] text-red-400">{newItemError}</p>}
                      <div className="flex gap-2">
                        <button type="button" onClick={() => void createProdItem()}
                          disabled={newItemSaving || !newItemName.trim()}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-medium hover:bg-orange-600 disabled:opacity-40 transition-colors">
                          {newItemSaving ? <RefreshCw strokeWidth={2} className="w-3 h-3 animate-spin" /> : <Check strokeWidth={2} className="w-3 h-3" />}
                          Criar
                        </button>
                        <button type="button" onClick={() => { setShowNewItemForm(false); setNewItemName(''); setNewItemError(null) }}
                          className="px-3 py-1.5 rounded-lg border border-[var(--th-border)] text-xs text-[var(--th-txt-3)] hover:bg-[var(--th-hover)]">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="relative">
                    <Search strokeWidth={1.5} className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--th-txt-4)]" />
                    <input value={prodItemsQuery} onChange={e => setProdItemsQuery(e.target.value)}
                      placeholder="Buscar item..."
                      className="w-full rounded-lg border border-[var(--th-border)] bg-transparent pl-8 pr-3 py-1.5 text-xs text-[var(--th-txt-1)] placeholder:text-[var(--th-txt-4)] focus:outline-none focus:ring-2 focus:ring-orange-500/40" />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {prodItemsError && <div className="px-3 py-2 text-xs text-red-400 bg-red-500/10 rounded-lg border border-red-500/20">{prodItemsError}</div>}
                  {prodItemsLoading && prodItems.length === 0 && <div className="px-4 py-8 text-center text-sm text-[var(--th-txt-3)]">Carregando...</div>}
                  {!prodItemsLoading && prodItems.length === 0 && !prodItemsError && (
                    <div className="px-4 py-16 text-center text-sm text-[var(--th-txt-3)]">Nenhum item.<br /><span className="text-xs">Clique em + para criar.</span></div>
                  )}
                  {!prodItemsLoading && prodItems.length > 0 && filtered.length === 0 && (
                    <div className="px-4 py-8 text-center text-sm text-[var(--th-txt-3)]">Sem resultados.</div>
                  )}
                  {filtered.map(item => {
                    const etapaCount = item.id === selectedProdItem?.id ? prodEtapas.length : null
                    const isSelected = selectedProdItem?.id === item.id
                    return (
                      <button key={item.id} type="button"
                        onClick={() => {
                          setSelectedProdItem(item)
                          setEditItemMode(false)
                          setEtapaEditId(null)
                          if (selectedProdItem?.id !== item.id) void fetchProdEtapas(item.id)
                        }}
                        className={isSelected
                          ? 'w-full text-left rounded-xl border border-orange-500/40 bg-orange-500/8 px-4 py-3 transition-all'
                          : 'w-full text-left rounded-xl border border-[var(--th-border)] bg-[var(--th-card)] px-4 py-3 transition-all hover:border-orange-500/30 hover:bg-orange-500/5'}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[13px] font-medium text-[var(--th-txt-1)] truncate">{item.nome}</span>
                          {etapaCount !== null && etapaCount > 0 && (
                            <span className="text-[11px] text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded-full shrink-0">{etapaCount} etapas</span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Detail panel */}
              <div className={`overflow-y-auto sm:flex-1 sm:p-6 ${selectedProdItem ? 'fixed inset-0 top-[54px] z-40 bg-[var(--th-page)] p-4 sm:static sm:inset-auto sm:z-auto sm:bg-transparent' : 'hidden sm:block'}`}>
                {!selectedProdItem && (
                  <div className="flex flex-col items-center justify-center py-24 text-[var(--th-txt-4)]">
                    <GitBranch strokeWidth={1} className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-sm">Selecione um item para ver seu fluxo de produção</p>
                  </div>
                )}

                {selectedProdItem && (
                  <div className="max-w-2xl space-y-5">
                    <button className="sm:hidden flex items-center gap-1.5 text-sm text-[var(--th-txt-3)] hover:text-[var(--th-txt-1)] transition-colors py-1" onClick={() => setSelectedProdItem(null)}>
                      <ChevronLeft className="w-4 h-4" />Voltar
                    </button>
                    {/* Item header */}
                    <div className="flex items-start justify-between gap-4 pb-5 border-b border-[var(--th-border)]">
                      <div className="flex-1 min-w-0">
                        {editItemMode ? (
                          <div className="flex items-center gap-2">
                            <input
                              value={editItemName}
                              onChange={e => setEditItemName(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') void saveItemName(); if (e.key === 'Escape') setEditItemMode(false) }}
                              autoFocus
                              className="flex-1 rounded-lg border border-orange-500/40 bg-transparent px-3 py-1.5 text-lg font-bold text-[var(--th-txt-1)] focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                            />
                            <button type="button" onClick={() => void saveItemName()}
                              className="p-1.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors">
                              <Check strokeWidth={2} className="w-4 h-4" />
                            </button>
                            <button type="button" onClick={() => setEditItemMode(false)}
                              className="p-1.5 rounded-lg border border-[var(--th-border)] hover:bg-[var(--th-hover)] text-[var(--th-txt-4)]">
                              <X strokeWidth={2} className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2.5">
                            <h2 className="text-xl font-bold text-[var(--th-txt-1)] leading-snug">{selectedProdItem.nome}</h2>
                            <button type="button"
                              onClick={() => { setEditItemMode(true); setEditItemName(selectedProdItem.nome) }}
                              className="p-1 rounded hover:bg-[var(--th-hover)] text-[var(--th-txt-4)] transition-colors">
                              <Pencil strokeWidth={1.5} className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                        <p className="text-xs text-[var(--th-txt-4)] mt-1">{prodEtapas.length} etapa(s) de produção</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button type="button" onClick={() => setShowDeleteItemConfirm(true)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-400 text-[var(--th-txt-4)] transition-colors">
                          <Trash2 strokeWidth={1.5} className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Etapas section */}
                    <div className="rounded-xl border border-[var(--th-border)] bg-[var(--th-card)] overflow-hidden">
                      <div className="px-4 py-3 border-b border-[var(--th-border)] bg-[var(--th-subtle)] flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--th-txt-4)]">Fluxo de Produção</p>
                        <span className="text-[11px] text-[var(--th-txt-4)]">{prodEtapas.length} etapas</span>
                      </div>

                      {prodEtapasLoading && (
                        <div className="px-4 py-8 text-center text-sm text-[var(--th-txt-3)]">Carregando...</div>
                      )}
                      {!prodEtapasLoading && prodEtapas.length === 0 && (
                        <div className="px-4 py-10 text-center">
                          <GitBranch strokeWidth={1} className="w-8 h-8 mx-auto mb-2 opacity-20 text-[var(--th-txt-4)]" />
                          <p className="text-sm text-[var(--th-txt-3)]">Nenhuma etapa definida.</p>
                          <p className="text-xs text-[var(--th-txt-4)] mt-0.5">Adicione as etapas abaixo para montar o fluxo.</p>
                        </div>
                      )}
                      {!prodEtapasLoading && prodEtapas.map((etapa, idx) => (
                        <div key={etapa.id}>
                          <div className="flex items-center gap-3 px-4 py-3 group hover:bg-[var(--th-hover)] transition-colors">
                            {/* Step number */}
                            <div className="w-7 h-7 rounded-full border border-orange-500/30 bg-orange-500/10 flex items-center justify-center shrink-0">
                              <span className="text-[11px] font-bold text-orange-400">{String(idx + 1).padStart(2, '0')}</span>
                            </div>
                            {/* Name / edit */}
                            <div className="flex-1 min-w-0">
                              {etapaEditId === etapa.id ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    value={etapaEditName}
                                    onChange={e => setEtapaEditName(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') void saveEtapaName(etapa.id); if (e.key === 'Escape') setEtapaEditId(null) }}
                                    autoFocus
                                    className="flex-1 rounded-lg border border-orange-500/40 bg-transparent px-3 py-1.5 text-xs text-[var(--th-txt-1)] focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                                  />
                                  <button type="button" onClick={() => void saveEtapaName(etapa.id)}
                                    className="p-1 rounded bg-orange-500 text-white hover:bg-orange-600">
                                    <Check strokeWidth={2} className="w-3 h-3" />
                                  </button>
                                  <button type="button" onClick={() => setEtapaEditId(null)}
                                    className="p-1 rounded border border-[var(--th-border)] hover:bg-[var(--th-hover)] text-[var(--th-txt-4)]">
                                    <X strokeWidth={2} className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-sm font-medium text-[var(--th-txt-1)]">{etapa.nome}</span>
                              )}
                            </div>
                            {/* Actions */}
                            {etapaEditId !== etapa.id && (
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button type="button" onClick={() => { setEtapaEditId(etapa.id); setEtapaEditName(etapa.nome) }}
                                  className="p-1 rounded hover:bg-[var(--th-hover)] text-[var(--th-txt-4)] transition-colors">
                                  <Pencil strokeWidth={1.5} className="w-3.5 h-3.5" />
                                </button>
                                <button type="button" onClick={() => void moveEtapa(etapa.id, 'up')}
                                  disabled={idx === 0}
                                  className="p-1 rounded hover:bg-[var(--th-hover)] text-[var(--th-txt-4)] disabled:opacity-20 transition-colors">
                                  <ChevronUp strokeWidth={2} className="w-3.5 h-3.5" />
                                </button>
                                <button type="button" onClick={() => void moveEtapa(etapa.id, 'down')}
                                  disabled={idx === prodEtapas.length - 1}
                                  className="p-1 rounded hover:bg-[var(--th-hover)] text-[var(--th-txt-4)] disabled:opacity-20 transition-colors">
                                  <ChevronDown strokeWidth={2} className="w-3.5 h-3.5" />
                                </button>
                                <button type="button" onClick={() => void deleteProdEtapa(etapa.id)}
                                  className="p-1 rounded hover:bg-red-500/10 hover:text-red-400 text-[var(--th-txt-4)] transition-colors">
                                  <X strokeWidth={2} className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                          {idx < prodEtapas.length - 1 && (
                            <div className="flex items-center pl-8 py-0">
                              <div className="w-px h-4 bg-orange-500/20 ml-3" />
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Add etapa row */}
                      <div className="px-4 py-3 border-t border-[var(--th-border)] bg-[var(--th-subtle)]">
                        <div className="flex items-center gap-2">
                          <input
                            value={newEtapaName}
                            onChange={e => setNewEtapaName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') void createProdEtapa() }}
                            placeholder="Nome da nova etapa..."
                            className="flex-1 rounded-lg border border-[var(--th-border)] bg-transparent px-3 py-1.5 text-xs text-[var(--th-txt-1)] placeholder:text-[var(--th-txt-4)] focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                          />
                          <button type="button" onClick={() => void createProdEtapa()}
                            disabled={newEtapaSaving || !newEtapaName.trim()}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-xs font-medium transition-colors">
                            {newEtapaSaving ? <RefreshCw strokeWidth={2} className="w-3 h-3 animate-spin" /> : <Plus strokeWidth={2} className="w-3 h-3" />}
                            Adicionar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Delete item confirm modal */}
              {showDeleteItemConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDeleteItemConfirm(false)} />
                  <div className="relative bg-[var(--th-card)] border border-[var(--th-border)] rounded-2xl shadow-2xl p-6 w-[340px] flex flex-col gap-4">
                    <div>
                      <h3 className="text-base font-semibold text-[var(--th-txt-1)] mb-1">Excluir item</h3>
                      <p className="text-sm text-[var(--th-txt-3)]">
                        Tem certeza que deseja excluir <span className="font-semibold text-[var(--th-txt-1)]">"{selectedProdItem?.nome}"</span> e todas as suas etapas? Esta ação não pode ser desfeita.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => void deleteProdItem()}
                        disabled={deleteItemLoading}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium transition-colors">
                        {deleteItemLoading ? <RefreshCw strokeWidth={2} className="w-4 h-4 animate-spin" /> : <Trash2 strokeWidth={1.5} className="w-4 h-4" />}
                        Excluir permanentemente
                      </button>
                      <button type="button" onClick={() => setShowDeleteItemConfirm(false)}
                        className="px-4 py-2.5 rounded-xl border border-[var(--th-border)] text-sm text-[var(--th-txt-2)] hover:bg-[var(--th-hover)] transition-colors">
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )
        })()}

        {/* ── Full-width modules ── */}
        {selectedModule !== 'orders' && selectedModule !== 'logs' && selectedModule !== 'sectors' && (
          <div className="flex-1 overflow-y-auto p-6">

            {/* DASHBOARD */}
            {selectedModule === 'dashboard' && (
              <div>
                <div className="mb-6">
                  <h1 className="text-xl font-bold text-[var(--th-txt-1)] mb-1">Dashboard Administrativo</h1>
                  <p className="text-sm text-[var(--th-txt-3)] mb-6">Visão geral do sistema Simple&amp;Eco</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  <div className="rounded-xl border border-[var(--th-border)] bg-[var(--th-card)]">
                    <div className="p-5 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-[var(--th-subtle)] border border-[var(--th-border)] flex items-center justify-center shrink-0">
                        <Box strokeWidth={1.5} className="w-5 h-5 text-[var(--th-txt-4)]" />
                      </div>
                      <div>
                        <p className="text-[11px] text-[var(--th-txt-4)] uppercase tracking-widest font-medium mb-0.5">Pedidos Totais</p>
                        <p className="text-xl font-bold text-orange-400">{totalOrders !== null ? totalOrders.toLocaleString('pt-BR') : '—'}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--th-border)] bg-[var(--th-card)] p-5 overflow-hidden">
                  <div className="pb-3 mb-3 border-b border-[var(--th-border)]">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--th-txt-4)]">Atividades Recentes</h3>
                  </div>
                  <div className="space-y-1">
                    {recentActivities.map((a, i) => (
                      <div key={i} className="rounded-xl border border-[var(--th-border)] bg-[var(--th-subtle)] px-4 py-3 hover:border-orange-500/30 hover:bg-orange-500/5 transition-all">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[var(--th-txt-1)] mb-0.5">{a.title}</p>
                            <p className="text-xs text-[var(--th-txt-3)] line-clamp-1">{a.description}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] px-1.5 py-0.5 rounded bg-[var(--th-card)] text-[var(--th-txt-4)] border border-[var(--th-border)]">{a.tag}</span>
                            <span className="text-[11px] text-[var(--th-txt-4)]">{a.timestamp}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* CLIENTS MODULE */}
            {selectedModule === 'clients' && (() => {
              const estados = [...new Set(clientesAll.map(c => asText(c.ESTADO).trim()).filter(Boolean))].sort()
              const q = clientesQuery.trim().toLowerCase()
              const filtered = clientesAll.filter(c => {
                if (clientesEstado && asText(c.ESTADO).trim() !== clientesEstado) return false
                if (!q) return true
                return [asText(c.CODIGO), asText(c.NOME), asText(c.FANTASIA), asText(c.CNPJ), asText(c.CHAVE), asText(c.CIDADE)].some(v => v.toLowerCase().includes(q))
              })
              // Contagem de pedidos por cliente (para exibir na lista)
              const pedidosCountMap = new Map<string, number>()
              for (const p of orders) {
                const k = asText(p.CLIENTE).trim(); if (!k) continue
                pedidosCountMap.set(k, (pedidosCountMap.get(k) ?? 0) + 1)
              }
              return (
                <div className="flex h-full gap-0 -m-6">
                  {/* List panel */}
                  <div className={`shrink-0 flex-col border-r border-[var(--th-border)] bg-[var(--th-card)] w-full sm:w-[340px] ${selectedCliente ? 'hidden sm:flex' : 'flex'}`}>
                    {/* Header */}
                    <div className="px-4 py-4 border-b border-[var(--th-border)]">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <h1 className="text-sm font-semibold text-[var(--th-txt-1)]">Clientes</h1>
                          <span className="text-xs bg-[var(--th-subtle)] px-2 py-0.5 rounded-full text-[var(--th-txt-4)]">{filtered.length}</span>
                          {clientesEstado && (
                            <span className="text-xs bg-orange-500/15 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded-full">{clientesEstado}</span>
                          )}
                        </div>
                        <button type="button" onClick={() => void fetchClientes()} className="p-1.5 rounded hover:bg-[var(--th-hover)] text-[var(--th-txt-4)]" title="Atualizar">
                          <RefreshCw strokeWidth={1.5} className={`w-3.5 h-3.5 ${clientesLoading ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                      {/* Search */}
                      <div className="relative mb-2">
                        <Search strokeWidth={1.5} className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--th-txt-4)]" />
                        <input value={clientesQuery} onChange={e => setClientesQuery(e.target.value)}
                          placeholder="Nome, fantasia, CNPJ, cidade..."
                          className="w-full rounded-lg border border-[var(--th-border)] bg-transparent pl-8 pr-8 py-1.5 text-xs text-[var(--th-txt-1)] placeholder:text-[var(--th-txt-4)] focus:outline-none focus:ring-2 focus:ring-orange-500/40" />
                        {clientesQuery && (
                          <button type="button" onClick={() => setClientesQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--th-txt-4)] hover:text-[var(--th-txt-1)]">
                            <X strokeWidth={2} className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      {/* Estado filter */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setClientesEstadoOpen(o => !o)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
                            clientesEstadoOpen
                              ? 'border-orange-500/50 bg-[var(--th-card)] ring-2 ring-orange-500/20'
                              : clientesEstado
                                ? 'border-orange-500/40 bg-orange-500/5'
                                : 'border-[var(--th-border)] bg-[var(--th-card)] hover:border-orange-500/30'
                          }`}
                        >
                          <span className={clientesEstado ? 'text-orange-400 font-medium' : 'text-[var(--th-txt-4)]'}>
                            {clientesEstado ? `Estado: ${clientesEstado}` : 'Todos os estados'}
                          </span>
                          <ChevronDown strokeWidth={2} className={`w-3 h-3 text-[var(--th-txt-4)] transition-transform shrink-0 ml-1 ${clientesEstadoOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {clientesEstadoOpen && (
                          <div className="absolute z-50 top-full mt-1 left-0 right-0 max-h-48 overflow-y-auto rounded-lg border border-[var(--th-border)] bg-[var(--th-card)] shadow-lg">
                            <button
                              type="button"
                              onClick={() => { setClientesEstado(''); setClientesEstadoOpen(false) }}
                              className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-[var(--th-hover)] ${
                                clientesEstado === '' ? 'text-orange-400 font-semibold' : 'text-[var(--th-txt-3)]'
                              }`}
                            >Todos os estados</button>
                            {estados.map(uf => (
                              <button
                                key={uf}
                                type="button"
                                onClick={() => { setClientesEstado(uf); setClientesEstadoOpen(false) }}
                                className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-[var(--th-hover)] flex items-center justify-between ${
                                  clientesEstado === uf ? 'text-orange-400 font-semibold' : 'text-[var(--th-txt-1)]'
                                }`}
                              >
                                <span>{uf}</span>
                                <span className="text-[var(--th-txt-4)] font-normal">{clientesAll.filter(c => asText(c.ESTADO).trim() === uf).length}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* List */}
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                      {clientesLoading && <div className="px-4 py-8 text-center text-sm text-[var(--th-txt-3)]">Carregando...</div>}
                      {clientesError && <div className="px-3 py-2 text-xs text-red-400 bg-red-500/10 rounded-lg border border-red-500/20">{clientesError}</div>}
                      {!clientesLoading && filtered.length === 0 && <div className="px-4 py-16 text-center text-sm text-[var(--th-txt-3)]">Nenhum cliente encontrado.</div>}
                      {filtered.map(c => {
                        const fantasia = asText(c.FANTASIA).trim()
                        const nomeRaw = asText(c.NOME).trim()
                        const displayName = fantasia || nomeRaw || '—'
                        const subName = fantasia && nomeRaw && fantasia !== nomeRaw ? nomeRaw : ''
                        const cod = asText(c.CODIGO).trim()
                        const cidade = asText(c.CIDADE).trim()
                        const uf = asText(c.ESTADO).trim()
                        const cnpj = asText(c.CNPJ || c.CHAVE).trim()
                        const nPedidos = pedidosCountMap.get(cod) ?? 0
                        const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
                        const isSelected = selectedCliente?.CODIGO === c.CODIGO
                        return (
                          <button key={cod} type="button" onClick={() => setSelectedCliente(c)}
                            className={`w-full text-left rounded-xl border px-3 py-2.5 transition-all flex items-center gap-3 ${isSelected ? 'border-orange-500/40 bg-orange-500/8' : 'border-[var(--th-border)] bg-[var(--th-card)] hover:border-orange-500/30 hover:bg-orange-500/5'}`}>
                            {/* Avatar */}
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${isSelected ? 'bg-orange-500/20 text-orange-400' : 'bg-[var(--th-subtle)] text-[var(--th-txt-3)]'}`}>
                              {initials || '?'}
                            </div>
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1.5 mb-0.5">
                                <p className="text-xs font-semibold text-[var(--th-txt-1)] truncate leading-snug">{displayName}</p>
                                {nPedidos > 0 && (
                                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${isSelected ? 'bg-orange-500/20 text-orange-400' : 'bg-[var(--th-subtle)] text-[var(--th-txt-4)]'}`}>{nPedidos}p</span>
                                )}
                              </div>
                              {subName && <p className="text-[10px] text-[var(--th-txt-4)] truncate leading-none mb-0.5">{subName}</p>}
                              <div className="flex items-center gap-2">
                                {cnpj && <span className="text-[10px] font-mono text-[var(--th-txt-4)] truncate">{cnpj}</span>}
                                {(cidade || uf) && !cnpj && <span className="text-[10px] text-[var(--th-txt-4)] truncate">{[cidade, uf].filter(Boolean).join(' · ')}</span>}
                                {(cidade || uf) && cnpj && <span className="text-[10px] text-[var(--th-txt-4)] shrink-0">{uf}</span>}
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                    {/* Footer count */}
                    <div className="px-4 py-2 border-t border-[var(--th-border)] text-[11px] text-[var(--th-txt-4)] flex justify-between">
                      <span>{filtered.length} de {clientesAll.length} clientes</span>
                      {(clientesQuery || clientesEstado) && (
                        <button type="button" onClick={() => { setClientesQuery(''); setClientesEstado('') }} className="text-orange-400 hover:underline">Limpar filtros</button>
                      )}
                    </div>
                  </div>

                  {/* Detail panel */}
                  <div className={`overflow-y-auto sm:flex-1 sm:p-6 ${selectedCliente ? 'fixed inset-0 top-[54px] z-40 bg-[var(--th-page)] p-4 sm:static sm:inset-auto sm:z-auto sm:bg-transparent' : 'hidden sm:block'}`}>
                    {!selectedCliente && (
                      <div className="flex flex-col items-center justify-center py-16 text-[var(--th-txt-4)]">
                        <Users strokeWidth={1} className="w-12 h-12 mb-3 opacity-30" />
                        <p className="text-sm">Selecione um cliente para ver detalhes</p>
                      </div>
                    )}
                    {selectedCliente && (() => {
                      const c = selectedCliente
                      const fantasia = asText(c.FANTASIA).trim()
                      const nomeRaw = asText(c.NOME).trim()
                      const displayName = fantasia || nomeRaw || '—'
                      const subName = fantasia && nomeRaw && fantasia !== nomeRaw ? nomeRaw : ''
                      const cnpj = asText(c.CNPJ || c.CHAVE).trim()
                      const endereco = [asText(c.ENDERECO), asText(c.NUMERO), asText(c.COMPL)].filter(Boolean).join(', ')
                      const cidade = asText(c.CIDADE).trim()
                      const uf = asText(c.ESTADO).trim()
                      const bairro = asText(c.BAIRRO).trim()
                      const cep = asText(c.CEP).trim()
                      const pedidosDoCliente = [...orders.filter(p => asText(p.CLIENTE).trim() === asText(c.CODIGO).trim())]
                        .sort((a, b) => asText(b.VENDA || b.PREVISAO).localeCompare(asText(a.VENDA || a.PREVISAO)))
                      const totalPares = pedidosDoCliente.reduce((s, p) => s + toNumber(p.TOTAL), 0)
                      const totalFaturados = pedidosDoCliente.reduce((s, p) => s + toNumber(p.FATURADOS), 0)
                      const emAberto = pedidosDoCliente.filter(p => toNumber(p.SALDO) > 0).length
                      const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
                      const mapsQuery = [endereco, bairro, cidade, uf, cep].filter(Boolean).join(', ')
                      return (
                        <div className="space-y-4 max-w-2xl">
                          <button className="sm:hidden flex items-center gap-1.5 text-sm text-[var(--th-txt-3)] hover:text-[var(--th-txt-1)] transition-colors py-1" onClick={() => setSelectedCliente(null)}>
                            <ChevronLeft className="w-4 h-4" />Voltar
                          </button>

                          {/* Header card */}
                          <div className="rounded-xl border border-[var(--th-border)] bg-[var(--th-card)] p-5">
                            <div className="flex items-start gap-4">
                              {/* Avatar */}
                              <div className="w-14 h-14 rounded-xl bg-orange-500/15 text-orange-400 flex items-center justify-center text-xl font-bold shrink-0 border border-orange-500/20">
                                {initials || '?'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h2 className="text-base font-bold text-[var(--th-txt-1)] leading-snug mb-0.5">{displayName}</h2>
                                {subName && <p className="text-xs text-[var(--th-txt-4)] mb-1.5 truncate">{subName}</p>}
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="inline-flex items-center gap-1 bg-[var(--th-subtle)] border border-[var(--th-border)] px-2 py-0.5 rounded text-[11px] font-mono text-[var(--th-txt-3)]">#{asText(c.CODIGO)}</span>
                                  {cnpj && <span className="inline-flex items-center gap-1 bg-[var(--th-subtle)] border border-[var(--th-border)] px-2 py-0.5 rounded text-[11px] font-mono text-[var(--th-txt-3)]">{cnpj}</span>}
                                  {uf && <span className="inline-flex items-center bg-[var(--th-subtle)] border border-[var(--th-border)] px-2 py-0.5 rounded text-[11px] text-[var(--th-txt-3)]">{uf}</span>}
                                </div>
                              </div>
                              <button type="button" onClick={() => setSelectedCliente(null)} className="p-1.5 rounded hover:bg-[var(--th-hover)] text-[var(--th-txt-4)] shrink-0">
                                <X strokeWidth={1.5} className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Stats strip */}
                            <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-[var(--th-border)]">
                              {[
                                { label: 'Pedidos', value: String(pedidosDoCliente.length) },
                                { label: 'Em aberto', value: String(emAberto), highlight: emAberto > 0 },
                                { label: 'Total pares', value: fmtNumber(totalPares) },
                                { label: 'Faturados', value: fmtNumber(totalFaturados) },
                              ].map(stat => (
                                <div key={stat.label} className="text-center">
                                  <p className={`text-sm font-bold font-mono ${stat.highlight ? 'text-orange-400' : 'text-[var(--th-txt-1)]'}`}>{stat.value}</p>
                                  <p className="text-[10px] text-[var(--th-txt-4)] mt-0.5">{stat.label}</p>
                                </div>
                              ))}
                            </div>

                            {/* Datas */}
                            {(asText(c.INCLUIDO) || asText(c.ATUALIZADO)) && (
                              <div className="flex gap-4 mt-3 pt-3 border-t border-[var(--th-border)]">
                                {asText(c.INCLUIDO) && <span className="text-[11px] text-[var(--th-txt-4)]">Incluído <span className="font-mono text-[var(--th-txt-3)]">{fmtDate(asText(c.INCLUIDO))}</span></span>}
                                {asText(c.ATUALIZADO) && <span className="text-[11px] text-[var(--th-txt-4)]">Atualizado <span className="font-mono text-[var(--th-txt-3)]">{fmtDate(asText(c.ATUALIZADO))}</span></span>}
                              </div>
                            )}
                          </div>

                          {/* Endereço */}
                          {(endereco || cidade || bairro || cep) && (
                            <div className="rounded-xl border border-[var(--th-border)] bg-[var(--th-card)] p-4">
                              <div className="flex items-center justify-between mb-3">
                                <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--th-txt-4)]">Endereço</p>
                                {mapsQuery && (
                                  <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[11px] text-[var(--th-txt-4)] hover:text-orange-400 transition-colors flex items-center gap-1"
                                    onClick={e => e.stopPropagation()}
                                  >
                                    <MapPin strokeWidth={1.5} className="w-3 h-3" />
                                    Ver no Maps
                                  </a>
                                )}
                              </div>
                              <div className="space-y-1 text-sm">
                                {endereco && <p className="text-[var(--th-txt-2)]">{endereco}</p>}
                                {(bairro || cidade || uf) && (
                                  <p className="text-[var(--th-txt-3)] text-xs">{[bairro, cidade, uf].filter(Boolean).join(' · ')}</p>
                                )}
                                {cep && <p className="text-[var(--th-txt-4)] font-mono text-[11px]">CEP {cep}</p>}
                              </div>
                            </div>
                          )}

                          {/* Histórico de pedidos */}
                          <div className="rounded-xl border border-[var(--th-border)] bg-[var(--th-card)] overflow-hidden">
                            <div className="px-4 py-2.5 bg-[var(--th-subtle)] border-b border-[var(--th-border)] flex items-center justify-between">
                              <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--th-txt-4)]">Pedidos</p>
                              <span className="text-[11px] text-[var(--th-txt-4)]">{pedidosDoCliente.length}</span>
                            </div>
                            {pedidosDoCliente.length === 0
                              ? <p className="px-4 py-8 text-sm text-center text-[var(--th-txt-3)]">Nenhum pedido encontrado.</p>
                              : <div className="divide-y divide-[var(--th-border)]">
                                  {pedidosDoCliente.map(p => {
                                    const saldo = toNumber(p.SALDO)
                                    const total = toNumber(p.TOTAL)
                                    const faturados = toNumber(p.FATURADOS)
                                    const pct = total > 0 ? Math.round(((total - saldo) / total) * 100) : 0
                                    const nTaloes = (taloesByPedido.get(asText(p.CODIGO).trim()) ?? []).length
                                    const isFinalizado = saldo === 0 && total > 0
                                    return (
                                      <div key={asText(p.CODIGO)} className="px-4 py-3 hover:bg-[var(--th-hover)] transition-colors">
                                        <div className="flex items-start justify-between gap-3 mb-1.5">
                                          <div className="flex items-center gap-2 min-w-0">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const pNode = pedidoTree.find(n => asText(n.pedido.CODIGO).trim() === asText(p.CODIGO).trim())
                                                if (pNode) { setSelectedPedidoDetail(pNode); setSelectedModule('orders') }
                                              }}
                                              className="font-mono font-bold text-sm text-[var(--th-txt-1)] hover:text-orange-400 transition-colors shrink-0"
                                            >{asText(p.CODIGO)}</button>
                                            {asText(p.NOME) && <span className="text-xs text-[var(--th-txt-4)] truncate">{asText(p.NOME)}</span>}
                                          </div>
                                          <div className="flex items-center gap-1.5 shrink-0">
                                            {isFinalizado
                                              ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">Finalizado</span>
                                              : <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/20">Em aberto</span>
                                            }
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-3 text-[11px] text-[var(--th-txt-4)] mb-2 flex-wrap">
                                          {asText(p.VENDA) && <span>Pedido <span className="font-mono text-[var(--th-txt-2)]">{fmtDate(asText(p.VENDA))}</span></span>}
                                          {asText(p.PREVISAO) && <span>Prev. <span className="font-mono text-[var(--th-txt-2)]">{fmtDate(asText(p.PREVISAO))}</span></span>}
                                          <span className="font-mono text-[var(--th-txt-2)]">{fmtNumber(total)} pares</span>
                                          {faturados > 0 && <span>Fat. <span className="font-mono text-[var(--th-txt-2)]">{fmtNumber(faturados)}</span></span>}
                                          {saldo > 0 && <span>Saldo <span className="font-mono text-orange-400">{fmtNumber(saldo)}</span></span>}
                                          {nTaloes > 0 && <span>{nTaloes} talão{nTaloes !== 1 ? 'ões' : ''}</span>}
                                        </div>
                                        {total > 0 && (
                                          <div className="h-1 rounded-full bg-[var(--th-border)] overflow-hidden">
                                            <div className={`h-full rounded-full transition-all ${isFinalizado ? 'bg-green-500' : 'bg-orange-500'}`} style={{ width: `${pct}%` }} />
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                            }
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                </div>
              )
            })()}

            {/* DATABASE MODULE */}
            {selectedModule === 'database' && (
              <div className="max-w-xl space-y-5">
                <div>
                  <h1 className="text-xl font-bold text-[var(--th-txt-1)] mb-1">Banco de Dados</h1>
                  <p className="text-sm text-[var(--th-txt-3)] mb-6">Ômega ERP → SE Link → Supabase</p>
                </div>

                {/* Sync card (status + force) */}
                <div className="rounded-xl border border-[var(--th-border)] bg-[var(--th-card)] overflow-hidden">
                  {/* Header: SE Link + badge + refresh */}
                  <div className="px-5 py-3 flex items-center justify-between gap-4 border-b border-[var(--th-border)]">
                    <div className="flex items-center gap-2.5">
                      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--th-txt-1)]">SE Link</p>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${
                        seLinkOnline === true  ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                        seLinkOnline === false ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        'bg-[var(--th-subtle)] text-[var(--th-txt-4)] border-[var(--th-border)]'
                      }`}>
                        <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 mb-px align-middle ${
                          seLinkOnline === true  ? 'bg-green-400 shadow-[0_0_4px_1px_rgba(74,222,128,0.6)]' :
                          seLinkOnline === false ? 'bg-red-400' : 'bg-[var(--th-txt-4)]'
                        }`} />
                        {seLinkOnline === true ? 'Online' : seLinkOnline === false ? 'Offline' : '—'}
                      </span>
                    </div>
                    <button type="button" onClick={() => void fetchLastSync()}
                      className="p-1.5 rounded hover:bg-[var(--th-hover)] text-[var(--th-txt-4)] shrink-0">
                      <RefreshCw strokeWidth={1.5} className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {/* Body */}
                  <div className="px-5 py-4 space-y-4">
                    {/* Última sync */}
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--th-txt-4)] mb-1">Última Sincronização</p>
                      <p className="text-sm font-mono text-[var(--th-txt-1)]">{lastSyncTime ?? '—'}</p>
                    </div>
                    {/* Force sync */}
                    <div className="space-y-3">
                      <p className="text-xs text-[var(--th-txt-3)] leading-relaxed">
                        Solicita ao SE Link que execute uma sincronização completa dos arquivos DBF agora. O SE Link irá detectar a solicitação via Realtime instantaneamente.
                      </p>
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => void requestForceSync()}
                          disabled={forceSyncLoading || forceSyncStatus === 'waiting'}
                          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-semibold transition-colors">
                          <RefreshCw strokeWidth={2} className={`w-3.5 h-3.5 ${forceSyncLoading || forceSyncStatus === 'waiting' ? 'animate-spin' : ''}`} />
                          {forceSyncLoading ? 'Solicitando...' : forceSyncStatus === 'waiting' ? 'Aguardando SE Link...' : 'Forçar Sincronização'}
                        </button>
                        {forceSyncStatus === 'done' && (
                          <span className="inline-flex items-center gap-1.5 text-xs text-green-400">
                            <Check strokeWidth={2} className="w-3.5 h-3.5" /> Sincronizado!
                          </span>
                        )}
                        {forceSyncStatus === 'error' && (
                          <span className="text-xs text-red-400">{forceSyncError}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sync config */}
                <div className="rounded-xl border border-[var(--th-border)] bg-[var(--th-card)] overflow-hidden">
                  <div className="px-5 py-3 flex items-center justify-between gap-4 border-b border-[var(--th-border)]">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--th-txt-1)]">Tabelas Sincronizadas</p>
                      <p className="text-[11px] text-[var(--th-txt-4)] mt-0.5">Ative ou desative quais DBFs o SE Link deve sincronizar</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {syncConfigSavedToggles && (
                        <button type="button" onClick={() => void restoreSyncSelection()}
                          className="px-2.5 py-1 rounded text-[11px] font-medium border border-orange-500/30 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 transition-colors">
                          Restaurar
                        </button>
                      )}
                      <button type="button" onClick={() => void clearSyncSelection()}
                        disabled={Object.values(syncConfigToggles).every(v => !v)}
                        className="px-2.5 py-1 rounded text-[11px] font-medium border border-[var(--th-border)] text-[var(--th-txt-4)] hover:text-red-400 hover:border-red-500/30 disabled:opacity-30 transition-colors">
                        Limpar seleção
                      </button>
                      <button type="button" onClick={() => void fetchSyncConfig()}
                        className="p-1.5 rounded hover:bg-[var(--th-hover)] text-[var(--th-txt-4)]">
                        <RefreshCw strokeWidth={1.5} className={`w-3.5 h-3.5 ${syncConfigLoading ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </div>
                  {/* Search + filter */}
                  <div className="px-4 py-2.5 border-b border-[var(--th-border)]">
                    <div className="relative">
                      <Search strokeWidth={1.5} className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--th-txt-4)]" />
                      <input
                        type="text"
                        value={syncConfigSearch}
                        onChange={e => setSyncConfigSearch(e.target.value)}
                        placeholder="Buscar tabela..."
                        className="w-full rounded-lg border border-[var(--th-border)] bg-transparent pl-8 pr-7 py-1.5 text-xs text-[var(--th-txt-1)] placeholder:text-[var(--th-txt-4)] focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                      />
                      {syncConfigSearch && (
                        <button type="button" onClick={() => setSyncConfigSearch('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--th-txt-4)] hover:text-[var(--th-txt-1)]">
                          <X strokeWidth={2} className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <div className="flex gap-1 mt-2">
                      {([{ key: 'all', label: 'Todos' }, { key: 'active', label: 'Ativos' }] as const).map(({ key, label }) => (
                        <button key={key} type="button" onClick={() => setSyncConfigFilter(key)}
                          className={`text-[11px] px-2.5 py-1 rounded-full border font-medium transition-all ${
                            syncConfigFilter === key
                              ? 'bg-orange-500/15 text-orange-400 border-orange-500/30'
                              : 'bg-[var(--th-subtle)] text-[var(--th-txt-4)] border-[var(--th-border)] hover:text-[var(--th-txt-1)]'
                          }`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="divide-y divide-[var(--th-border)] max-h-64 overflow-y-auto">
                    {syncConfig.length === 0 && !syncConfigLoading && (
                      <p className="px-5 py-4 text-sm text-[var(--th-txt-4)]">Inicie o SE Link para descobrir os DBFs disponíveis.</p>
                    )}
                    {syncConfig
                      .filter(row => {
                        const matchSearch = row.dbf_name.toLowerCase().includes(syncConfigSearch.toLowerCase())
                        const matchFilter = syncConfigFilter === 'all' || (syncConfigToggles[row.dbf_name] ?? row.enabled)
                        return matchSearch && matchFilter
                      })
                      .map(row => {
                      const on = syncConfigToggles[row.dbf_name] ?? row.enabled
                      const isDiscovered = row.discovered
                      return (
                        <div key={row.dbf_name} className="flex items-center gap-3 px-5 py-3">
                          {/* Toggle */}
                          <button
                            type="button"
                            onClick={() => void toggleSyncConfig(row.dbf_name, !on)}
                            className={`relative shrink-0 w-9 h-5 rounded-full transition-colors ${on ? 'bg-orange-500' : 'bg-[var(--th-border)]'}`}
                          >
                            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4' : 'translate-x-0'}`} />
                          </button>
                          {/* DBF name */}
                          <span className="font-mono text-sm text-[var(--th-txt-1)] w-28 shrink-0">{row.dbf_name}.dbf</span>
                          {/* Arrow */}
                          <span className="text-[var(--th-txt-4)] text-xs shrink-0">→</span>
                          {/* Table name */}
                          <span className="font-mono text-xs text-[var(--th-txt-3)] flex-1">{row.table_name ?? <span className="italic text-[var(--th-txt-4)]">não configurado</span>}</span>
                          {/* Badges */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isDiscovered ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded border border-green-500/20 bg-green-500/10 text-green-400">Encontrado</span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--th-border)] bg-[var(--th-subtle)] text-[var(--th-txt-4)]">Não detectado</span>
                            )}
                            {!row.pk_field && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded border border-amber-500/20 bg-amber-500/10 text-amber-400">PK composta</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    {syncConfig.length > 0 && syncConfig.filter(row => {
                        const matchSearch = row.dbf_name.toLowerCase().includes(syncConfigSearch.toLowerCase())
                        const matchFilter = syncConfigFilter === 'all' || (syncConfigToggles[row.dbf_name] ?? row.enabled)
                        return matchSearch && matchFilter
                      }).length === 0 && (
                      <p className="px-5 py-4 text-sm text-[var(--th-txt-4)]">
                        {syncConfigFilter === 'active' && !syncConfigSearch ? 'Nenhuma tabela ativa.' : `Nenhuma tabela encontrada para "${syncConfigSearch}".`}
                      </p>
                    )}
                  </div>
                </div>

                {/* SE Link logs */}
                <div className="rounded-xl border border-[var(--th-border)] bg-[var(--th-card)] overflow-hidden">
                  <div className="px-5 py-3 flex items-center justify-between gap-4 border-b border-[var(--th-border)]">
                    <p className="text-xs font-semibold uppercase tracking-widest text-[var(--th-txt-4)]">Console do SE Link</p>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => void fetchSeLinkLogs()}
                        className="p-1.5 rounded hover:bg-[var(--th-hover)] text-[var(--th-txt-4)]">
                        <RefreshCw strokeWidth={1.5} className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => void clearSeLinkLogs()} disabled={seLinkLogsClearing || seLinkLogs.length === 0}
                        className="px-2.5 py-1 rounded text-[11px] font-medium border border-[var(--th-border)] text-[var(--th-txt-4)] hover:text-red-400 hover:border-red-500/30 disabled:opacity-40 transition-colors">
                        {seLinkLogsClearing ? 'Limpando...' : 'Limpar'}
                      </button>
                    </div>
                  </div>
                  {/* Level filter */}
                  <div className="px-4 py-2 border-b border-[var(--th-border)] flex gap-1">
                    {([
                      { key: 'ALL',     label: 'Todos' },
                      { key: 'INFO',    label: 'Info' },
                      { key: 'WARNING', label: 'Warning' },
                      { key: 'ERROR',   label: 'Error' },
                    ] as const).map(({ key, label }) => (
                      <button key={key} type="button" onClick={() => setSeLinkLogsFilter(key)}
                        className={`text-[11px] px-2.5 py-1 rounded-full border font-medium transition-all ${
                          seLinkLogsFilter === key
                            ? key === 'ERROR'   ? 'bg-red-500/15 text-red-400 border-red-500/30'
                            : key === 'WARNING' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            : key === 'INFO'    ? 'bg-green-500/15 text-green-400 border-green-500/30'
                            :                    'bg-orange-500/15 text-orange-400 border-orange-500/30'
                            : 'bg-[var(--th-subtle)] text-[var(--th-txt-4)] border-[var(--th-border)] hover:text-[var(--th-txt-1)]'
                        }`}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="h-64 overflow-y-auto font-mono text-[11px] leading-relaxed">
                    {seLinkLogs.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-[var(--th-txt-4)]">
                        Nenhum log. Inicie o SE Link para ver o console aqui.
                      </div>
                    ) : (
                      <div className="p-3 space-y-0.5">
                        {seLinkLogs
                          .filter(log => seLinkLogsFilter === 'ALL' || log.level === seLinkLogsFilter)
                          .map(log => {
                            const t = new Date(log.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                            const levelColor =
                              log.level === 'ERROR'   ? 'text-red-400' :
                              log.level === 'WARNING' ? 'text-amber-400' :
                              'text-green-400'
                            return (
                              <div key={log.id} className="flex gap-2 py-0.5">
                                <span className="shrink-0 text-[var(--th-txt-4)] opacity-60">{t}</span>
                                <span className={`shrink-0 w-14 ${levelColor}`}>{log.level}</span>
                                <span className="text-[var(--th-txt-2)] break-all">{log.message}</span>
                              </div>
                            )
                          })}
                        <div ref={logsEndRef} />
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* OTHER MODULES */}
            {selectedModule !== 'dashboard' && selectedModule !== 'database' && selectedModule !== 'clients' && (
              <div className="flex flex-col items-center justify-center h-full text-[var(--th-txt-4)]">
                <Package strokeWidth={1} className="w-14 h-14 mb-4 opacity-30" />
                <p className="text-base font-medium text-[var(--th-txt-3)] mb-1">Módulo em desenvolvimento</p>
                <p className="text-sm capitalize">{selectedModule}</p>
              </div>
            )}

          </div>
        )}

      </div>
    </div>

    {/* ── Barcode scanner overlay (mobile only) ────────────────────────────── */}
    {scannerOpen && (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-black/90 border-b border-white/10 shrink-0 z-10">
          <div className="flex items-center gap-2">
            <ScanLine strokeWidth={1.5} className="w-4 h-4 text-[#FF8C00]" />
            <span className="text-sm font-semibold text-white">Escanear Talão</span>
          </div>
          <button type="button" onClick={() => { setScannerOpen(false); setScannerError(null) }}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
            <X strokeWidth={2} className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Camera feed */}
        <div className="relative flex-1 overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
            autoPlay
          />

          {/* Status badge - discrete overlay on top */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md text-xs font-medium shadow-lg ${
              scannerStatus === 'loading' ? 'bg-black/60 text-white/80' :
              scannerStatus === 'error' ? 'bg-red-900/70 text-red-200' :
              scannerError ? 'bg-red-900/70 text-red-200' :
              lastScannedCode ? 'bg-green-900/70 text-green-200' :
              'bg-black/60 text-white/70'
            }`}>
              {scannerStatus === 'loading' && (
                <><div className="w-2 h-2 border border-white/40 border-t-[#FF8C00] rounded-full animate-spin" /><span>Iniciando...</span></>
              )}
              {scannerStatus === 'error' && (
                <><div className="w-1.5 h-1.5 rounded-full bg-red-400" /><span>{scannerError || 'Erro'}</span></>
              )}
              {scannerStatus === 'scanning' && scannerError && (
                <><div className="w-1.5 h-1.5 rounded-full bg-red-400" /><span>{scannerError}</span></>
              )}
              {scannerStatus === 'scanning' && !scannerError && !lastScannedCode && (
                <><div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /><span>Pronto</span></>
              )}
              {scannerStatus === 'scanning' && !scannerError && lastScannedCode && (
                <><div className="w-1.5 h-1.5 rounded-full bg-green-400" /><span>Lido: {lastScannedCode} ({lastScannedFormat})</span></>
              )}
            </div>
          </div>

          {/* Black mask with rounded barcode cutout */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" preserveAspectRatio="none" viewBox="0 0 100 100">
            <defs>
              <mask id="barcode-cutout">
                <rect width="100" height="100" fill="white" />
                <rect x="15" y="35" width="70" height="30" rx="3" ry="3" fill="black" />
              </mask>
            </defs>
            <rect width="100" height="100" fill="rgba(0,0,0,0.75)" mask="url(#barcode-cutout)" />
          </svg>

          {/* Cutout border glow */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="relative" style={{ width: '70%', height: '30%' }}>
              {/* Rounded border */}
              <div className="absolute inset-0 rounded-xl border-2 border-[#FF8C00]/60" />
              {/* Corner accents */}
              <span className="absolute -top-px -left-px w-8 h-8 border-t-[3px] border-l-[3px] border-[#FF8C00] rounded-tl-xl" />
              <span className="absolute -top-px -right-px w-8 h-8 border-t-[3px] border-r-[3px] border-[#FF8C00] rounded-tr-xl" />
              <span className="absolute -bottom-px -left-px w-8 h-8 border-b-[3px] border-l-[3px] border-[#FF8C00] rounded-bl-xl" />
              <span className="absolute -bottom-px -right-px w-8 h-8 border-b-[3px] border-r-[3px] border-[#FF8C00] rounded-br-xl" />
              {/* Animated scan line */}
              <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-[#FF8C00] to-transparent"
                style={{ top: '50%', animation: 'scanPulse 2s ease-in-out infinite' }} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-4 py-2.5 bg-black/90 border-t border-white/10 flex items-center justify-center z-10">
          <p className="text-center text-xs text-white/30">Posicione o código de barras no centro</p>
        </div>

        <style>{`
          @keyframes scanPulse {
            0%, 100% { opacity: 0.3; transform: translateY(-8px); }
            50% { opacity: 1; transform: translateY(8px); }
          }
        `}</style>
      </div>
    )}
    </>
  )
}
