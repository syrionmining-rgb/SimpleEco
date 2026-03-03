import type { DashboardData } from './api'

export const MOCK_DASHBOARD: DashboardData = {
  sectors: [
    { cod: 'S01', nome: 'Programação' },
    { cod: 'S02', nome: 'Corte' },
    { cod: 'S03', nome: 'Costura' },
    { cod: 'S04', nome: 'Acabamento' },
    { cod: 'S05', nome: 'Expedição' },
    { cod: 'S06', nome: 'Faturamento' },
  ],

  metrics: {
    delayed_count: 10,
    in_production_count: 10,
    efficiency: 62,
  },

  delayed_orders: [
    { id: 'PED-1001', client: 'Moda Feminina SA',       colorModel: 'Blusa Floral Rosa',       qty: 240, expDate: '15/02/2026', daysLate: 16, setor: 'Costura',      setorCod: 'S03', allSetorCods: ['S01','S02','S03'],         priority: 1 },
    { id: 'PED-1002', client: 'Atacado Confecções',      colorModel: 'Calça Jeans Azul',         qty: 180, expDate: '18/02/2026', daysLate: 13, setor: 'Corte',        setorCod: 'S02', allSetorCods: ['S01','S02'],               priority: 2 },
    { id: 'PED-1003', client: 'Boutique Elegance',       colorModel: 'Vestido Preto Longo',      qty:  96, expDate: '20/02/2026', daysLate: 11, setor: 'Acabamento',   setorCod: 'S04', allSetorCods: ['S01','S02','S03','S04'],    priority: 3 },
    { id: 'PED-1004', client: 'Lojas Primavera',         colorModel: 'Shorts Jeans Feminino',    qty: 320, expDate: '21/02/2026', daysLate: 10, setor: 'Costura',      setorCod: 'S03', allSetorCods: ['S01','S02','S03'],         priority: 4 },
    { id: 'PED-1005', client: 'Fashion Store',           colorModel: 'Bermuda Masculina Caqui',  qty: 150, expDate: '22/02/2026', daysLate:  9, setor: 'Corte',        setorCod: 'S02', allSetorCods: ['S01','S02'],               priority: 5 },
    { id: 'PED-1006', client: 'Rede Vestuário Norte',   colorModel: 'Camiseta Básica Branca',   qty: 500, expDate: '24/02/2026', daysLate:  7, setor: 'Acabamento',   setorCod: 'S04', allSetorCods: ['S02','S03','S04'],          priority: 6 },
    { id: 'PED-1007', client: 'Distribuidora Sul Moda', colorModel: 'Polo Masculina Listrada',  qty: 210, expDate: '25/02/2026', daysLate:  6, setor: 'Programação',  setorCod: 'S01', allSetorCods: ['S01'],                    priority: 7 },
    { id: 'PED-1008', client: 'Maria Clara Confecções', colorModel: 'Saia Midi Estampada',       qty:  72, expDate: '26/02/2026', daysLate:  5, setor: 'Costura',      setorCod: 'S03', allSetorCods: ['S01','S02','S03'],         priority: 8 },
    { id: 'PED-1009', client: 'Top Modas',               colorModel: 'Jaqueta Jeans Feminina',   qty: 144, expDate: '27/02/2026', daysLate:  4, setor: 'Acabamento',   setorCod: 'S04', allSetorCods: ['S02','S03','S04'],          priority: 9 },
    { id: 'PED-1010', client: 'Estilo & Cia',            colorModel: 'Moletom Unissex Cinza',    qty: 360, expDate: '28/02/2026', daysLate:  3, setor: 'Expedição',    setorCod: 'S05', allSetorCods: ['S03','S04','S05'],          priority: 10 },
  ],

  today_orders: [
    { id: 'PED-2001', client: 'Loja das Blusas',         colorModel: 'Blusa Manga Longa Vinho',   qty: 120, expDate: '04/03/2026', status: 'Em Produção', setor: 'Costura',      setorCod: 'S03', allSetorCods: ['S01','S02','S03'],         priority: 1 },
    { id: 'PED-2002', client: 'Atacado Minas Gerais',    colorModel: 'Calça Social Cinza',         qty: 200, expDate: '05/03/2026', status: 'Em Produção', setor: 'Corte',        setorCod: 'S02', allSetorCods: ['S01','S02'],               priority: 2 },
    { id: 'PED-2003', client: 'Moda Total',               colorModel: 'Vestido Floral Multicolor', qty:  84, expDate: '05/03/2026', status: 'Finalizado',  setor: 'Faturamento',  setorCod: 'S06', allSetorCods: ['S01','S02','S03','S04','S05','S06'], priority: 3 },
    { id: 'PED-2004', client: 'Fashion Center',           colorModel: 'Camiseta Polo Azul',         qty: 450, expDate: '06/03/2026', status: 'Finalizado',  setor: 'Expedição',    setorCod: 'S05', allSetorCods: ['S02','S03','S04','S05'],   priority: 4 },
    { id: 'PED-2005', client: 'Studio Fem',               colorModel: 'Short Alfaiataria Bege',    qty:  96, expDate: '06/03/2026', status: 'Em Produção', setor: 'Acabamento',   setorCod: 'S04', allSetorCods: ['S02','S03','S04'],          priority: 5 },
    { id: 'PED-2006', client: 'Multimoda SP',             colorModel: 'Jaqueta Bomber Preta',      qty: 168, expDate: '07/03/2026', status: 'Aguardando',  setor: 'Programação',  setorCod: 'S01', allSetorCods: ['S01'],                    priority: 6 },
    { id: 'PED-2007', client: 'Roupas & Cia Norte',      colorModel: 'Moletom Canguru Verde',     qty: 280, expDate: '07/03/2026', status: 'Em Produção', setor: 'Costura',      setorCod: 'S03', allSetorCods: ['S01','S02','S03'],         priority: 7 },
    { id: 'PED-2008', client: 'Boutique Renata',          colorModel: 'Saia Plissada Rosa',         qty:  60, expDate: '08/03/2026', status: 'Finalizado',  setor: 'Faturamento',  setorCod: 'S06', allSetorCods: ['S01','S02','S03','S04','S05','S06'], priority: 8 },
    { id: 'PED-2009', client: 'Distribuidora Central',   colorModel: 'Bermuda Tactel Masculina',  qty: 390, expDate: '08/03/2026', status: 'Pausado',     setor: 'Corte',        setorCod: 'S02', allSetorCods: ['S01','S02'],               priority: 9 },
    { id: 'PED-2010', client: 'Mega Moda Atacado',       colorModel: 'Regata Feminina Listra',    qty: 240, expDate: '09/03/2026', status: 'Em Produção', setor: 'Acabamento',   setorCod: 'S04', allSetorCods: ['S02','S03','S04'],          priority: 10 },
  ],

  weekly_data: [
    { day: 'SEG', produced: 1850, goal: 2000, pct: 92 },
    { day: 'TER', produced: 2100, goal: 2000, pct: 105 },
    { day: 'QUA', produced: 1740, goal: 2000, pct: 87 },
    { day: 'QUI', produced: 2230, goal: 2000, pct: 111 },
    { day: 'SEX', produced: 1960, goal: 2000, pct: 98 },
    { day: 'SAB', produced:  820, goal: 1000, pct: 82 },
    { day: 'DOM', produced:    0, goal:    0, pct: 0  },
  ],

  weekly_goal: 11000,
  weekly_progress: 10700,
  monthly_goal: 44000,
  monthly_progress: 27400,

  monthly_data: Array.from({ length: 28 }, (_, i) => {
    const day = String(i + 1)
    const future = i + 1 > 3   // hoje é dia 3
    const scheduled = future ? 2000 : 2000
    const done = future ? 0 : Math.round(1700 + Math.random() * 600)
    const pct = future ? 0 : Math.round((done / scheduled) * 100)
    return { day, scheduled, done, pct, future }
  }),
}
