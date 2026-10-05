/** Renderização do relatório de assessment (HTML) no padrão visual escuro Flowbix. */
import type { AchadoCompleto, Severidade, Status } from "@flowbix/core";
import type { ResultadoAssessment } from "@flowbix/core";
import type { ResultadoComite } from "@flowbix/core";
import { normas as NORMAS, normaUrls as NORMA_URLS, plataformas as PLATAFORMAS } from "@flowbix/knowledge";
import * as marca from "./marca.js";

export { marca };

const STATUS_LABEL: Record<Status, string> = {
  PASS: "Conforme", FAIL: "Não conforme", WARN: "Atenção", NA: "Não aplicável", ERRO: "Erro", MANUAL: "Manual",
};
const ORDEM_STATUS: Record<Status, number> = { FAIL: 0, ERRO: 1, WARN: 2, MANUAL: 3, PASS: 4, NA: 5 };
const SEV_ORDER: Severidade[] = ["CRITICO", "ALTO", "MEDIO", "BAIXO", "INFO"];

const e = (s: unknown): string =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

function corScore(score: number | null): string {
  if (score === null) return "var(--mut)";
  return score >= 75 ? "var(--pass)" : score >= 50 ? "var(--warn)" : "var(--fail)";
}
function grau(score: number | null): string {
  if (score === null) return "-";
  for (const [lim, g] of [[90, "A"], [75, "B"], [60, "C"], [40, "D"]] as const) if (score >= lim) return g;
  return "E";
}

