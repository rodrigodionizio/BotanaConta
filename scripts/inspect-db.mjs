/**
 * inspect-db.mjs — Diagnóstico completo do schema e dados do Supabase
 *
 * Uso:  node scripts/inspect-db.mjs
 *
 * Verifica:
 *  1. Tabelas acessíveis com o anon key
 *  2. Contagem de linhas em cada tabela relevante
 *  3. Vínculos usuário ↔ estabelecimento
 *  4. Comandas existentes (últimas 10)
 *  5. Políticas RLS (via information_schema — requer permissão)
 *  6. Configurações do estabelecimento
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL    = 'https://idzsatexactvsogildpc.supabase.co'
const SUPABASE_ANON   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkenNhdGV4YWN0dnNvZ2lsZHBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNzkyNjksImV4cCI6MjA5MTk1NTI2OX0.0n-WIv1vxLXdVamUKXUdN02uZdqfdw848ck7geQ3yP8'

// Se houver SERVICE_ROLE_KEY no ambiente, usa ela para acesso total
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? null

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE ?? SUPABASE_ANON,
  { auth: { persistSession: false } }
)

const KEY_TYPE = SUPABASE_SERVICE ? 'SERVICE_ROLE (acesso total)' : 'ANON (acesso restrito por RLS)'

// ── Helpers ───────────────────────────────────────────────────────────────────

const sep  = (c = '─', n = 70) => console.log(c.repeat(n))
const head = (s)  => { sep(); console.log(`  ${s}`); sep() }
const ok   = (s)  => console.log(`  ✅  ${s}`)
const warn = (s)  => console.log(`  ⚠️   ${s}`)
const err  = (s)  => console.log(`  ❌  ${s}`)
const info = (s)  => console.log(`  ℹ️   ${s}`)
const row  = (obj) => console.log('  ', JSON.stringify(obj, null, 2).split('\n').join('\n   '))

async function countTable(table) {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
  if (error) return { count: null, error: error.message }
  return { count, error: null }
}

// ── 1. Conectividade ──────────────────────────────────────────────────────────
head('1. CONECTIVIDADE')
console.log(`  URL  : ${SUPABASE_URL}`)
console.log(`  Chave: ${KEY_TYPE}`)

const { data: pingData, error: pingErr } = await supabase
  .from('estabelecimentos')
  .select('id')
  .limit(1)

if (pingErr) {
  err(`Falha na conexão: ${pingErr.message}`)
} else {
  ok('Conexão OK')
}

// ── 2. Contagem de linhas por tabela ─────────────────────────────────────────
head('2. CONTAGEM DE LINHAS (SELECT count, head: true)')

const TABLES = [
  'usuarios',
  'estabelecimentos',
  'usuario_estabelecimento',    // ← nome crítico (singular!)
  'usuarios_estabelecimentos',  // teste se plural também existe
  'configuracoes_estabelecimento',
  'mesas_preset',
  'produtos',
  'comandas',
  'comanda_itens',
  'tickets_cozinha',
  'pagamentos',
  'comanda_eventos',
]

for (const t of TABLES) {
  const { count, error: e } = await countTable(t)
  if (e) {
    warn(`${t.padEnd(35)} → ERRO: ${e}`)
  } else {
    ok(`${t.padEnd(35)} → ${count} registros`)
  }
}

// ── 3. Estabelecimentos ───────────────────────────────────────────────────────
head('3. ESTABELECIMENTOS')
const { data: estabs, error: estabErr } = await supabase
  .from('estabelecimentos')
  .select('id, nome, ativo, criado_em')

if (estabErr) {
  err(estabErr.message)
} else if (!estabs?.length) {
  warn('Nenhum estabelecimento cadastrado!')
} else {
  estabs.forEach(e => ok(`[${e.id}] ${e.nome} · ativo=${e.ativo}`))
}

// ── 4. Vínculos usuário ↔ estabelecimento ─────────────────────────────────────
head('4. VÍNCULOS usuario_estabelecimento')
const { data: vinculos, error: vincErr } = await supabase
  .from('usuario_estabelecimento')
  .select('usuario_id, estabelecimento_id, perfil, ativo')

if (vincErr) {
  err(`Tabela inacessível: ${vincErr.message}`)
} else if (!vinculos?.length) {
  err('Nenhum vínculo usuário ↔ estabelecimento encontrado! Este é o problema provável.')
  warn('O useAuthInit não consegue popular o store sem esse registro.')
} else {
  vinculos.forEach(v =>
    ok(`usuario=${v.usuario_id.slice(0, 8)}… · estab=${v.estabelecimento_id.slice(0, 8)}… · perfil=${v.perfil} · ativo=${v.ativo}`)
  )
}

// ── 5. Usuários cadastrados ───────────────────────────────────────────────────
head('5. USUÁRIOS (tabela pública)')
const { data: users, error: usersErr } = await supabase
  .from('usuarios')
  .select('id, nome, email, criado_em')

if (usersErr) {
  err(usersErr.message)
} else if (!users?.length) {
  warn('Nenhum usuário na tabela pública. Verifique se o trigger auth→usuarios existe.')
} else {
  users.forEach(u => ok(`[${u.id.slice(0, 8)}…] ${u.nome} <${u.email}>`))
}

// ── 6. Configurações do estabelecimento ──────────────────────────────────────
head('6. CONFIGURAÇÕES DO ESTABELECIMENTO')
const { data: cfgs, error: cfgErr } = await supabase
  .from('configuracoes_estabelecimento')
  .select('*')

if (cfgErr) {
  err(cfgErr.message)
} else if (!cfgs?.length) {
  warn('Nenhuma configuração encontrada — pode causar erros em taxa de serviço.')
} else {
  cfgs.forEach(c => {
    ok(`estab=${c.estabelecimento_id?.slice(0, 8)}… · taxa_ativa=${c.taxa_servico_ativa} · pct=${c.taxa_servico_pct}%`)
  })
}

// ── 7. Mesas configuradas — inspeciona colunas reais ─────────────────────────
head('7. MESAS (mesas_preset) — colunas reais')
const { data: mesasRaw, error: mesasErr } = await supabase
  .from('mesas_preset')
  .select('*')
  .limit(3)

if (mesasErr) {
  err(mesasErr.message)
} else if (!mesasRaw?.length) {
  warn('Nenhuma mesa cadastrada — a tela /mesas ficará vazia.')
  // Tenta detectar colunas via LIMIT 0
  const { data: mesasCols } = await supabase.from('mesas_preset').select('*').limit(0)
  info(`Colunas detectadas: ${mesasCols !== null ? JSON.stringify(mesasCols) : '(sem dados)'}`)
} else {
  ok(`${mesasRaw.length} registros (amostra):`)
  mesasRaw.forEach(m => {
    ok(`Colunas: ${Object.keys(m).join(', ')}`)
    info(JSON.stringify(m))
  })
}

// ── 8. Comandas recentes ──────────────────────────────────────────────────────
head('8. COMANDAS (últimas 10)')
const { data: cmdas, error: cmdaErr } = await supabase
  .from('comandas')
  .select('id, identificacao, status, total_bruto, total_final, aberta_em')
  .order('aberta_em', { ascending: false })
  .limit(10)

if (cmdaErr) {
  err(cmdaErr.message)
} else if (!cmdas?.length) {
  info('Nenhuma comanda encontrada ainda.')
} else {
  cmdas.forEach(c => ok(`[${c.id.slice(0, 8)}…] "${c.identificacao}" · ${c.status} · R$${c.total_bruto ?? 0}`))
}

// ── 9. Produtos ───────────────────────────────────────────────────────────────
head('9. PRODUTOS (primeiros 10)')
const { data: prods, error: prodsErr } = await supabase
  .from('produtos')
  .select('id, nome, disponivel, categoria_id')
  .limit(10)

if (prodsErr) {
  err(prodsErr.message)
} else if (!prods?.length) {
  warn('Nenhum produto cadastrado — cardápio vazio.')
} else {
  prods.forEach(p => ok(`"${p.nome}" · disponível=${p.disponivel}`))
}

// ── 10. Columns via PostgREST schema introspection ───────────────────────────
head('10. COLUNAS REAIS DE CADA TABELA (PostgREST OPTIONS com service key)')
try {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: {
      'apikey':        SUPABASE_SERVICE ?? SUPABASE_ANON,
      'Authorization': `Bearer ${SUPABASE_SERVICE ?? SUPABASE_ANON}`,
      'Accept':        'application/openapi+json',
    }
  })
  if (resp.ok) {
    const schema = await resp.json()
    const paths = Object.keys(schema.paths ?? {}).filter(p => !p.includes('{'))
    ok(`PostgREST expõe ${paths.length} tabelas/views:`)
    paths.forEach(p => info(p.replace('/rest/v1', '').replace('/', '')))
  } else {
    warn(`OpenAPI retornou HTTP ${resp.status} — usando fallback LIMIT 1`)
  }
} catch (e) {
  warn(`Não foi possível buscar OpenAPI: ${e.message}`)
}

// Fallback: detectar colunas via SELECT * LIMIT 1 de cada tabela crítica
head('11. COLUNAS (fallback: SELECT * LIMIT 1)')
const CRITICAL = ['mesas_preset', 'produtos', 'comandas', 'comanda_itens', 'usuario_estabelecimento', 'configuracoes_estabelecimento']
for (const t of CRITICAL) {
  const { data: sample, error: se } = await supabase.from(t).select('*').limit(1)
  if (se) {
    err(`${t}: ${se.message}`)
  } else if (sample && sample.length > 0) {
    ok(`${t} — colunas: ${Object.keys(sample[0]).join(', ')}`)
  } else {
    // Tabela vazia: tenta via HEAD request para ver schema
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/${t}?limit=0`, {
      headers: {
        'apikey':        SUPABASE_SERVICE ?? SUPABASE_ANON,
        'Authorization': `Bearer ${SUPABASE_SERVICE ?? SUPABASE_ANON}`,
        'Prefer':        'count=exact',
        'Accept':        'application/json',
      }
    })
    const txt = await resp.text()
    warn(`${t} — vazia, resposta HTTP ${resp.status}: ${txt.slice(0, 200)}`)
  }
}

sep('═')
console.log('\n  DIAGNÓSTICO CONCLUÍDO\n')
sep('═')
