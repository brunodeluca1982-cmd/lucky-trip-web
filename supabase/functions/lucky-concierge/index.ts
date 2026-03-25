/**
 * lucky-concierge/index.ts
 *
 * Lucky concierge AI for The Lucky Trip.
 * Only uses real Supabase data — never invents places.
 *
 * Pipeline:
 *  1. Check access_levels for deviceId (premium gate)
 *  2. Route query intent → query relevant Supabase tables
 *  3. Build rich context from real rows
 *  4. Call Gemini to synthesize a natural concierge response
 *  5. Return { answer, isPremium, places }
 */

import { serve }        from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  role:    "user" | "assistant";
  content: string;
}

interface RequestBody {
  query:       string;
  history?:    Message[];
  deviceId:    string;
  destination?: string;
}

interface PlaceRef {
  id:    string;
  name:  string;
  bairro?: string;
  categoria?: string;
}

// ── Intent routing ────────────────────────────────────────────────────────────
// Keyword sets for intent detection — used to query the right Supabase tables.

const INTENT_KEYWORDS: Record<string, string[]> = {
  restaurants: [
    "restaurante","comer","gastronomia","comida","jantar","almoço","almoco",
    "café","cafe","bar","drink","drinks","pizza","sushi","frutos","mariscos",
    "churrasco","brunch","café da manhã","lanche","refeição","culinária","bistrô",
    "fine dining","vinho","cerveja","prato","cardápio","menu",
  ],
  activities: [
    "fazer","atividade","visitar","conhecer","passeio","atração","atrações","tour",
    "museu","trilha","parque","praia","surf","mergulho","show","teatro","galeria",
    "compras","shopping","esporte","aventura","natureza","mirante","vista","pôr do sol",
    "cultura","história","arte","festa","carnaval","lapa","forró","samba","balada",
  ],
  hotels: [
    "hotel","hospedagem","ficar","dormir","hospedar","pousada","resort","suite",
    "quarto","acomodação","check-in","check in","accommodation","lodging",
  ],
  neighborhoods: [
    "bairro","região","zona","área","melhor bairro","onde fica","localização",
    "ipanema","copacabana","leblon","botafogo","santa teresa","lapa","centro",
    "tijuca","barra","recreio","urca","flamengo","lagoa","jardim botânico",
  ],
  lucky_picks: [
    "dica","dicas","segredo","segredos","exclusivo","curadores","curadoria",
    "lucky","list","picks","especial","escondido","pouco conhecido","desconhecido",
    "jóia","descoberta","insider","local",
  ],
};

function detectIntent(query: string): Set<string> {
  const q = query.toLowerCase();
  const intents = new Set<string>();

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (keywords.some((kw) => q.includes(kw))) {
      intents.add(intent);
    }
  }

  if (intents.size === 0) {
    intents.add("activities");
    intents.add("lucky_picks");
  }

  return intents;
}

// ── Supabase data fetching ────────────────────────────────────────────────────

async function fetchRestaurants(supa: ReturnType<typeof createClient>, query: string) {
  const { data } = await supa
    .from("restaurantes")
    .select("id, nome, bairro, tipo_de_cozinha, especialidade, perfil_publico, meu_olhar, tags_ia, vibe, melhor_para, seguro_mulher_sozinha")
    .limit(20);
  return (data ?? []).map((r) => ({
    id:        String(r.id),
    name:      r.nome,
    bairro:    r.bairro,
    categoria: "restaurante",
    tipo:      r.tipo_de_cozinha,
    especialidade: r.especialidade,
    perfil:    r.perfil_publico,
    meu_olhar: r.meu_olhar,
    tags:      r.tags_ia,
    vibe:      r.vibe,
    melhor_para: r.melhor_para,
    seguro_mulher: r.seguro_mulher_sozinha,
  }));
}

async function fetchActivities(supa: ReturnType<typeof createClient>, query: string) {
  const { data } = await supa
    .from("o_que_fazer_rio")
    .select("id, titulo, localizacao, descricao, tags_ia, vibe, momento_ideal, nivel_esforco, com_criancas, meu_olhar, best_for, melhor_para")
    .limit(25);
  return (data ?? []).map((a) => ({
    id:        String(a.id),
    name:      a.titulo,
    bairro:    a.localizacao,
    categoria: "atividade",
    descricao: a.descricao,
    tags:      a.tags_ia,
    vibe:      a.vibe,
    momento:   a.momento_ideal,
    esforco:   a.nivel_esforco,
    criancas:  a.com_criancas,
    meu_olhar: a.meu_olhar,
    best_for:  a.best_for,
  }));
}