const CSS = `
:root{
  --bg:#0e1013;--bg2:#14171d;--card:#171b22;--card2:#1d222b;--bd:#262b34;--tx:#e6e9ef;--mut:#9aa3b2;
  --pri:#D2001E;--pri2:#ff4d63;
  --fail:#e5484d;--warn:#f5a623;--pass:#2fa84f;--na:#6b7280;--info:#3b82f6;--erro:#8b5cf6;--manual:#6b7280;
  --crit:#b00018;
}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--tx);font:14px/1.55 ${marca.FONTE};-webkit-font-smoothing:antialiased}
a{color:var(--pri2);text-decoration:none}a:hover{text-decoration:underline}
.topbar{position:sticky;top:0;z-index:50;display:flex;align-items:center;gap:16px;padding:12px 24px;
  background:#0a0c0f;border-bottom:1px solid var(--bd);flex-wrap:wrap}
.topbar .logo svg{filter:brightness(0) invert(1)}
.topbar .tt{font-weight:600}.topbar .mut{color:var(--mut)}
.badges{display:flex;gap:8px;flex-wrap:wrap;margin-left:auto}
.badge{display:inline-flex;align-items:center;gap:6px;background:var(--card2);border:1px solid var(--bd);
  border-radius:20px;padding:4px 12px;font-size:12px;color:var(--tx)}
.badge .dot{width:8px;height:8px;border-radius:50%;background:var(--pass)}
main{max-width:1180px;margin:0 auto;padding:24px 20px 60px}
.leitura{display:flex;align-items:center;gap:10px;background:rgba(47,168,79,.09);border:1px solid rgba(47,168,79,.35);
  color:#8fe0a6;border-radius:10px;padding:10px 14px;margin-bottom:20px;font-size:13px}
h2{font-size:15px;letter-spacing:.02em;text-transform:uppercase;color:var(--mut);margin:34px 0 14px;font-weight:600}
h3{font-size:14px;margin:20px 0 8px;color:var(--tx)}
.grid{display:grid;gap:14px}.g-kpi{grid-template-columns:repeat(auto-fill,minmax(150px,1fr))}
.card{background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:16px}
.kpi .l{color:var(--mut);font-size:11px;text-transform:uppercase;letter-spacing:.05em}
.kpi .v{font-size:30px;font-weight:700;margin-top:6px}
.kpi.alerta .v{color:var(--fail)}.kpi.aten .v{color:var(--warn)}
.score-wrap{display:flex;gap:24px;align-items:center;flex-wrap:wrap}
.ring{width:140px;height:140px;border-radius:50%;display:grid;place-items:center;flex:none;
  background:conic-gradient(var(--rc) calc(var(--p)*1%),#2a2f39 0)}
.ring .in{width:108px;height:108px;border-radius:50%;background:var(--card);display:grid;place-items:center;text-align:center}
.ring .n{font-size:30px;font-weight:700;line-height:1}.ring .g{font-size:12px;color:var(--mut)}
.dims{flex:1;min-width:280px;display:flex;flex-direction:column;gap:9px}
.dim{display:grid;grid-template-columns:150px 1fr 42px;gap:12px;align-items:center;font-size:13px}
.dim .bar{height:9px;background:#2a2f39;border-radius:5px;overflow:hidden}.dim .bar i{display:block;height:100%;border-radius:5px}
.dim .sc{text-align:right;color:var(--mut);font-variant-numeric:tabular-nums}
.distrib{height:14px;border-radius:7px;overflow:hidden;display:flex;margin:4px 0 10px}
.distrib span{display:block}
.leg{display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:var(--mut)}
.leg b{color:var(--tx)}.leg i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px}
table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--bd);border-radius:12px;overflow:hidden}
th,td{padding:9px 12px;border-bottom:1px solid var(--bd);text-align:left;vertical-align:top}
th{font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:.04em}
tbody tr:last-child td{border-bottom:none}
.tag{display:inline-block;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600;color:#fff;white-space:nowrap}
.s-CRITICO{background:var(--crit)}.s-ALTO{background:var(--pri)}.s-MEDIO{background:var(--warn);color:#1a1205}
.s-BAIXO{background:#8a7a12}.s-INFO{background:var(--na)}
.t-PASS{background:var(--pass)}.t-FAIL{background:var(--fail)}.t-WARN{background:var(--warn);color:#1a1205}
.t-NA,.t-MANUAL{background:var(--na)}.t-ERRO{background:var(--erro)}
.bloq{background:transparent;border:1px solid var(--fail);color:var(--fail)}
.ach{background:var(--card);border:1px solid var(--bd);border-left:3px solid var(--na);border-radius:10px;margin:10px 0}
.ach.c-FAIL{border-left-color:var(--fail)}.ach.c-WARN{border-left-color:var(--warn)}.ach.c-PASS{border-left-color:var(--pass)}
.ach summary{cursor:pointer;padding:12px 14px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;list-style:none}
.ach summary::-webkit-details-marker{display:none}
.ach summary b{flex:1;min-width:240px;font-weight:600}
.ach .body{padding:2px 16px 16px;border-top:1px solid var(--bd);color:var(--tx)}
.ach .body p{margin:9px 0}.mut{color:var(--mut)}.peq{font-size:12px}
.refs span{display:inline-block;border:1px solid var(--bd);border-radius:6px;padding:2px 7px;margin:3px 3px 0 0;font-size:12px}
.ameaca{border-left:3px solid var(--pri);background:rgba(210,0,30,.08);padding:10px 14px;border-radius:0 8px 8px 0;margin:12px 0}
.ameaca p{margin:6px 0}.caso{border-top:1px solid var(--bd);padding:8px 0;margin-top:4px}
.gate{border-radius:12px;padding:18px 20px;margin-bottom:22px;border:1px solid}
.gate .d{font-size:22px;font-weight:700;margin:0 0 4px}
.gate.go{background:rgba(47,168,79,.1);border-color:rgba(47,168,79,.5)}.gate.go .d{color:#8fe0a6}
.gate.cond{background:rgba(245,166,35,.1);border-color:rgba(245,166,35,.5)}.gate.cond .d{color:#f5c56a}
.gate.nogo{background:rgba(229,72,77,.1);border-color:rgba(229,72,77,.5)}.gate.nogo .d{color:#f1878a}
.gate ul{margin:10px 0 0;padding-left:0;list-style:none;font-size:13px}.gate li{margin:4px 0}
footer{color:var(--mut);font-size:12px;text-align:center;padding:30px 20px;border-top:1px solid var(--bd);margin-top:40px}
footer .fb{color:var(--pri2);font-weight:700}
`;

function distribBar(ct: Record<Status, number>): string {
  const ordem: [Status, string][] = [["FAIL", "var(--fail)"], ["WARN", "var(--warn)"], ["ERRO", "var(--erro)"],
    ["MANUAL", "var(--manual)"], ["NA", "var(--na)"], ["PASS", "var(--pass)"]];
  const total = Object.values(ct).reduce((a, b) => a + b, 0) || 1;
  const segs = ordem.filter(([s]) => ct[s]).map(([s, c]) =>
    `<span style="width:${(100 * (ct[s] || 0)) / total}%;background:${c}" title="${STATUS_LABEL[s]}: ${ct[s]}"></span>`).join("");
  const leg = ordem.filter(([s]) => ct[s]).map(([s, c]) =>
    `<span><i style="background:${c}"></i>${STATUS_LABEL[s]} <b>${ct[s]}</b></span>`).join("");
  return `<div class="distrib">${segs}</div><div class="leg">${leg}</div>`;
}

