import type { DashboardData } from './api'

// Setores reais extraídos do DBF setores.dbf
export const MOCK_DASHBOARD: DashboardData = {
  sectors: [
    { cod: '002', nome: 'ALMOXARIFADO' },
    { cod: '004', nome: 'CORTE SERRA' },
    { cod: '008', nome: 'DISTRIBUIÇÃO' },
    { cod: '009', nome: 'RECORTE' },
    { cod: '010', nome: 'TAMPOGRAFIA' },
    { cod: '011', nome: 'REVISÃO PALM' },
    { cod: '034', nome: 'FLEXOGRAFIA' },
    { cod: '052', nome: 'EMB. MAQUINA 1' },
    { cod: '053', nome: 'EMB. MAQUINA 2' },
    { cod: '098', nome: 'EXPEDIÇÃO' },
    { cod: '099', nome: 'FATURAMENTO' },
  ],

  metrics: {
    delayed_count: 10,
    in_production_count: 10,
    efficiency: 72,
  },

  // Pedidos em atraso — setorCod = setor onde está parado
  delayed_orders: [
    { id: '10234', client: 'Supermercados BH Ltda',    colorModel: 'Sacola PP Laminada 40x50 Azul',       qty: 5000, expDate: '14/02/2026', daysLate: 17, setor: 'TAMPOGRAFIA',   setorCod: '010', allSetorCods: ['001','002','004','008','010'],           priority: 1 },
    { id: '10198', client: 'Drogaria São Paulo',        colorModel: 'Embalagem Kraft 25x35cm Natural',     qty: 3200, expDate: '17/02/2026', daysLate: 14, setor: 'RECORTE',       setorCod: '009', allSetorCods: ['002','004','009'],                       priority: 1 },
    { id: '10315', client: 'Grupo Carrefour',           colorModel: 'Bolsa TNT 30x40 Preta',               qty: 8000, expDate: '19/02/2026', daysLate: 12, setor: 'FLEXOGRAFIA',   setorCod: '034', allSetorCods: ['002','004','008','034'],                  priority: 0 },
    { id: '10287', client: 'Farmácias Nissei',          colorModel: 'Sacola Papel Duplex 32x42 Branca',   qty: 2500, expDate: '20/02/2026', daysLate: 11, setor: 'DISTRIBUIÇÃO',  setorCod: '008', allSetorCods: ['002','004','008'],                        priority: 0 },
    { id: '10342', client: 'Atacado Centro-Oeste',      colorModel: 'Mochila TNT Zíper 40x50 Vermelha',   qty: 1800, expDate: '21/02/2026', daysLate: 10, setor: 'EMB. MAQUINA 1',setorCod: '052', allSetorCods: ['002','004','008','010','034','052'],       priority: 1 },
    { id: '10256', client: 'Redes Farmácias SP',        colorModel: 'Bolsa Ecobag 38x42 Natural',          qty: 4400, expDate: '23/02/2026', daysLate:  8, setor: 'REVISÃO PALM',  setorCod: '011', allSetorCods: ['002','004','009','011'],                  priority: 0 },
    { id: '10301', client: 'Distribuidora Sul Ltda',    colorModel: 'Embalagem Laminada 28x38 Transparente',qty:6000, expDate: '24/02/2026', daysLate:  7, setor: 'CORTE SERRA',   setorCod: '004', allSetorCods: ['002','004'],                             priority: 0 },
    { id: '10189', client: 'Hipermercado Nacional',     colorModel: 'Sacola Flexível 30x40 Azul Marinho',  qty: 3600, expDate: '25/02/2026', daysLate:  6, setor: 'ALMOXARIFADO',  setorCod: '002', allSetorCods: ['002'],                                  priority: 1 },
    { id: '10378', client: 'Lojas Americanas BH',       colorModel: 'Bolsa Slim 25x35 Preta Fosca',        qty: 2200, expDate: '26/02/2026', daysLate:  5, setor: 'EMB. MAQUINA 2',setorCod: '053', allSetorCods: ['002','004','008','010','053'],            priority: 0 },
    { id: '10412', client: 'Grupo Pão de Açúcar',       colorModel: 'Sacola Reciclada 35x45 Verde',        qty: 7200, expDate: '27/02/2026', daysLate:  4, setor: 'TAMPOGRAFIA',   setorCod: '010', allSetorCods: ['002','004','008','010'],                  priority: 1 },
  ],

  // Pedidos de hoje — status determinado pelo setor atual
  today_orders: [
    { id: '10445', client: 'Supermercados BH Ltda',    colorModel: 'Sacola PP 40x50 Vermelha',            qty: 4800, expDate: '04/03/2026', status: 'Em Produção', setor: 'EXPEDIÇÃO',     setorCod: '098', allSetorCods: ['002','004','008','010','034','052','098'],       priority: 1 },
    { id: '10436', client: 'Farmácias Nissei',          colorModel: 'Embalagem Kraft 30x40 Parda',         qty: 3000, expDate: '05/03/2026', status: 'Em Produção', setor: 'EMB. MAQUINA 1',setorCod: '052', allSetorCods: ['002','004','008','034','052'],              priority: 0 },
    { id: '10429', client: 'Atacado Centro-Oeste',      colorModel: 'Bolsa TNT 35x45 Azul Royal',          qty: 6500, expDate: '05/03/2026', status: 'Finalizado',  setor: 'FATURAMENTO',   setorCod: '099', allSetorCods: ['002','004','008','010','034','052','098','099'], priority: 1 },
    { id: '10421', client: 'Redes Farmácias SP',        colorModel: 'Sacola Papel 28x38 Branca Brilho',    qty: 2800, expDate: '06/03/2026', status: 'Finalizado',  setor: 'FATURAMENTO',   setorCod: '099', allSetorCods: ['002','004','009','011','053','098','099'],   priority: 0 },
    { id: '10418', client: 'Distribuidora Sul Ltda',    colorModel: 'Mochila TNT Zíper 40x50 Preta',       qty: 1500, expDate: '06/03/2026', status: 'Em Produção', setor: 'FLEXOGRAFIA',   setorCod: '034', allSetorCods: ['002','004','008','034'],                  priority: 0 },
    { id: '10455', client: 'Hipermercado Nacional',     colorModel: 'Embalagem Laminada 25x35 Transparente',qty:5500, expDate: '07/03/2026', status: 'Aguardando',  setor: 'ALMOXARIFADO',  setorCod: '002', allSetorCods: ['002'],                                  priority: 1 },
    { id: '10460', client: 'Lojas Americanas BH',       colorModel: 'Bolsa Ecobag 38x42 Azul',             qty: 3800, expDate: '07/03/2026', status: 'Em Produção', setor: 'TAMPOGRAFIA',   setorCod: '010', allSetorCods: ['002','004','008','010'],                  priority: 0 },
    { id: '10433', client: 'Grupo Carrefour',           colorModel: 'Sacola Reciclada 40x50 Verde Escuro', qty: 9000, expDate: '08/03/2026', status: 'Finalizado',  setor: 'FATURAMENTO',   setorCod: '099', allSetorCods: ['002','004','008','010','034','052','098','099'], priority: 1 },
    { id: '10467', client: 'Grupo Pão de Açúcar',       colorModel: 'Sacola PP Laminada 35x45 Branca',     qty: 4200, expDate: '08/03/2026', status: 'Aguardando',  setor: 'CORTE SERRA',   setorCod: '004', allSetorCods: ['002','004'],                             priority: 0 },
    { id: '10472', client: 'Drogaria São Paulo',        colorModel: 'Bolsa Slim 25x35 Vermelha Fosca',     qty: 2100, expDate: '09/03/2026', status: 'Em Produção', setor: 'REVISÃO PALM',  setorCod: '011', allSetorCods: ['002','004','009','011'],                  priority: 1 },
  ],

  weekly_data: [
    { day: 'SEG', produced: 18500, goal: 20000, pct: 92 },
    { day: 'TER', produced: 21200, goal: 20000, pct: 106 },
    { day: 'QUA', produced: 17400, goal: 20000, pct: 87 },
    { day: 'QUI', produced: 22300, goal: 20000, pct: 111 },
    { day: 'SEX', produced: 19600, goal: 20000, pct: 98 },
    { day: 'SAB', produced:  8200, goal: 10000, pct: 82 },
    { day: 'DOM', produced:     0, goal:     0, pct: 0  },
  ],

  weekly_goal: 110000,
  weekly_progress: 107200,
  monthly_goal: 440000,
  monthly_progress: 274000,

  monthly_data: Array.from({ length: 28 }, (_, i) => {
    const day = String(i + 1)
    const future = i + 1 > 3   // hoje é dia 3
    const scheduled = 20000
    const done = future ? 0 : [19200, 21500, 18800][i] ?? 20000
    const pct = future ? 0 : Math.round((done / scheduled) * 100)
    return { day, scheduled, done, pct, future }
  }),
}