async function fetchHotels(supa: ReturnType<typeof createClient>) {
  const { data } = await supa
    .from("stay_hotels")
    .select("id, nome, bairro, my_view, how_to_enjoy, perfil_ideal, best_for, tags")
    .limit(15);
  return (data ?? []).map((h) => ({
    id:        String(h.id),
    name:      h.nome,
    bairro:    h.bairro,
    categoria: "hotel",
    my_view:   h.my_view,
    how_to_enjoy: h.how_to_enjoy,
    perfil:    h.perfil_ideal,
    best_for:  h.best_for,
    tags:      h.tags,
  }));
}

async function fetchNeighborhoods(supa: ReturnType<typeof createClient>) {
  const { data } = await supa
    .from("stay_neighborhoods")
    .select("nome, identity_phrase, my_view, how_to_live, best_for_families, best_for_solo, best_for_couples, gastronomy, nightlife, scenery, walkable, safety_solo_woman")
    .limit(15);
  return (data ?? []).map((n) => ({
    name:          n.nome,
    phrase:        n.identity_phrase,
    my_view:       n.my_view,
    how_to_live:   n.how_to_live,
    best_families: n.best_for_families,
    best_solo:     n.best_for_solo,
    best_couples:  n.best_for_couples,
    gastronomy:    n.gastronomy,
    nightlife:     n.nightlife,
    scenery:       n.scenery,
    walkable:      n.walkable,
    safety_solo:   n.safety_solo_woman,
  }));
}

async function fetchLuckyPicks(supa: ReturnType<typeof createClient>) {
  const { data } = await supa
    .from("lucky_list_rio")
    .select("id, titulo, localizacao, descricao, categoria, tags, meu_olhar")
    .limit(20);
  return (data ?? []).map((l) => ({
    id:        String(l.id),
    name:      l.titulo,
    bairro:    l.localizacao,
    categoria: l.categoria ?? "lucky",
    descricao: l.descricao,
    tags:      l.tags,
    meu_olhar: l.meu_olhar,
  }));
}

// ── Premium check ─────────────────────────────────────────────────────────────

async function checkPremium(supa: ReturnType<typeof createClient>, deviceId: string): Promise<boolean> {
  const { data } = await supa
    .from("access_levels")
    .select("plan_type, access_until")
    .eq("device_id", deviceId)
    .maybeSingle();

  if (!data) return false;
  if (data.plan_type !== "premium") return false;
  if (!data.access_until) return false;

  return new Date(data.access_until) > new Date();
}

// ── Gemini call ───────────────────────────────────────────────────────────────