function blocoAmeaca(a: AchadoCompleto): string {
  if (a.status === "PASS" || a.status === "ERRO" || !a.check.ameaca) return "";
  const am = a.check.ameaca;
  const p = [`<div class='ameaca'><p><b>Por que isso é um risco:</b> ${e(am.por_que)}</p>`];
  if (am.impacto) p.push(`<p><b>Impacto potencial:</b> ${e(am.impacto)}</p>`);
  if (am.mitre.length) p.push(`<p class='mut peq'><b>MITRE ATT&amp;CK:</b> ` +
    am.mitre.map((t) => `<a href='${e(t.url)}' target='_blank' rel='noopener'>${e(t.id)}</a> (${e(t.nome)})`).join(", ") + `</p>`);
  if (a.casos.length) {
    p.push(`<p style='margin:8px 0 4px'><b>Casos reais documentados:</b></p>`);
    for (const c of a.casos) {
      const fontes = c.fontes.map((f) => `<a href='${e(f.url)}' target='_blank' rel='noopener'>${e(f.nome)}</a>`).join(" · ");
      p.push(`<div class='caso'><b>${e(c.titulo)}</b> <span class='mut'>(${c.ano})</span><div>${e(c.resumo)}</div><div class='peq'>Fontes: ${fontes}</div></div>`);
    }
  }
  return p.join("") + "</div>";
}

export interface OpcoesRelatorio { comite?: ResultadoComite; }

