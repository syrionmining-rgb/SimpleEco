import { TriangleAlert, CircleX } from 'lucide-react'

interface DelayedOrder {
  id: string
  client: string
  colorModel: string
  qty: number
  expDate: string
  daysLate: number
}

const orders: DelayedOrder[] = [
  { id: '0001', client: 'Empresa D', colorModel: 'Preto / Modelo A', qty: 180, expDate: '13/02/2026', daysLate: 12 },
  { id: '0002', client: 'Empresa A', colorModel: 'Branco / Modelo B', qty: 520, expDate: '22/02/2026', daysLate: 3 },
  { id: '0003', client: 'Empresa E', colorModel: 'Cinza / Modelo C', qty: 375, expDate: '21/02/2026', daysLate: 4 },
  { id: '0004', client: 'Empresa E', colorModel: 'Azul / Modelo A', qty: 63, expDate: '16/02/2026', daysLate: 9 },
  { id: '0005', client: 'Empresa A', colorModel: 'Vermelho / Modelo D', qty: 385, expDate: '11/02/2026', daysLate: 14 },
  { id: '0006', client: 'Empresa B', colorModel: 'Verde / Modelo B', qty: 101, expDate: '19/02/2026', daysLate: 6 },
  { id: '0007', client: 'Empresa D', colorModel: 'Amarelo / Modelo C', qty: 82, expDate: '12/02/2026', daysLate: 13 },
  { id: '0008', client: 'Empresa E', colorModel: 'Preto / Modelo A', qty: 296, expDate: '16/02/2026', daysLate: 9 },
]

export default function DelayedOrdersTable() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-[var(--th-border)] bg-[var(--th-card)] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <TriangleAlert className="w-6 h-6 text-red-400" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm text-[var(--th-txt-4)] uppercase tracking-widest font-medium">Monitoramento de Prazo</p>
            <h3 className="text-base font-semibold text-[var(--th-txt-2)]">Pedidos em Atraso</h3>
          </div>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-4xl font-bold text-red-400 leading-none">{orders.length}</span>
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
                    <span className="inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-md text-sm font-medium bg-red-500/10 text-red-400 border border-red-500/20 w-24">
                      <CircleX className="w-3 h-3 shrink-0" aria-hidden="true" />
                      {o.daysLate} dias
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
