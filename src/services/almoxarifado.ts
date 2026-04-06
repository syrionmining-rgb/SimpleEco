import { supabase } from '../lib/supabase'

// Consulta para verificar itens vinculados ao almoxarifado
export async function verificarAlmoxarifado() {
  console.log('\n🔍 VERIFICANDO ALMOXARIFADO...')
  
  try {
    // 1. Fichas com MATESTOQUE preenchido
    const { data: fichasComMaterial, error: errorFichas } = await supabase
      .from('fichas')
      .select('CODIGO, NOME, MATESTOQUE, ESTOQUE, DISPONIVEL')
      .not('MATESTOQUE', 'is', null)
      .neq('MATESTOQUE', '')
      .limit(50)
    
    if (errorFichas) {
      console.error('❌ Erro ao buscar fichas:', errorFichas)
    } else {
      console.log(`\n📋 FICHAS COM MATERIAL EM ESTOQUE (${fichasComMaterial?.length || 0}):`)
      fichasComMaterial?.forEach(f => {
        console.log(`  📦 ${f.CODIGO} - ${f.NOME}`)
        console.log(`      Material: ${f.MATESTOQUE} | Estoque: ${f.ESTOQUE} | Disponível: ${f.DISPONIVEL}`)
      })
    }

    // 2. Talões de estoque (DE_ESTOQUE = true)
    const { data: taloesEstoque, error: errorTaloes } = await supabase
      .from('taloes')
      .select('CODIGO, NOME, PEDIDO, ITEM, MATERIAL, SETORESTOQ, DE_ESTOQUE')
      .eq('DE_ESTOQUE', true)
      .limit(50)
    
    if (errorTaloes) {
      console.error('❌ Erro ao buscar talões:', errorTaloes)
    } else {
      console.log(`\n🏷️ TALÕES DE ESTOQUE (${taloesEstoque?.length || 0}):`)
      taloesEstoque?.forEach(t => {
        console.log(`  📋 ${t.CODIGO} - ${t.NOME}`)
        console.log(`      Pedido: ${t.PEDIDO}/${t.ITEM} | Material: ${t.MATERIAL}`)
        console.log(`      Setor Estoque: ${t.SETORESTOQ || 'N/A'}`)
      })
    }

    // 3. Talões com SETORESTOQ preenchido
    const { data: taloesSetorEstoque, error: errorSetorEstoque } = await supabase
      .from('taloes')
      .select('CODIGO, NOME, PEDIDO, ITEM, SETORESTOQ, DE_ESTOQUE')
      .not('SETORESTOQ', 'is', null)
      .neq('SETORESTOQ', '')
      .limit(50)
    
    if (errorSetorEstoque) {
      console.error('❌ Erro ao buscar talões com setor estoque:', errorSetorEstoque)
    } else {
      console.log(`\n🏭 TALÕES COM SETOR DE ESTOQUE (${taloesSetorEstoque?.length || 0}):`)
      taloesSetorEstoque?.forEach(t => {
        console.log(`  🏷️ ${t.CODIGO} - setor ${t.SETORESTOQ}`)
        console.log(`      Nome: ${t.NOME} | De Estoque: ${t.DE_ESTOQUE ? 'SIM' : 'NÃO'}`)
      })
    }

    // 4. Resumo total
    console.log(`\n📊 RESUMO ALMOXARIFADO:`)
    console.log(`  • Fichas com material: ${fichasComMaterial?.length || 0}`)
    console.log(`  • Talões de estoque: ${taloesEstoque?.length || 0}`)
    console.log(`  • Talões c/ setor estoque: ${taloesSetorEstoque?.length || 0}`)
    
    return {
      fichasComMaterial: fichasComMaterial?.length || 0,
      taloesEstoque: taloesEstoque?.length || 0,
      taloesSetorEstoque: taloesSetorEstoque?.length || 0
    }
    
  } catch (error) {
    console.error('❌ Erro na verificação do almoxarifado:', error)
    return null
  }
}