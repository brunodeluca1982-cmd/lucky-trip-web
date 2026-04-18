-- =============================================================================
-- SEED: eventos + eventos_itens
-- =============================================================================
-- Cole este arquivo no SQL Editor do Supabase e execute.
-- As tabelas já existem — este script só insere dados.
-- Todos os eventos começam com is_active = false.
-- Para ativar: UPDATE eventos SET is_active = true WHERE nome = 'Modo Shakira';
-- =============================================================================

-- Helper para manter o script idempotente: remove eventos existentes com
-- os mesmos nomes antes de recriar, assim você pode rodar quantas vezes quiser.
DELETE FROM eventos_itens
WHERE evento_id IN (
  SELECT id FROM eventos
  WHERE nome IN (
    'Modo Shakira',
    'Modo Copa do Mundo',
    'Modo Feriadão',
    'Modo Rock in Rio'
  )
);
DELETE FROM eventos
WHERE nome IN (
  'Modo Shakira',
  'Modo Copa do Mundo',
  'Modo Feriadão',
  'Modo Rock in Rio'
);

-- =============================================================================
-- 1. MODO SHAKIRA — Rio de Janeiro
-- Maracanã, shows previstos para novembro 2026
-- =============================================================================
WITH ev AS (
  INSERT INTO eventos (cidade_id, nome, tipo, cor_destaque, icone, is_active, data_inicio, data_fim)
  VALUES (
    'rio',
    'Modo Shakira',
    'show',
    '#9B59B6',   -- roxo Shakira
    'music',
    false,
    '2026-11-14 00:00:00+00',
    '2026-11-16 23:59:59+00'
  )
  RETURNING id
)
INSERT INTO eventos_itens (evento_id, titulo, subtitulo, categoria, icone, link_externo, ordem)
SELECT
  ev.id,
  titulo, subtitulo, categoria, icone, link_externo, ordem
FROM ev,
(VALUES
  ('Ingresso Shakira',        'Comprar ingresso oficial antes que esgote', 'ingresso',    'ticket',       'https://www.ticketmaster.com.br', 1),
  ('Hotéis perto do Maracanã','Ficar a pé do show sem stress de transporte','hospedagem',  'home',         null,                             2),
  ('Jantar antes do show',    'Restaurantes no Maracanã/Tijuca que não lotam','restaurante','coffee',       null,                             3),
  ('Como chegar ao Maracanã', 'Metrô linha 2 — estação Maracanã (mais fácil)','transporte','navigation',   null,                             4),
  ('Fan zone Flamengo',       'Concentração de fãs antes do show, beers e música','dica', 'star',          null,                             5),
  ('Evite Uber pós-show',     'Saída: use metrô — Uber triplica de preço','dica',         'alert-triangle',null,                             6)
) AS t(titulo, subtitulo, categoria, icone, link_externo, ordem);

-- =============================================================================
-- 2. MODO COPA DO MUNDO — Miami
-- Copa do Mundo FIFA 2026, jogos em Miami (Hard Rock Stadium)
-- Fase de grupos: Jun–Jul 2026
-- =============================================================================
WITH ev AS (
  INSERT INTO eventos (cidade_id, nome, tipo, cor_destaque, icone, is_active, data_inicio, data_fim)
  VALUES (
    'miami',
    'Modo Copa do Mundo',
    'copa',
    '#009C3B',   -- verde Brasil
    'award',
    false,
    '2026-06-11 00:00:00+00',
    '2026-07-19 23:59:59+00'
  )
  RETURNING id
)
INSERT INTO eventos_itens (evento_id, titulo, subtitulo, categoria, icone, link_externo, ordem)
SELECT
  ev.id,
  titulo, subtitulo, categoria, icone, link_externo, ordem
FROM ev,
(VALUES
  ('Ingressos FIFA',           'Comprar pacotes de jogos no site oficial FIFA', 'ingresso',   'ticket',        'https://www.fifa.com/tickets',  1),
  ('Fan Zone em Miami',        'Fort Lauderdale e Miami Beach — festa oficial da Copa','dica','map-pin',       null,                            2),
  ('Hotéis perto do estádio',  'Hard Rock Stadium em Miami Gardens — fique perto','hospedagem','home',         null,                            3),
  ('Bares para assistir',      'Os melhores sports bars de South Beach','restaurante',       'tv',            null,                            4),
  ('Transport ao estádio',     'Uber/Lyft ou shuttles oficiais da FIFA','transporte',         'navigation',    null,                            5),
  ('Dica do Bruno',            'Chegue 2h antes — segurança da FIFA demora','dica',            'star',          null,                            6)
) AS t(titulo, subtitulo, categoria, icone, link_externo, ordem);

-- =============================================================================
-- 3. MODO FERIADÃO — Rio de Janeiro
-- Template para feriados prolongados (Tiradentes, Corpus Christi, etc.)
-- Duplique este bloco e mude cidade_id + datas para outras cidades
-- =============================================================================
WITH ev AS (
  INSERT INTO eventos (cidade_id, nome, tipo, cor_destaque, icone, is_active, data_inicio, data_fim)
  VALUES (
    'rio',
    'Modo Feriadão',
    'feriado',
    '#F39C12',   -- laranja/dourado
    'sun',
    false,
    '2026-04-21 00:00:00+00',  -- Tiradentes
    '2026-04-26 23:59:59+00'
  )
  RETURNING id
)
INSERT INTO eventos_itens (evento_id, titulo, subtitulo, categoria, icone, link_externo, ordem)
SELECT
  ev.id,
  titulo, subtitulo, categoria, icone, link_externo, ordem
