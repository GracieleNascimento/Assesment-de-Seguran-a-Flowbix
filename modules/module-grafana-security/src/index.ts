/**
 * Módulo de SEGURANÇA do Grafana (referência de como escrever um módulo).
 *
 * - catalogo(): vem da base de conhecimento (@flowbix/knowledge), verificações GRF-*.
 * - auditar(): consulta a API do Grafana SOMENTE LEITURA (GET) + login opcional.
 *
 * Os módulos TÉCNICOS dos colegas seguem exatamente a mesma interface Modulo,
 * trocando o catálogo e a lógica de auditoria.
 */
import type { Ambiente, Check, ContextoAuditoria, Finding, Modulo, Status } from "@flowbix/core";
import { checksDaPlataforma } from "@flowbix/knowledge";

/** CVEs conhecidas do Grafana (faixas de versão). Revisar no Grafana Security Advisories. */
const GRAFANA_CVES: [string, number, string, [string, string, string][]][] = [
  ["CVE-2021-43798", 7.5, "Path traversal não autenticado permite ler arquivos do servidor (grafana.ini com credenciais). CISA KEV.",
    [["8.0.0", "8.3.0", "8.3.1"]]],
  ["CVE-2021-39226", 7.5, "Bypass de autenticação em snapshots.",
    [["7.0.0", "7.5.10", "7.5.11"], ["8.0.0", "8.1.5", "8.1.6"]]],
  ["CVE-2022-21713", 6.5, "IDOR na API de equipes (ler/alterar times de outra organização).",
    [["8.0.0", "8.3.3", "8.3.4"]]],
];