export function renderRelatorio(r: ResultadoAssessment, opts: OpcoesRelatorio = {}): string {
  const { achados, resumo } = r;
  const ct = resumo.contagem;
  const nc = resumo.naoConformesPorSeveridade;
  const plats = [...new Set(r.modulos.map((m) => PLATAFORMAS[m.plataforma] ?? m.plataforma))];
  const h: string[] = [];
  h.push(`<!doctype html><html lang='pt-BR'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>`);
  h.push(`<link rel='icon' href="data:image/svg+xml,${encodeURIComponent(marca.faviconSvg())}">`);
  h.push(`<title>Assessment de Segurança — ${e(r.ambiente)}</title><style>${CSS}</style></head><body>`);

  // top bar
  h.push(`<div class='topbar'><span class='logo'>${marca.wordmark("#fff", 22)}</span>`);
  h.push(`<span class='tt'>Security Audit <span class='mut'>— ${e(r.ambiente)}</span></span>`);
  h.push(`<span class='badges'>`);
  for (const p of plats) h.push(`<span class='badge'><span class='dot'></span>${e(p)}</span>`);
  h.push(`<span class='badge'>${new Date(r.geradoEm).toLocaleDateString("pt-BR")}</span>`);
  h.push(`</span></div><main>`);

  h.push(`<div class='leitura'>🛡️ Coleta 100% somente leitura${r.executadoPor ? " · executado por " + e(r.executadoPor) : ""}.</div>`);

  // comitê
  if (opts.comite) {
    const g = opts.comite;
    const cls = g.recomendacao === "go" ? "go" : g.recomendacao === "condicional" ? "cond" : "nogo";
    const label = g.recomendacao === "go" ? "APTO PARA REPASSE (GO)"
      : g.recomendacao === "condicional" ? "REPASSE CONDICIONAL" : "NÃO APTO (NO-GO)";
    h.push(`<div class='gate ${cls}'><p class='d'>Comitê — ${label}</p><ul>`);
    for (const c of g.criterios) h.push(`<li>${c.ok ? "✓" : "✗"} ${e(c.titulo)}${c.obrigatorio ? "" : " (recomendado)"} — <span class='mut'>${e(c.detalhe)}</span></li>`);
    h.push(`</ul></div>`);
  }

  // KPIs
  h.push(`<div class='grid g-kpi'>`);
  h.push(kpi("Índice", `${resumo.score ?? "-"}%`, `Nota ${resumo.nota}`));
  h.push(kpi("Verificações", String(achados.length), `${ct.PASS || 0} conformes`));
  h.push(kpi("NC Crítico", String(nc.CRITICO || 0), "", (nc.CRITICO || 0) > 0));
  h.push(kpi("NC Alto", String(nc.ALTO || 0), "", (nc.ALTO || 0) > 0));
  h.push(kpi("Atenção", String(ct.WARN || 0), "", false, true));
  h.push(kpi("Módulos", String(r.modulos.length), plats.join(", ")));
  h.push(`</div>`);

  // score + dimensões (estilo Health Score)
  const dims: [string, number | null][] = [
    ...Object.entries(resumo.porPlataforma).map(([p, d]) => [PLATAFORMAS[p] ?? p, d.score] as [string, number | null]),
  ];
  h.push(`<h2>Score e dimensões</h2><div class='card score-wrap'>`);
  h.push(`<div class='ring' style='--p:${resumo.score ?? 0};--rc:${corScore(resumo.score)}'><div class='in'><div class='n' style='color:${corScore(resumo.score)}'>${resumo.score ?? "-"}</div><div class='g'>/100 · grau ${grau(resumo.score)}</div></div></div>`);
  h.push(`<div class='dims'>`);
  for (const [nome, sc] of dims) {
    h.push(`<div class='dim'><span>${e(nome)}</span><span class='bar'><i style='width:${sc ?? 0}%;background:${corScore(sc)}'></i></span><span class='sc'>${sc ?? "-"}</span></div>`);
  }
  h.push(`</div></div>`);

  // distribuição
  h.push(`<h2>Distribuição das ${achados.length} verificações</h2><div class='card'>${distribBar(ct)}</div>`);

  // por norma
  h.push(`<h2>Aderência por norma / framework</h2><div class='card'><div class='dims'>`);
  for (const [k, nome] of Object.entries(NORMAS)) {
    const sc = resumo.porNorma[k] ?? null;
    h.push(`<div class='dim'><span><a href='${e(NORMA_URLS[k] ?? "#")}' target='_blank' rel='noopener'>${e(nome.split(" ")[0])}</a></span><span class='bar'><i style='width:${sc ?? 0}%;background:${corScore(sc)}'></i></span><span class='sc'>${sc ?? "-"}%</span></div>`);
  }
  h.push(`</div></div>`);

  // achados
  h.push(`<h2>Achados (${achados.length})</h2>`);
  const ord = [...achados].sort((a, b) =>
    a.check.categoria.localeCompare(b.check.categoria) ||
    ORDEM_STATUS[a.status] - ORDEM_STATUS[b.status] ||
    SEV_ORDER.indexOf(a.check.severidade) - SEV_ORDER.indexOf(b.check.severidade));
  let cat = "";
  for (const a of ord) {
    if (a.check.categoria !== cat) { cat = a.check.categoria; h.push(`<h3>${e(cat)}</h3>`); }
    const refs = Object.entries(a.check.refs).map(([k, lst]) =>
      `<span><b>${e(k)}</b> ` + lst.map((r2) => `<a href='${e(r2.url ?? "#")}' target='_blank' rel='noopener'>${e(r2.controle)}</a>`).join(", ") + `</span>`).join("");
    const det = (a.detalhes ?? []).map((d) => `<li>${e(d)}</li>`).join("");
    const bloq = a.status === "FAIL" && ["CRITICO", "ALTO"].includes(a.check.severidade);
    const aberto = bloq ? "open" : "";
    h.push(`<details class='ach c-${a.status}' ${aberto}><summary>` +
      `<span class='tag t-${a.status}'>${STATUS_LABEL[a.status]}</span>` +
      `<span class='tag s-${a.check.severidade}'>${a.check.severidade}</span>` +
      (bloq ? `<span class='tag bloq'>bloqueante</span>` : ``) +
      `<b>${e(a.checkId)} · ${e(a.check.titulo)}</b><span class='mut peq'>${e(a.alvo)}</span></summary>` +
      `<div class='body'><p><b>Evidência:</b> ${e(a.evidencia)}</p>${det ? `<ul class='peq'>${det}</ul>` : ""}` +
      `${blocoAmeaca(a)}<p><b>Recomendação:</b> ${e(a.check.recomendacao)}</p><div class='refs'>${refs}</div></div></details>`);
  }

  h.push(`</main><footer><span class='fb'>${marca.EMPRESA}</span> · ${marca.TAGLINE} · ${marca.SITE}</footer></body></html>`);
  return h.join("");
}

function kpi(label: string, valor: string, sub = "", alerta = false, aten = false): string {
  const cls = alerta ? "kpi alerta" : aten ? "kpi aten" : "kpi";
  return `<div class='card ${cls}'><div class='l'>${e(label)}</div><div class='v'>${e(valor)}</div>${sub ? `<div class='mut peq'>${e(sub)}</div>` : ""}</div>`;
}
