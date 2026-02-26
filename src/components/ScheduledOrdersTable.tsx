import { Package, CircleCheck } from 'lucide-react'

interface ScheduledOrder {
  id: string
  client: string
  colorModel: string
  qty: number
  expDate: string
  status: 'Em Produção' | 'Finalizado' | 'Aguardando' | 'Pausado'
}

const orders: ScheduledOrder[] = [
  { id: '0001', client: 'Empresa D', colorModel: 'Preto / Modelo A', qty: 240, expDate: '25/02/2026', status: 'Pausado' },
  { id: '0002', client: 'Empresa E', colorModel: 'Branco / Modelo B', qty: 313, expDate: '25/02/2026', status: 'Aguardando' },
  { id: '0003', client: 'Empresa C', colorModel: 'Cinza / Modelo C', qty: 185, expDate: '25/02/2026', status: 'Aguardando' },
  { id: '0004', client: 'Empresa B', colorModel: 'Azul / Modelo A', qty: 262, expDate: '25/02/2026', status: 'Finalizado' },
  { id: '0005', client: 'Empresa E', colorModel: 'Vermelho / Modelo D', qty: 54, expDate: '25/02/2026', status: 'Finalizado' },
  { id: '0006', client: 'Empresa D', colorModel: 'Verde / Modelo B', qty: 66, expDate: '25/02/2026', status: 'Finalizado' },
  { id: '0007', client: 'Empresa E', colorModel: 'Amarelo / Modelo C', qty: 220, expDate: '25/02/2026', status: 'Finalizado' },
  { id: '0008', client: 'Empresa C', colorModel: 'Preto / Modelo A', qty: 206, expDate: '25/02/2026', status: 'Em Produção' },
]

const TOTAL = 24

export default function ScheduledOrdersTable() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-[var(--th-border)] bg-[var(--th-card)] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-[var(--th-subtle)] border border-[var(--th-border)] flex items-center justify-center">
            <Package className="w-6 h-6 text-[var(--th-txt-4)]" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm text-[var(--th-txt-4)] uppercase tracking-widest font-medium">Programados para Hoje</p>
            <h3 className="text-base font-semibold text-[var(--th-txt-2)]">Pedidos de Produção</h3>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-4xl font-bold text-black dark:text-white leading-none">{TOTAL}</span>
          <span className="text-sm text-[var(--th-txt-3)] mt-1">pedidos</span>
        </div>
      </div>

      {/* Table */}
        <div className="rounded-xl overflow-hidden border border-[var(--th-border)] bg-[var(--th-card)]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--th-border-soft)]">
                {['Remessa', 'Cliente', 'Cor / Modelo', 'Und', 'Data Exp.', 'Status'].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3.5 text-left text-sm font-medium text-[var(--th-txt-4)] uppercase tracking-widest"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr
                  key={o.id}
                  className="border-b border-[var(--th-border-soft)] hover:bg-[var(--th-hover)] transition-colors"
                >
                  <td className="px-5 py-3.5 text-base font-medium text-[var(--th-txt-2)]">{o.id}</td>
                  <td className="px-5 py-3.5 text-base text-[var(--th-txt-3)]">{o.client}</td>
                  <td className="px-5 py-3.5 text-base text-[var(--th-txt-3)]">{o.colorModel}</td>
                  <td className="px-5 py-3.5 text-base font-semibold text-[var(--th-txt-1)]">{o.qty}</td>
                  <td className="px-5 py-3.5 text-base text-[var(--th-txt-3)]">{o.expDate}</td>
                  <td className="px-5 py-3.5">
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-sm font-medium border"
                      style={o.status === 'Finalizado'
                        ? { backgroundColor: 'var(--th-fin-bg)', color: 'var(--th-fin-txt)', borderColor: 'var(--th-fin-border)' }
                        : { backgroundColor: 'var(--th-subtle)', color: 'var(--th-txt-3)', borderColor: 'var(--th-border)' }
                      }
                    >
                      <CircleCheck className="w-3 h-3" aria-hidden="true" />
                      {o.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
