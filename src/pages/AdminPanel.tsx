import React, { useState, useEffect, useMemo } from 'react'
import {
  Sun, Moon, LogOut, Settings, Users, Database, Package, Home, Box,
  ScrollText, RefreshCw, Search, ChevronDown, ChevronUp,
  GitBranch, Plus, X, Check, Monitor, Smartphone, ScanLine, Trash2, Pencil,
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
    <p className="px-3 pt-5 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--th-txt-4)]">
      {label}
    </p>
  )
}

// ── Interfaces ────────────────────────────────────────────────────────────────

interface PedidoRow {
  [key: string]: unknown
  CODIGO?: string; NOME?: string; CLIENTE?: string; PREVISAO?: string; VENDA?: string
  SALDO?: number | string | null; TOTAL?: number | string | null
  PRODUCAO?: number | string | null; FATURADOS?: number | string | null
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
interface FichaRow { [key: string]: unknown; CODIGO?: string; NOME?: string }

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
  const [totalOrders, setTotalOrders] = useState<number | null>(null)
  const [orders, setOrders] = useState<PedidoRow[]>([])
  const [taloes, setTaloes] = useState<TalaoRow[]>([])
  const [talsetor, setTalsetor] = useState<TalsetorRow[]>([])
  const [clientes, setClientes] = useState<ClienteRow[]>([])
  const [fichas, setFichas] = useState<FichaRow[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersError, setOrdersError] = useState<string | null>(null)
  const [ordersQuery, setOrdersQuery] = useState('')
  const [remessasQuery, setRemessasQuery] = useState('')
  const [ordersLastSync, setOrdersLastSync] = useState<Date | null>(null)
  const [selectedPedidoDetail, setSelectedPedidoDetail] = useState<PedidoNode | null>(null)
  const [selectedRemessaDetail, setSelectedRemessaDetail] = useState<RemessaTreeNode | null>(null)

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
  const forceSyncPollRef = React.useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Scanner state ─────────────────────────────────────────────────────────
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scannerError, setScannerError] = useState<string | null>(null)
  const videoRef = React.useRef<HTMLVideoElement | null>(null)
  const scannerControlsRef = React.useRef<{ stop: () => void } | null>(null)
  const onScanRef = React.useRef<((code: string) => void) | null>(null)
  const lastScanRef = React.useRef<{ code: string; time: number }>({ code: '', time: 0 })

  async function fetchLastSync() {
    try {
      const { data } = await supabase.from('sync_log').select('ultima_sync').eq('id', 1).single()
      if (data?.ultima_sync) {
        const d = new Date(data.ultima_sync as string)
        setLastSyncTime(d.toLocaleString('pt-BR', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit', second: '2-digit',
        }))
      }
      return null
    } catch { return null }
  }

  async function fetchSyncFlags() {
    try {
      const { data } = await supabase.from('sync_log').select('ultima_sync, force_sync').eq('id', 1).single()
      if (data?.ultima_sync) {
        const d = new Date(data.ultima_sync as string)
        setLastSyncTime(d.toLocaleString('pt-BR', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit', second: '2-digit',
        }))
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

  useEffect(() => {
    if (selectedModule === 'database') void fetchLastSync()
    return () => {
      if (forceSyncPollRef.current) clearInterval(forceSyncPollRef.current)
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

  async function fetchTableRows<T extends Record<string, unknown>>(tableName: string): Promise<T[]> {
    const PAGE = 1000; let from = 0; const allRows: T[] = []
    while (true) {
      const { data, error } = await supabase.from(tableName).select('*').range(from, from + PAGE - 1)
      if (error) throw new Error(error.message)
      if (!data || data.length === 0) break
      allRows.push(...(data as T[]))
      if (data.length < PAGE) break
      from += PAGE
    }
    return allRows
  }

  async function fetchAllOrders() {
    setOrdersLoading(true); setOrdersError(null)
    try {
      const [pedidosRows, taloesRows, talsetorRows, clientesRows, fichasRows] = await Promise.all([
        fetchTableRows<PedidoRow>('pedidos'), fetchTableRows<TalaoRow>('taloes'),
        fetchTableRows<TalsetorRow>('talsetor'), fetchTableRows<ClienteRow>('clientes'),
        fetchTableRows<FichaRow>('fichas'),
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
    if (selectedModule === 'sectors') void fetchProdItems()
  }, [selectedModule])

  useEffect(() => {
    if (selectedModule !== 'logs') return
    void fetchLogs()
  }, [selectedModule])

  // ── Production Flow operations ────────────────────────────────────────────

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
    lastScanRef.current = { code: '', time: 0 }
    let cancelled = false

    const timer = setTimeout(async () => {
      if (cancelled || !videoRef.current) return
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        if (cancelled) return
        const reader = new BrowserMultiFormatReader()
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: 'environment' } },
          videoRef.current,
          (result, _err) => { if (!cancelled && result) onScanRef.current?.(result.getText()) }
        )
        if (!cancelled) scannerControlsRef.current = controls
        else controls.stop()
      } catch (err) {
        if (!cancelled) setScannerError(err instanceof Error ? err.message : 'Não foi possível acessar a câmera.')
      }
    }, 200)

    return () => {
      cancelled = true
      clearTimeout(timer)
      scannerControlsRef.current?.stop()
      scannerControlsRef.current = null
    }
  }, [scannerOpen])

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
    <div className="flex h-screen overflow-hidden bg-[var(--th-page)] text-[var(--th-txt-1)]">

      {/* ── Sidebar ── */}
      <aside className="w-[230px] shrink-0 border-r border-[var(--th-border)] flex flex-col bg-[var(--th-card)]">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-[var(--th-border)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FF8C00] flex items-center justify-center shrink-0">
              <span className="text-white text-[13px] font-bold leading-none">S</span>
            </div>
            <div>
              <p className="text-[13px] font-bold text-[var(--th-txt-1)] leading-none">Simple&amp;Eco</p>
              <p className="text-[10px] text-[var(--th-txt-4)] leading-none mt-0.5">Painel Admin</p>
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
        <div className="px-3 py-3 border-t border-[var(--th-border)] shrink-0 space-y-0.5">
          <button onClick={toggleTheme} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--th-txt-3)] hover:bg-[var(--th-hover)] hover:text-[var(--th-txt-1)] transition-all">
            {isDark ? <Sun strokeWidth={1.5} className="w-4 h-4 shrink-0" /> : <Moon strokeWidth={1.5} className="w-4 h-4 shrink-0" />}
            <span>{isDark ? 'Modo Claro' : 'Modo Escuro'}</span>
          </button>
          <button onClick={() => { void handleLogout() }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--th-txt-3)] hover:bg-red-500/10 hover:text-red-400 transition-all">
            <LogOut strokeWidth={1.5} className="w-4 h-4 shrink-0" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── ORDERS ── */}
        {selectedModule === 'orders' && (
          <>
            {/* List panel */}
            <div className="w-[300px] shrink-0 border-r border-[var(--th-border)] flex flex-col bg-[var(--th-card)]">
              <div className="px-4 py-4 border-b border-[var(--th-border)] shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <select
                        value={ordersSubTab}
                        onChange={e => setOrdersSubTab(e.target.value as 'pedidos' | 'remessas')}
                        className="appearance-none pl-2.5 pr-6 py-1 rounded-lg border border-[var(--th-border)] bg-[var(--th-card)] text-sm font-semibold text-[var(--th-txt-1)] focus:outline-none focus:ring-2 focus:ring-orange-500/40 cursor-pointer"
                      >
                        <option value="pedidos">Pedidos</option>
                        <option value="remessas">Remessas</option>
                      </select>
                      <ChevronDown strokeWidth={2} className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 text-[var(--th-txt-4)] pointer-events-none" />
                    </div>
                    <span className="text-xs bg-[var(--th-subtle)] px-2 py-0.5 rounded-full text-[var(--th-txt-4)]">
                      {ordersSubTab === 'pedidos' ? filteredOrders.length : remessaTree.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button type="button" onClick={() => setScannerOpen(true)} title="Escanear código de barras"
                      className="p-1.5 rounded text-[var(--th-txt-4)] hover:bg-[var(--th-hover)] transition-colors md:hidden">
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
                    className="w-full rounded-lg border border-[var(--th-border)] bg-[var(--th-subtle)] pl-8 pr-3 py-1.5 text-[13px] text-[var(--th-txt-1)] placeholder:text-[var(--th-txt-4)] focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                  />
                </div>
                {ordersLastSync && (
                  <p className="text-[10px] text-[var(--th-txt-4)] mt-1.5 text-right">
                    Sync {ordersLastSync.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </p>
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
                {ordersSubTab === 'pedidos' && pedidoTree.map(pNode => {
                  const pc = asText(pNode.pedido.CODIGO).trim() || 'SEM-CODIGO'
                  const cli = cliMap.get(asText(pNode.pedido.CLIENTE).trim())
                  const cliNome = asText(cli?.FANTASIA || cli?.NOME) || asText(pNode.pedido.CLIENTE) || '—'
                  const saldo = toNumber(pNode.pedido.SALDO)
                  const isSelected = selectedPedidoDetail?.pedido.CODIGO === pNode.pedido.CODIGO
                  return (
                    <button
                      key={pc}
                      type="button"
                      onClick={() => setSelectedPedidoDetail(pNode)}
                      className={isSelected ? 'w-full text-left rounded-xl border border-orange-500/40 bg-orange-500/8 px-4 py-3 transition-all' : 'w-full text-left rounded-xl border border-[var(--th-border)] bg-[var(--th-card)] px-4 py-3 transition-all hover:border-orange-500/30 hover:bg-orange-500/5'}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <span className="text-[13px] font-medium text-[var(--th-txt-1)] truncate">{cliNome}</span>
                            <span className="text-[11px] text-[var(--th-txt-4)] shrink-0">{fmtDate(pNode.pedido.PREVISAO)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[11px] font-mono text-[var(--th-txt-3)]">{pc}</span>
                            {saldo === 0
                              ? <span className="text-[10px] px-1 py-px rounded bg-green-500/15 text-green-400 border border-green-500/20">Finalizado</span>
                              : <span className="text-[10px] px-1 py-px rounded bg-orange-500/15 text-orange-400 border border-orange-500/20">Saldo {fmtNumber(saldo)}</span>
                            }
                          </div>
                          <p className="text-[11px] text-[var(--th-txt-4)] truncate">{pNode.taloes.length} talão(ões)</p>
                        </div>
                      </div>
                    </button>
                  )
                })}

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
                            <span className="text-[10px] px-1 py-px rounded bg-[var(--th-subtle)] text-[var(--th-txt-4)] border border-[var(--th-border)]">{rNode.taloes.length} talões</span>
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
            <div className="flex-1 overflow-y-auto p-5">

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

                return (
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 pb-4 border-b border-[var(--th-border)]">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3 flex-wrap mb-1">
                          <button
                            type="button"
                            onClick={() => {
                              const cliRow = cliMap.get(asText(pNode.pedido.CLIENTE).trim())
                              if (cliRow) { setSelectedCliente(cliRow); setSelectedModule('clients') }
                            }}
                            className="text-lg font-bold text-[var(--th-txt-1)] hover:text-orange-400 hover:underline transition-colors text-left"
                          >{cliNome}</button>
                          {saldo === 0
                            ? <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border bg-green-500/15 text-green-400 border-green-500/30">Finalizado</span>
                            : <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border bg-orange-500/15 text-orange-400 border-orange-500/30">Saldo {fmtNumber(saldo)}</span>
                          }
                        </div>
                        <div className="flex items-center gap-4 text-xs text-[var(--th-txt-4)] flex-wrap">
                          <span>Pedido <span className="font-mono text-[var(--th-txt-2)]">{pc}</span></span>
                          <span>Previsão <span className="text-[var(--th-txt-2)]">{fmtDate(pNode.pedido.PREVISAO)}</span></span>
                          <span>{pNode.taloes.length} talão(ões)</span>
                        </div>
                        {produtosDistintos.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {produtosDistintos.map(([ref, nome]) => (
                              <span key={ref} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs border bg-[var(--th-subtle)] border-[var(--th-border)]">
                                <span className="font-mono text-[var(--th-txt-4)]">{ref}</span>
                                <span className="text-[var(--th-txt-2)]">{nome !== ref ? nome : ''}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button type="button" onClick={() => setSelectedPedidoDetail(null)} className="p-1.5 rounded hover:bg-[var(--th-hover)] text-[var(--th-txt-4)] shrink-0">
                        <X strokeWidth={1.5} className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Grade agregada do pedido */}
                    {gradeAgregada.length > 0 && (
                      <div className="rounded-xl border border-[var(--th-border)] bg-[var(--th-card)] overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-[var(--th-border)] bg-[var(--th-subtle)] flex items-center justify-between">
                          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--th-txt-4)]">Grade do Pedido</p>
                          <p className="text-[10px] text-[var(--th-txt-4)]">
                            Total: <span className="font-mono font-bold text-orange-400">{gradeAgregada.reduce((s, x) => s + x.qty, 0).toLocaleString('pt-BR')}</span> pares
                          </p>
                        </div>
                        <div className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            {gradeAgregada.map(({ slot, qty }) => (
                              <div key={slot} className="flex flex-col items-center rounded-lg border border-[var(--th-border)] bg-[var(--th-subtle)] overflow-hidden" style={{ minWidth: 44 }}>
                                <span className="px-2 py-1.5 text-[11px] font-bold font-mono text-[var(--th-txt-2)] text-center w-full leading-none">{slot}</span>
                                <div className="w-full border-t border-[var(--th-border)]" />
                                <span className="px-2 py-1.5 text-sm font-bold font-mono text-orange-400 text-center w-full leading-none">{qty}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Talões */}
                    {pNode.taloes.length === 0 && (
                      <p className="text-sm text-center text-[var(--th-txt-3)] py-8">Sem talões para este pedido.</p>
                    )}
                    <div className="flex flex-col gap-3">
                      {pNode.taloes.map(tNode => {
                        const tc = asText(tNode.talao.CODIGO).trim() || '—'
                        const fc = asText(tNode.talao.REFERENCIA).trim()
                        const fn = asText(fichaMap.get(fc)?.NOME) || '—'
                        const canc = isTruthy(tNode.talao.CANCELADO)
                        const fat = isTruthy(tNode.talao.FATURADO)
                        const grade = parseNumeros(tNode.talao.NUMEROS)
                        const statusBorder = canc ? 'border-red-500/25' : fat ? 'border-green-500/25' : 'border-[var(--th-border)]'
                        const statusBar = canc ? 'bg-red-500' : fat ? 'bg-green-500' : 'bg-orange-500'
                        return (
                          <div key={tc} className={`rounded-xl border ${statusBorder} bg-[var(--th-card)] overflow-hidden`}>
                            {/* Header */}
                            <div className="flex items-stretch gap-0">
                              {/* Status accent bar */}
                              <div className={`w-1 shrink-0 ${statusBar} opacity-60`} />
                              <div className="flex-1 flex items-center justify-between gap-4 px-4 py-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                                    <span className="font-mono font-bold text-base text-[var(--th-txt-1)] tracking-wide">{tc}</span>
                                    {canc
                                      ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border bg-red-500/15 text-red-400 border-red-500/30">Cancelado</span>
                                      : fat
                                        ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border bg-green-500/15 text-green-400 border-green-500/30">Faturado</span>
                                        : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border bg-orange-500/15 text-orange-400 border-orange-500/30">Em produção</span>
                                    }
                                  </div>
                                  <p className="text-xs text-[var(--th-txt-3)] truncate max-w-[320px]">{fn}</p>
                                </div>
                                <div className="shrink-0 text-right">
                                  <p className="text-[10px] text-[var(--th-txt-4)] mb-0.5 uppercase tracking-widest">Total</p>
                                  <p className="text-lg font-bold font-mono text-orange-400 leading-none">{fmtNumber(tNode.talao.TOTAL)}</p>
                                </div>
                              </div>
                            </div>
                            {/* Meta strip */}
                            <div className="flex gap-4 px-4 py-1.5 bg-[var(--th-subtle)] border-t border-[var(--th-border)] flex-wrap">
                              <span className="text-[11px] text-[var(--th-txt-4)]">Item <span className="font-mono text-[var(--th-txt-2)]">{asText(tNode.talao.ITEM) || '—'}</span></span>
                              <span className="text-[11px] text-[var(--th-txt-4)]">Ref <span className="font-mono text-[var(--th-txt-2)]">{fc || '—'}</span></span>
                              <span className="text-[11px] text-[var(--th-txt-4)]">Remessa <span className="font-mono text-[var(--th-txt-2)]">{asText(tNode.talao.REMESSA) || '—'}</span></span>
                            </div>
                            {/* Grade */}
                            {grade.length > 0 && (
                              <div className="px-4 py-3 border-t border-[var(--th-border)]">
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
                            <th className="px-3 py-2 text-left text-[10px] font-medium text-[var(--th-txt-4)] uppercase tracking-widest">Talão</th>
                            <th className="px-3 py-2 text-left text-[10px] font-medium text-[var(--th-txt-4)] uppercase tracking-widest">Pedido</th>
                            <th className="px-3 py-2 text-left text-[10px] font-medium text-[var(--th-txt-4)] uppercase tracking-widest">Item</th>
                            <th className="px-3 py-2 text-left text-[10px] font-medium text-[var(--th-txt-4)] uppercase tracking-widest">Produto</th>
                            <th className="px-3 py-2 text-left text-[10px] font-medium text-[var(--th-txt-4)] uppercase tracking-widest">Cliente</th>
                            <th className="px-3 py-2 text-left text-[10px] font-medium text-[var(--th-txt-4)] uppercase tracking-widest">Qtd</th>
                            <th className="px-3 py-2 text-left text-[10px] font-medium text-[var(--th-txt-4)] uppercase tracking-widest">Último Setor</th>
                            <th className="px-3 py-2 text-left text-[10px] font-medium text-[var(--th-txt-4)] uppercase tracking-widest">Status</th>
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
                          <div className="px-3 py-2 bg-[var(--th-subtle)] border-b border-[var(--th-border)] text-[10px] font-medium text-[var(--th-txt-4)] uppercase tracking-widest">Histórico de Setores</div>
                          <div className="overflow-auto">
                            <table className="w-full text-xs min-w-[480px]">
                              <thead><tr className="border-b border-[var(--th-border)] bg-[var(--th-subtle)]">
                                <th className="px-3 py-2 text-left text-[10px] font-medium text-[var(--th-txt-4)] uppercase tracking-widest">Talão</th>
                                <th className="px-3 py-2 text-left text-[10px] font-medium text-[var(--th-txt-4)] uppercase tracking-widest">Data</th>
                                <th className="px-3 py-2 text-left text-[10px] font-medium text-[var(--th-txt-4)] uppercase tracking-widest">Setor</th>
                                <th className="px-3 py-2 text-left text-[10px] font-medium text-[var(--th-txt-4)] uppercase tracking-widest">Nome Setor</th>
                                <th className="px-3 py-2 text-left text-[10px] font-medium text-[var(--th-txt-4)] uppercase tracking-widest">Qtd</th>
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
              <div className="w-[300px] shrink-0 border-r border-[var(--th-border)] flex flex-col bg-[var(--th-card)]">
                <div className="px-4 py-4 border-b border-[var(--th-border)] shrink-0">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[var(--th-txt-1)]">Logs</span>
                      <span className="text-xs bg-[var(--th-subtle)] px-2 py-0.5 rounded-full text-[var(--th-txt-4)]">{filteredLogs.length}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {logsLastSync && (
                        <span className="text-[10px] text-[var(--th-txt-4)]">
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
                      className="w-full rounded-lg border border-[var(--th-border)] bg-[var(--th-subtle)] pl-8 pr-3 py-1.5 text-[13px] text-[var(--th-txt-1)] placeholder:text-[var(--th-txt-4)] focus:outline-none focus:ring-1 focus:ring-orange-500/50"
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
                              <span className="text-[10px] px-1 py-px rounded bg-[var(--th-subtle)] text-[var(--th-txt-4)] border border-[var(--th-border)]">{log.os || '—'}</span>
                              <span className="text-[10px] px-1 py-px rounded bg-[var(--th-subtle)] text-[var(--th-txt-4)] border border-[var(--th-border)]">{log.browser || '—'}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Detail panel */}
              <div className="flex-1 overflow-y-auto p-5">
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
                            <p className="text-[10px] font-medium text-[var(--th-txt-4)] uppercase tracking-widest mb-1">{stat.label}</p>
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
                              <th className="px-3 py-2.5 text-left text-[10px] font-medium text-[var(--th-txt-4)] uppercase tracking-widest">Data / Hora</th>
                              <th className="px-3 py-2.5 text-left text-[10px] font-medium text-[var(--th-txt-4)] uppercase tracking-widest">Usuário</th>
                              <th className="px-3 py-2.5 text-left text-[10px] font-medium text-[var(--th-txt-4)] uppercase tracking-widest">IP</th>
                              <th className="px-3 py-2.5 text-left text-[10px] font-medium text-[var(--th-txt-4)] uppercase tracking-widest">Dispositivo</th>
                              <th className="px-3 py-2.5 text-left text-[10px] font-medium text-[var(--th-txt-4)] uppercase tracking-widest">OS</th>
                              <th className="px-3 py-2.5 text-left text-[10px] font-medium text-[var(--th-txt-4)] uppercase tracking-widest">Browser</th>
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
                            <p className="text-[10px] font-medium text-[var(--th-txt-4)] uppercase tracking-widest mb-1">{label}</p>
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
              <div className="w-[300px] shrink-0 border-r border-[var(--th-border)] flex flex-col bg-[var(--th-card)]">
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
                        className="w-full rounded-lg border border-[var(--th-border)] bg-[var(--th-card)] px-2.5 py-1.5 text-xs text-[var(--th-txt-1)] placeholder:text-[var(--th-txt-4)] focus:outline-none focus:ring-1 focus:ring-orange-500/50"
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
                      className="w-full rounded-lg border border-[var(--th-border)] bg-[var(--th-subtle)] pl-8 pr-3 py-1.5 text-[13px] text-[var(--th-txt-1)] placeholder:text-[var(--th-txt-4)] focus:outline-none focus:ring-1 focus:ring-orange-500/50" />
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
                            <span className="text-[10px] text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded-full shrink-0">{etapaCount} etapas</span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Detail panel */}
              <div className="flex-1 overflow-y-auto p-6">
                {!selectedProdItem && (
                  <div className="flex flex-col items-center justify-center py-24 text-[var(--th-txt-4)]">
                    <GitBranch strokeWidth={1} className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-sm">Selecione um item para ver seu fluxo de produção</p>
                  </div>
                )}

                {selectedProdItem && (
                  <div className="max-w-2xl space-y-5">
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
                              className="flex-1 rounded-lg border border-orange-500/40 bg-[var(--th-subtle)] px-3 py-1.5 text-lg font-bold text-[var(--th-txt-1)] focus:outline-none focus:ring-1 focus:ring-orange-500/50"
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
                        <span className="text-[10px] text-[var(--th-txt-4)]">{prodEtapas.length} etapas</span>
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
                                    className="flex-1 rounded border border-orange-500/40 bg-[var(--th-subtle)] px-2 py-1 text-sm text-[var(--th-txt-1)] focus:outline-none focus:ring-1 focus:ring-orange-500/50"
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
                            className="flex-1 rounded-lg border border-[var(--th-border)] bg-[var(--th-card)] px-3 py-1.5 text-[13px] text-[var(--th-txt-1)] placeholder:text-[var(--th-txt-4)] focus:outline-none focus:ring-1 focus:ring-orange-500/50"
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
                        <p className="text-[10px] text-[var(--th-txt-4)] uppercase tracking-widest font-medium mb-0.5">Pedidos Totais</p>
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
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--th-card)] text-[var(--th-txt-4)] border border-[var(--th-border)]">{a.tag}</span>
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
                return [asText(c.CODIGO), asText(c.NOME), asText(c.FANTASIA), asText(c.CNPJ), asText(c.CIDADE)].some(v => v.toLowerCase().includes(q))
              })
              return (
                <div className="flex h-full gap-0 -m-6">
                  {/* List panel */}
                  <div className="w-[320px] shrink-0 flex flex-col border-r border-[var(--th-border)] bg-[var(--th-card)]">
                    {/* Header */}
                    <div className="px-4 py-4 border-b border-[var(--th-border)]">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <h1 className="text-sm font-semibold text-[var(--th-txt-1)]">Clientes</h1>
                          <span className="text-xs bg-[var(--th-subtle)] px-2 py-0.5 rounded-full text-[var(--th-txt-4)]">{filtered.length}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-[var(--th-txt-4)]">{clientesAll.length} total</span>
                          <button type="button" onClick={() => void fetchClientes()} className="p-1.5 rounded hover:bg-[var(--th-hover)] text-[var(--th-txt-4)]">
                            <RefreshCw strokeWidth={1.5} className={`w-3.5 h-3.5 ${clientesLoading ? 'animate-spin' : ''}`} />
                          </button>
                        </div>
                      </div>
                      {/* Search */}
                      <div className="relative mb-2">
                        <Search strokeWidth={1.5} className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--th-txt-4)]" />
                        <input value={clientesQuery} onChange={e => setClientesQuery(e.target.value)}
                          placeholder="Buscar por nome, CNPJ, cidade..."
                          className="w-full rounded-lg border border-[var(--th-border)] bg-transparent pl-8 pr-3 py-1.5 text-xs text-[var(--th-txt-1)] placeholder:text-[var(--th-txt-4)] focus:outline-none focus:ring-2 focus:ring-orange-500/40" />
                      </div>
                      {/* Estado filter */}
                      <select value={clientesEstado} onChange={e => setClientesEstado(e.target.value)}
                        className="w-full rounded-lg border border-[var(--th-border)] bg-[var(--th-card)] px-2.5 py-1.5 text-xs text-[var(--th-txt-2)] focus:outline-none focus:ring-2 focus:ring-orange-500/40">
                        <option value="">Todos os estados</option>
                        {estados.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                      </select>
                    </div>
                    {/* List */}
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                      {clientesLoading && <div className="px-4 py-8 text-center text-sm text-[var(--th-txt-3)]">Carregando...</div>}
                      {clientesError && <div className="px-3 py-2 text-xs text-red-400 bg-red-500/10 rounded-lg border border-red-500/20">{clientesError}</div>}
                      {!clientesLoading && filtered.length === 0 && <div className="px-4 py-16 text-center text-sm text-[var(--th-txt-3)]">Nenhum cliente encontrado.</div>}
                      {filtered.map(c => {
                        const nome = asText(c.FANTASIA || c.NOME).trim() || '—'
                        const cod = asText(c.CODIGO).trim()
                        const cidade = asText(c.CIDADE).trim()
                        const uf = asText(c.ESTADO).trim()
                        const isSelected = selectedCliente?.CODIGO === c.CODIGO
                        return (
                          <button key={cod} type="button" onClick={() => setSelectedCliente(c)}
                            className={isSelected ? 'w-full text-left rounded-xl border border-orange-500/40 bg-orange-500/8 px-4 py-3 transition-all' : 'w-full text-left rounded-xl border border-[var(--th-border)] bg-[var(--th-card)] px-4 py-3 transition-all hover:border-orange-500/30 hover:bg-orange-500/5'}>
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium text-[var(--th-txt-1)] leading-snug line-clamp-2">{nome}</p>
                              <span className="text-[10px] font-mono text-[var(--th-txt-4)] shrink-0 mt-0.5">{cod}</span>
                            </div>
                            {(cidade || uf) && (
                              <p className="text-[11px] text-[var(--th-txt-4)] mt-0.5">{[cidade, uf].filter(Boolean).join(' · ')}</p>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Detail panel */}
                  <div className="flex-1 overflow-y-auto p-5">
                    {!selectedCliente && (
                      <div className="flex flex-col items-center justify-center py-16 text-[var(--th-txt-4)]">
                        <Users strokeWidth={1} className="w-12 h-12 mb-3 opacity-30" />
                        <p className="text-sm">Selecione um cliente para ver detalhes</p>
                      </div>
                    )}
                    {selectedCliente && (() => {
                      const c = selectedCliente
                      const nome = asText(c.FANTASIA || c.NOME).trim() || '—'
                      const cnpj = asText(c.CNPJ || c.CHAVE).trim()
                      const endereco = [asText(c.ENDERECO), asText(c.NUMERO), asText(c.COMPL)].filter(Boolean).join(', ')
                      const localidade = [asText(c.BAIRRO), asText(c.CIDADE), asText(c.ESTADO)].filter(Boolean).join(' · ')
                      const cep = asText(c.CEP).trim()
                      const pedidosDoCliente = orders.filter(p => asText(p.CLIENTE).trim() === asText(c.CODIGO).trim())
                      return (
                        <div className="space-y-4">
                          {/* Header */}
                          <div className="flex items-start justify-between gap-4 pb-4 border-b border-[var(--th-border)]">
                            <div className="min-w-0 flex-1">
                              <h2 className="text-lg font-bold text-[var(--th-txt-1)] mb-1 leading-snug">{nome}</h2>
                              <div className="flex items-center gap-3 flex-wrap text-xs text-[var(--th-txt-4)]">
                                <span className="font-mono text-[var(--th-txt-2)]">{asText(c.CODIGO)}</span>
                                {cnpj && <span>{cnpj}</span>}
                              </div>
                            </div>
                            {/* Cadastro inline */}
                            <div className="shrink-0 text-right text-xs text-[var(--th-txt-4)] space-y-1">
                              {asText(c.INCLUIDO) && <div><span>Incluído </span><span className="font-mono text-[var(--th-txt-2)]">{fmtDate(asText(c.INCLUIDO))}</span></div>}
                              {asText(c.ATUALIZADO) && <div><span>Atualizado </span><span className="font-mono text-[var(--th-txt-2)]">{fmtDate(asText(c.ATUALIZADO))}</span></div>}
                              <div><span>Pedidos </span><span className="font-semibold text-[var(--th-txt-2)]">{pedidosDoCliente.length}</span></div>
                            </div>
                            <button type="button" onClick={() => setSelectedCliente(null)} className="p-1.5 rounded hover:bg-[var(--th-hover)] text-[var(--th-txt-4)] shrink-0">
                              <X strokeWidth={1.5} className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Endereço */}
                          <div className="rounded-xl border border-[var(--th-border)] bg-[var(--th-card)] p-5">
                            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--th-txt-4)] mb-3">Endereço</p>
                            <div className="space-y-1.5 text-sm">
                              {endereco && <p className="text-[var(--th-txt-2)]">{endereco}</p>}
                              {localidade && <p className="text-[var(--th-txt-3)]">{localidade}</p>}
                              {cep && <p className="text-[var(--th-txt-4)] font-mono text-xs">CEP {cep}</p>}
                              {!endereco && !localidade && <p className="text-[var(--th-txt-4)]">—</p>}
                            </div>
                          </div>

                          {/* Histórico de pedidos */}
                          <div className="rounded-xl border border-[var(--th-border)] bg-[var(--th-card)] overflow-hidden">
                            <div className="px-4 py-2.5 bg-[var(--th-subtle)] border-b border-[var(--th-border)] flex items-center justify-between">
                              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--th-txt-4)]">Histórico de Pedidos</p>
                              <span className="text-[10px] text-[var(--th-txt-4)]">{pedidosDoCliente.length} pedido(s)</span>
                            </div>
                            {pedidosDoCliente.length === 0
                              ? <p className="px-4 py-6 text-sm text-center text-[var(--th-txt-3)]">Nenhum pedido encontrado.</p>
                              : <div className="divide-y divide-[var(--th-border)]">
                                  {[...pedidosDoCliente]
                                    .sort((a, b) => asText(b.VENDA || b.PREVISAO).localeCompare(asText(a.VENDA || a.PREVISAO)))
                                    .map(p => {
                                      const saldo = toNumber(p.SALDO)
                                      const total = toNumber(p.TOTAL)
                                      const faturados = toNumber(p.FATURADOS)
                                      const pct = total > 0 ? Math.round(((total - saldo) / total) * 100) : 0
                                      const nTaloes = (taloesByPedido.get(asText(p.CODIGO).trim()) ?? []).length
                                      const isFinalizado = saldo === 0
                                      return (
                                        <div key={asText(p.CODIGO)} className="px-4 py-3 hover:bg-[var(--th-hover)] transition-colors">
                                          <div className="flex items-center justify-between gap-3 mb-2">
                                            <div className="flex items-center gap-2.5">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const pNode = pedidoTree.find(n => asText(n.pedido.CODIGO).trim() === asText(p.CODIGO).trim())
                                                  if (pNode) { setSelectedPedidoDetail(pNode); setSelectedModule('orders') }
                                                }}
                                                className="font-mono font-semibold text-sm text-[var(--th-txt-1)] hover:text-orange-400 hover:underline transition-colors"
                                              >{asText(p.CODIGO)}</button>
                                              {isFinalizado
                                                ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 border border-green-500/20">Finalizado</span>
                                                : <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 border border-orange-500/20">Em aberto</span>
                                              }
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-[var(--th-txt-4)] shrink-0">
                                              {asText(p.VENDA) && <span>Pedido <span className="font-mono text-[var(--th-txt-2)]">{fmtDate(asText(p.VENDA))}</span></span>}
                                              <span>Prev. <span className="font-mono text-[var(--th-txt-2)]">{fmtDate(asText(p.PREVISAO)) ?? '—'}</span></span>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-4 text-xs text-[var(--th-txt-4)] mb-2">
                                            <span>Total <span className="font-mono text-[var(--th-txt-2)]">{fmtNumber(total)}</span> pares</span>
                                            {faturados > 0 && <span>Faturado <span className="font-mono text-[var(--th-txt-2)]">{fmtNumber(faturados)}</span></span>}
                                            {saldo > 0 && <span>Saldo <span className="font-mono text-orange-400">{fmtNumber(saldo)}</span></span>}
                                            <span>{nTaloes} talão(ões)</span>
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
                  <p className="text-sm text-[var(--th-txt-3)] mb-6">Sincronização ERP → Supabase via SE Link</p>
                </div>

                {/* Sync card (status + force) */}
                <div className="rounded-xl border border-[var(--th-border)] bg-[var(--th-card)] overflow-hidden">
                  {/* Status row */}
                  <div className="px-5 py-4 flex items-center justify-between gap-4 border-b border-[var(--th-border)]">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--th-txt-4)] mb-1">Última Sincronização</p>
                      <p className="text-sm font-mono text-[var(--th-txt-1)]">{lastSyncTime ?? '—'}</p>
                    </div>
                    <button type="button" onClick={() => void fetchLastSync()}
                      className="p-1.5 rounded hover:bg-[var(--th-hover)] text-[var(--th-txt-4)] shrink-0">
                      <RefreshCw strokeWidth={1.5} className="w-4 h-4" />
                    </button>
                  </div>
                  {/* Force sync row */}
                  <div className="px-5 py-4 space-y-3">
                    <p className="text-sm text-[var(--th-txt-3)]">
                      Solicita ao SE Link que execute uma sincronização completa dos arquivos DBF agora. O SE Link irá detectar a solicitação em até 15 segundos.
                    </p>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => void requestForceSync()}
                        disabled={forceSyncLoading || forceSyncStatus === 'waiting'}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-medium transition-colors">
                        <RefreshCw strokeWidth={1.5} className={`w-4 h-4 ${forceSyncLoading || forceSyncStatus === 'waiting' ? 'animate-spin' : ''}`} />
                        {forceSyncLoading ? 'Solicitando...' : forceSyncStatus === 'waiting' ? 'Aguardando SE Link...' : 'Forçar Sincronização'}
                      </button>
                      {forceSyncStatus === 'done' && (
                        <span className="inline-flex items-center gap-1.5 text-sm text-green-400">
                          <Check strokeWidth={2} className="w-4 h-4" /> Sincronizado!
                        </span>
                      )}
                      {forceSyncStatus === 'error' && (
                        <span className="text-sm text-red-400">{forceSyncError}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--th-txt-4)]">O SE Link precisa estar rodando no servidor.</p>
                  </div>
                </div>

                {/* Tables list */}
                <div className="rounded-xl border border-[var(--th-border)] bg-[var(--th-card)] p-5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[var(--th-txt-4)] mb-3">Tabelas Sincronizadas</p>
                  <div className="divide-y divide-[var(--th-border)]">
                    {['clientes', 'pedidos', 'fichas', 'taloes', 'talsetor', 'setores'].map(t => (
                      <div key={t} className="flex items-center justify-between px-4 py-2.5">
                        <span className="font-mono text-sm text-[var(--th-txt-2)]">{t}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 border border-green-500/20">DBF → Supabase</span>
                      </div>
                    ))}
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
      <div className="fixed inset-0 z-50 bg-black flex flex-col md:hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-black/80 border-b border-white/10 shrink-0">
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
          {/* Targeting frame */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-64 h-32">
              {/* Corner markers */}
              <span className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#FF8C00] rounded-tl" />
              <span className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#FF8C00] rounded-tr" />
              <span className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#FF8C00] rounded-bl" />
              <span className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#FF8C00] rounded-br" />
              {/* Scan line animation */}
              <span className="absolute left-0 right-0 h-px bg-[#FF8C00]/70 top-1/2 animate-pulse" />
            </div>
          </div>
          {/* Dimmed overlay outside target area */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(ellipse 280px 150px at center, transparent 60%, rgba(0,0,0,0.65) 100%)'
          }} />
        </div>

        {/* Footer status */}
        <div className="shrink-0 px-4 py-3 bg-black/80 border-t border-white/10 min-h-[60px] flex items-center justify-center">
          {scannerError ? (
            <p className="text-center text-sm text-red-400">{scannerError}</p>
          ) : (
            <p className="text-center text-sm text-white/50">Aponte a câmera para o código de barras do talão</p>
          )}
        </div>
      </div>
    )}
    </>
  )
}