FROM ev,
(VALUES
  ('Roteiro 3 dias no Rio',    'O melhor do Rio em um feriadão perfeito',    'dica',        'map',           null, 1),
  ('Reserve antes — lotará',   'Hotéis e restaurantes esgotam no feriadão',  'dica',        'alert-circle',  null, 2),
  ('Praia na semana',          'Vá de segunda a quarta — menos gente',       'dica',        'sun',           null, 3),
  ('Evite Barra na volta',     'Domingo à noite — trânsito infernal na Linha Amarela','transporte','navigation',null, 4),
  ('Passeio de barco',         'Feriadão é a época perfeita para Ilha Grande','oQueFazer',  'anchor',        null, 5),
  ('Onde ficar lotado — evite','Copacabana fica caótico — prefira Ipanema ou Santa Teresa','hospedagem','home',null, 6)
) AS t(titulo, subtitulo, categoria, icone, link_externo, ordem);

-- =============================================================================
-- 3b. MODO FERIADÃO — Florianópolis (duplicate do template acima)
-- =============================================================================
WITH ev AS (
  INSERT INTO eventos (cidade_id, nome, tipo, cor_destaque, icone, is_active, data_inicio, data_fim)
  VALUES (
    'floripa',
    'Modo Feriadão',
    'feriado',
    '#F39C12',
    'sun',
    false,
    '2026-04-21 00:00:00+00',
    '2026-04-26 23:59:59+00'
  )
  RETURNING id
)
INSERT INTO eventos_itens (evento_id, titulo, subtitulo, categoria, icone, link_externo, ordem)
SELECT
  ev.id,
  titulo, subtitulo, categoria, icone, link_externo, ordem
FROM ev,
(VALUES
  ('Praias do Norte',          'Santinho e Ingleses — mais tranquilas no feriadão','dica',   'map-pin',       null, 1),
  ('Reserve com antecedência', 'Floripa esgota MUITO antes — reserve já',          'dica',   'alert-circle',  null, 2),
  ('Lagoa da Conceição',       'Baladinhas e restaurantes à beira da lagoa',        'restaurante','coffee',   null, 3),
  ('Evite voo sexta à noite',  'Congestionamento brutal no Hercílio Luz',           'transporte','navigation',null, 4),
  ('Cachoeiras no interior',   'Fuja das praias — trilhas são incríveis',           'oQueFazer', 'wind',      null, 5),
  ('Mercado Público',          'Almoço clássico em Floripa — sempre vale',          'restaurante','coffee',   null, 6)
) AS t(titulo, subtitulo, categoria, icone, link_externo, ordem);

-- =============================================================================
-- 4. MODO ROCK IN RIO — Rio de Janeiro
-- Rock in Rio 2026 (datas a confirmar — tipicamente Set/Out)
-- =============================================================================
WITH ev AS (
  INSERT INTO eventos (cidade_id, nome, tipo, cor_destaque, icone, is_active, data_inicio, data_fim)
  VALUES (
    'rio',
    'Modo Rock in Rio',
    'festival',
    '#E74C3C',   -- vermelho festival
    'headphones',
    false,
    '2026-09-18 00:00:00+00',
    '2026-09-27 23:59:59+00'
  )
  RETURNING id
)
INSERT INTO eventos_itens (evento_id, titulo, subtitulo, categoria, icone, link_externo, ordem)
SELECT
  ev.id,
  titulo, subtitulo, categoria, icone, link_externo, ordem
FROM ev,
(VALUES
  ('Ingresso Rock in Rio',     'Venda em lotes — compre no 1º lote (mais barato)','ingresso', 'ticket',       'https://rockinrio.com',         1),
  ('Hospedagem na Barra',      'Mais perto da Cidade do Rock — Barra e Recreio',  'hospedagem','home',         null,                            2),
  ('Shuttle oficial',          'Use o transporte oficial — parking é caótico',    'transporte','navigation',  null,                            3),
  ('Restaurantes da Barra',    'Jantar antes do show — Downtown e VillageMall',   'restaurante','coffee',      null,                            4),
  ('Dias menos movimentados',  'Quinta e domingo têm menos gente que sábado',     'dica',      'users',        null,                            5),
  ('Look do festival',         'Leve protetor solar, garrafa d''água e carregador','dica',      'star',         null,                            6)
) AS t(titulo, subtitulo, categoria, icone, link_externo, ordem);

-- =============================================================================
-- VERIFICAÇÃO — rode para confirmar os dados inseridos
-- =============================================================================
-- SELECT e.nome, e.cidade_id, e.is_active, e.cor_destaque, COUNT(ei.id) AS itens
-- FROM eventos e
-- LEFT JOIN eventos_itens ei ON ei.evento_id = e.id
-- GROUP BY e.id, e.nome, e.cidade_id, e.is_active, e.cor_destaque
-- ORDER BY e.nome, e.cidade_id;