function vtuple(v: string): [number, number, number] {
  const p = String(v).split(".").map((x) => parseInt(x.replace(/\D/g, ""), 10) || 0);
  return [p[0] ?? 0, p[1] ?? 0, p[2] ?? 0];
}
function cmp(a: [number, number, number], b: [number, number, number]): number {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

export class GrafanaSecurityModule implements Modulo {
  id = "grafana-seguranca";
  nome = "Grafana — Segurança";
  plataforma = "grafana" as const;
  tipo = "seguranca" as const;
  versao = "0.1.0";

  catalogo(): Check[] {
    return checksDaPlataforma("grafana");
  }

  aplicavel(ambiente: Ambiente): boolean {
    return Boolean(ambiente.alvos.grafana?.url);
  }

  async auditar(ctx: ContextoAuditoria): Promise<Finding[]> {
    const cfg = ctx.ambiente.alvos.grafana!;
    const base = String(cfg.url).replace(/\/+$/, "");
    const verificarTls = cfg.verificarTls !== false;
    const achados: Finding[] = [];
    const add = (checkId: string, status: Status, evidencia: string, detalhes?: string[]) =>
      achados.push({ checkId, status, evidencia, alvo: "Grafana", detalhes });

    const headers: Record<string, string> = { "User-Agent": "flowbix-sec-audit/1.0" };
    if (cfg.apiToken) headers.Authorization = `Bearer ${cfg.apiToken}`;
    else if (cfg.usuario) {
      const b64 = Buffer.from(`${cfg.usuario}:${cfg.senha ?? ""}`).toString("base64");
      headers.Authorization = `Basic ${b64}`;
    }

    // TLS inseguro: toggle local do Node (ambiente interno). Restaurado ao fim.
    const tlsAntes = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    if (!verificarTls) process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    const get = (path: string) => fetch(base + path, { headers, redirect: "manual" });

    try {
      // saúde/versão
      let versao = "";
      try {
        const h = await get("/api/health");
        versao = ((await h.json()) as { version?: string }).version ?? "";
      } catch (e) {
        add("GRF-01", "ERRO", `Grafana inacessível em ${base}: ${(e as Error).message}`);
        return achados;
      }
      const vt = versao ? vtuple(versao) : ([0, 0, 0] as [number, number, number]);

      if (!versao) add("GRF-01", "WARN", "Não foi possível identificar a versão do Grafana.");
      else if (cmp(vt, [9, 0, 0]) < 0) add("GRF-01", "WARN", `Grafana ${versao}: versão antiga (anterior à 9.0).`);
      else add("GRF-01", "PASS", `Grafana ${versao}.`);

      // CVEs
      if (versao) {
        const afetadas: string[] = [];
        for (const [cve, cvss, desc, faixas] of GRAFANA_CVES) {
          for (const [min, max, fix] of faixas) {
            if (cmp(vtuple(min), vt) <= 0 && cmp(vt, vtuple(max)) <= 0) {
              afetadas.push(`${cve} (CVSS ${cvss}) – ${desc} Corrigido em ${fix}.`);
            }
          }
        }
        if (afetadas.length) add("GRF-02", "FAIL", `${afetadas.length} CVE(s) conhecidas afetam o Grafana ${versao}.`, afetadas);
        else add("GRF-02", "PASS", `Nenhuma CVE da base local afeta ${versao}. Confira o Grafana Security Advisories.`);
      }

      // credencial padrão (opcional)
      if (ctx.opcoes.testarSenhaPadrao) {
        try {
          const r = await fetch(base + "/login", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user: "admin", password: "admin" }),
          });
          if (r.status === 200) add("GRF-03", "FAIL", "Login com admin/admin foi ACEITO pelo Grafana.");
          else add("GRF-03", "PASS", `Login admin/admin recusado (HTTP ${r.status}).`);
        } catch (e) {
          add("GRF-03", "ERRO", `Falha ao testar login: ${(e as Error).message}`);
        }
      } else {
        add("GRF-03", "NA", "Teste desabilitado (opção testarSenhaPadrao: false).");
      }

      // configurações (exige admin)
      let settings: Record<string, Record<string, unknown>> | null = null;
      try {
        const rs = await get("/api/admin/settings");
        if (rs.status === 200) settings = (await rs.json()) as Record<string, Record<string, unknown>>;
      } catch { /* ignore */ }
      const sec = (secao: string, chave: string, padrao = "") =>
        String((settings?.[secao]?.[chave] ?? padrao)).toLowerCase();

      if (!settings) {
        for (const cid of ["GRF-04", "GRF-05", "GRF-07", "GRF-08", "GRF-09", "GRF-12", "GRF-13", "GRF-14"]) {
          add(cid, "WARN", "Configuração não acessível (requer token/conta de Admin do Grafana).");
        }
        add("GRF-15", "WARN", "Sem acesso de Admin: avaliação parcial (só versão e frontend).");
      } else {
        add("GRF-15", "PASS", "Configuração acessível via API de Admin.");
        add("GRF-04", sec("auth.anonymous", "enabled") === "true" ? "FAIL" : "PASS",
          `auth.anonymous.enabled=${sec("auth.anonymous", "enabled") || "false"}`
          + (sec("auth.anonymous", "enabled") === "true" ? `, org_role=${sec("auth.anonymous", "org_role")}` : ""));
        add("GRF-05", sec("users", "allow_sign_up") === "true" ? "FAIL" : "PASS",
          `users.allow_sign_up=${sec("users", "allow_sign_up") || "false"}`);
        add("GRF-07", sec("security", "cookie_secure") === "true" ? "PASS" : "WARN",
          `cookie_secure=${sec("security", "cookie_secure") || "false"}, cookie_samesite=${sec("security", "cookie_samesite") || "-"}`);
        add("GRF-08", sec("security", "allow_embedding") === "true" ? "WARN" : "PASS",
          `allow_embedding=${sec("security", "allow_embedding") || "false"}`);
        add("GRF-09", sec("security", "content_security_policy") === "true" ? "PASS" : "WARN",
          `content_security_policy=${sec("security", "content_security_policy") || "false"}`);
        add("GRF-12", sec("auth", "disable_brute_force_login_protection") === "true" ? "FAIL" : "PASS",
          `disable_brute_force_login_protection=${sec("auth", "disable_brute_force_login_protection") || "false"}`);
        const unsigned = sec("plugins", "allow_loading_unsigned_plugins");
        add("GRF-13", unsigned.trim() ? "WARN" : "PASS", `allow_loading_unsigned_plugins=${unsigned || "(vazio)"}`);
        add("GRF-14", sec("snapshots", "external_enabled") === "true" ? "WARN" : "PASS",
          `snapshots.external_enabled=${sec("snapshots", "external_enabled") || "false"}`);
      }

      // administradores
      try {
        const r = await get("/api/users?perpage=1000&page=1");
        if (r.status === 200) {
          const us = (await r.json()) as { login?: string; email?: string; isAdmin?: boolean }[];
          const admins = us.filter((u) => u.isAdmin).map((u) => u.login || u.email || "?");
          const limite = Number(ctx.opcoes.maxAdmins ?? 3);
          add("GRF-10", admins.length <= limite ? "PASS" : "WARN",
            `${admins.length} administrador(es) de servidor de ${us.length} usuários (limite recomendado: ${limite}).`, admins);
        } else {
          add("GRF-10", "WARN", "Lista de usuários indisponível (requer Admin do servidor).");
        }
      } catch (e) {
        add("GRF-10", "ERRO", (e as Error).message);
      }

      // chaves de API / service accounts sem expiração
      try {
        const sem: string[] = [];
        let total = 0;
        let acessou = false;
        const rk = await get("/api/auth/keys?includeExpired=false");
        if (rk.status === 200) {
          acessou = true;
          for (const k of (await rk.json()) as { name?: string; expiration?: string }[]) {
            total++;
            if (!k.expiration) sem.push(`API key: ${k.name}`);
          }
        }
        const rsa = await get("/api/serviceaccounts/search?perpage=1000");
        if (rsa.status === 200) {
          acessou = true;
          const sas = ((await rsa.json()) as { serviceAccounts?: { id: number; login?: string; name?: string }[] }).serviceAccounts ?? [];
          for (const sa of sas) {
            const rt = await get(`/api/serviceaccounts/${sa.id}/tokens`);
            if (rt.status === 200) {
              for (const t of (await rt.json()) as { name?: string; expiration?: string }[]) {
                total++;
                if (!t.expiration) sem.push(`service account ${sa.login || sa.name}: token ${t.name}`);
              }
            }
          }
        }
        if (!acessou) add("GRF-11", "WARN", "Chaves/service accounts indisponíveis (requer Admin).");
        else add("GRF-11", sem.length ? "WARN" : "PASS", `${total} chave(s)/token(s); ${sem.length} sem expiração.`, sem);
      } catch (e) {
        add("GRF-11", "ERRO", (e as Error).message);
      }

      // HTTPS do frontend
      if (base.startsWith("https://")) add("GRF-06", "PASS", "Frontend acessado via HTTPS.");
      else if (settings && ["https", "h2"].includes(sec("server", "protocol")))
        add("GRF-06", "WARN", "URL informada em HTTP, mas server.protocol=https (verificar proxy/URL).");
      else add("GRF-06", "FAIL", `Frontend acessado por HTTP (${base}).`);

      return achados;
    } finally {
      if (!verificarTls) {
        if (tlsAntes === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
        else process.env.NODE_TLS_REJECT_UNAUTHORIZED = tlsAntes;
      }
    }
  }
}

export default new GrafanaSecurityModule();