async function callGemini(systemPrompt: string, userMessages: Message[]): Promise<string> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not set");
  }

  const contents = [
    { role: "user",  parts: [{ text: systemPrompt }] },
    { role: "model", parts: [{ text: "Entendido. Sou o concierge do The Lucky Trip, especialista em Rio de Janeiro. Responderei apenas com dados reais do nosso banco de curadoria." }] },
    ...userMessages.map((m) => ({
      role:  m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    })),
  ];

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature:     0.7,
          maxOutputTokens: 600,
        },
      }),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini error: ${err}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { query, history = [], deviceId, destination = "Rio de Janeiro" } = body;

    if (!query || !deviceId) {
      return new Response(
        JSON.stringify({ error: "query and deviceId are required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    const supa = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const isPremium = await checkPremium(supa, deviceId);

    const intents = detectIntent(query);

    const contextParts: string[] = [];
    const mentionedPlaces: PlaceRef[] = [];

    if (intents.has("restaurants")) {
      const rows = await fetchRestaurants(supa, query);
      if (rows.length) {
        contextParts.push(
          "RESTAURANTES DISPONÍVEIS (use apenas estes):\n" +
          rows.map((r) =>
            `- ${r.name} (${r.bairro}): ${r.tipo ?? ""} ${r.especialidade ?? ""}. ${r.meu_olhar ?? r.tags ?? ""}. Perfil: ${r.perfil ?? ""}. Seguro mulher: ${r.seguro_mulher ?? ""}`.trim()
          ).join("\n"),
        );
        rows.forEach((r) => mentionedPlaces.push({ id: r.id, name: r.name, bairro: r.bairro, categoria: "restaurante" }));
      }
    }

    if (intents.has("activities")) {
      const rows = await fetchActivities(supa, query);
      if (rows.length) {
        contextParts.push(
          "ATIVIDADES E ATRAÇÕES (use apenas estas):\n" +
          rows.map((a) =>
            `- ${a.name} (${a.bairro}): ${a.descricao ?? ""}. Momento: ${Array.isArray(a.momento) ? a.momento.join(", ") : a.momento ?? ""}. Esforço: ${a.esforco ?? ""}. ${a.meu_olhar ?? ""}`.trim()
          ).join("\n"),
        );
        rows.forEach((a) => mentionedPlaces.push({ id: a.id, name: a.name, bairro: a.bairro, categoria: "atividade" }));
      }
    }

    if (intents.has("hotels")) {
      const rows = await fetchHotels(supa);
      if (rows.length) {
        contextParts.push(
          "HOTÉIS DISPONÍVEIS (use apenas estes):\n" +
          rows.map((h) =>
            `- ${h.name} (${h.bairro}): ${h.my_view ?? ""}. Para: ${h.perfil ?? ""}. ${h.how_to_enjoy ?? ""}`.trim()
          ).join("\n"),
        );
        rows.forEach((h) => mentionedPlaces.push({ id: h.id, name: h.name, bairro: h.bairro, categoria: "hotel" }));
      }
    }

    if (intents.has("neighborhoods")) {
      const rows = await fetchNeighborhoods(supa);
      if (rows.length) {
        contextParts.push(
          "BAIRROS DO RIO (use apenas estes):\n" +
          rows.map((n) =>
            `- ${n.name}: "${n.phrase ?? ""}". ${n.my_view ?? ""}. Gastronomia: ${n.gastronomy ?? ""}/5. Vida noturna: ${n.nightlife ?? ""}/5. Cenário: ${n.scenery ?? ""}/5. Caminhável: ${n.walkable ? "sim" : "não"}. Solo fem: ${n.safety_solo ?? ""}/5`.trim()
          ).join("\n"),
        );
      }
    }

    if (intents.has("lucky_picks")) {
      const rows = await fetchLuckyPicks(supa);
      if (rows.length) {
        contextParts.push(
          "LUCKY PICKS — SELEÇÃO EXCLUSIVA (use apenas estes):\n" +
          rows.map((l) =>
            `- ${l.name} (${l.bairro}): ${l.descricao ?? ""}. ${l.meu_olhar ?? ""}`.trim()
          ).join("\n"),
        );
        rows.forEach((l) => mentionedPlaces.push({ id: l.id, name: l.name, bairro: l.bairro, categoria: l.categoria }));
      }
    }

    const systemPrompt =
`Você é o Lucky, concierge pessoal do app The Lucky Trip — um guia editorial premium focado em ${destination}.

REGRAS ABSOLUTAS:
- Responda APENAS com lugares que aparecem nos dados abaixo. Nunca invente.
- Se os dados não contiverem o que o usuário pediu, diga isso naturalmente.
- Tom: concierge local, editorial, direto. Não genérico. Não ChatGPT.
- Máximo 250 palavras. Sem listas longas. Prefira 2-4 recomendações com detalhe.
- Não use "claro!", "ótima pergunta!", disclaimers ou linguagem corporativa.
- Se tiver meu_olhar no dado, use essa voz editorial.
- Seja específico: mencione bairros, momentos ideais, para quem é.
- Responda em português brasileiro.

DADOS REAIS DA CURADORIA:
${contextParts.join("\n\n") || "Sem dados encontrados para esta consulta. Diga ao usuário que você não tem informações para responder isso agora."}`;

    const allMessages: Message[] = [
      ...history.slice(-6),
      { role: "user", content: query },
    ];

    const answer = await callGemini(systemPrompt, allMessages);

    if (!answer.trim()) {
      return new Response(
        JSON.stringify({ error: "Empty response from AI" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
      );
    }

    return new Response(
      JSON.stringify({ answer: answer.trim(), isPremium, places: mentionedPlaces }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
