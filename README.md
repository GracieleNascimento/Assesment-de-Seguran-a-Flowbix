# Flowbix Assessment (plataforma modular)

Plataforma única de **assessment de ambientes de monitoramento** da Flowbix, unindo o
**assessment técnico** (health, performance, governança, datasources, dashboards…) e o
**assessment de segurança** (Zabbix, Grafana, Elastic, Graylog) sob o mesmo motor,
relatório e **portão de comitê** (go/no-go) antes de entregar o ambiente ao cliente.

A ideia central: **tudo é módulo**. O módulo técnico de Grafana dos colegas e o módulo de
segurança de Grafana seguem a **mesma interface** e produzem **achados no mesmo formato**.
Assim o motor, o relatório e o comitê tratam técnico e segurança como uma coisa só.

## Stack

- Node.js ≥ 18, TypeScript, monorepo com workspaces do npm.
- Servidor: Fastify (`apps/server`). CLI de testes: `apps/cli`.

## Estrutura

```
flowbix-assessment/
├─ packages/
│  ├─ core/        @flowbix/core      → contrato de módulo, motor, score, comitê
│  ├─ knowledge/   @flowbix/knowledge → base de segurança (kb.json: verificações, normas,
│  │                                    ameaças, casos reais, links) exportada do projeto Python
│  └─ report/      @flowbix/report    → relatório HTML com a marca Flowbix
├─ modules/
│  └─ module-grafana-security/        → módulo de SEGURANÇA do Grafana (referência)
├─ apps/
│  ├─ server/      @flowbix/server    → API REST
│  └─ cli/         @flowbix/cli       → runner de linha de comando
└─ examples/ambiente.exemplo.json
```

## Como rodar no PC (passo a passo)

> Testado em Windows 10/11, mas funciona igual em Linux/macOS. **Importante:** use uma
> pasta "normal" (ex.: `C:\Projetos\flowbix-assessment`). Evite rodar de dentro de pastas
> sincronizadas/virtualizadas (OneDrive, AppData de apps da Store), onde os links do
> `npm workspaces` podem falhar.

### 1. Instalar o Node.js 18+ (uma vez)
- Baixe o instalador LTS em https://nodejs.org e instale (next, next, finish), **ou**
  no Windows, via terminal: `winget install OpenJS.NodeJS.LTS`
- Feche e reabra o terminal. Confira:
  ```bash
  node --version
  npm --version
  ```

### 2. Baixar o projeto
- **Com git:**
  ```bash
  git clone https://github.com/<ORG-OU-USUARIO>/flowbix-assessment.git
  cd flowbix-assessment
  ```
- **Sem git:** baixe o ZIP pelo botão verde "Code → Download ZIP" no GitHub, extraia e
  abra o terminal na pasta extraída.

### 3. Instalar as dependências e compilar
```bash
npm install
npm run build
```

### 4. Rodar
**Servidor (API + relatório):**
```bash
npm start
```
Abre em `http://localhost:8090`. Mude a porta com `PORT=9000 npm start`.

**Teste rápido pela linha de comando** (gera um relatório HTML de um ambiente):
```bash
# 1) copie o exemplo e ajuste a URL do Grafana do cliente
copy examples\ambiente.exemplo.json meu-ambiente.json   # Windows
# (Linux/macOS: cp examples/ambiente.exemplo.json meu-ambiente.json)

# 2) informe o token do Grafana por variável de ambiente (não grave em arquivo)
set GRAFANA_TOKEN=glsa_xxx        # Windows (PowerShell: $env:GRAFANA_TOKEN="glsa_xxx")

# 3) rode
node apps/cli/dist/index.js meu-ambiente.json relatorio.html
```
Abra `relatorio.html` no navegador.

### 5. Como descrever um ambiente (arquivo JSON)
```json
{
  "nome": "Cliente X",
  "alvos": {
    "grafana": { "url": "https://grafana.cliente.com.br", "apiToken": "env:GRAFANA_TOKEN", "verificarTls": true }
  },
  "opcoes": { "testarSenhaPadrao": false, "maxAdmins": 3 }
}
```
- Use `"env:NOME_DA_VARIAVEL"` em qualquer senha/token para ler de variável de ambiente
  (evita gravar segredo em arquivo).
- Adicione outras plataformas em `alvos` conforme forem portadas (zabbix, elastic, graylog).

### Problemas comuns
- **`node` não é reconhecido:** feche e reabra o terminal após instalar o Node.
- **Erro de `npm install` atrás de proxy corporativo:** configure `npm config set proxy ...`.
- **TLS/certificado autoassinado no Grafana do cliente:** use `"verificarTls": false` no
  alvo (apenas para ambientes internos/confiáveis).
- **`Cannot find module '@flowbix/...'`:** você está rodando de uma pasta virtualizada
  (OneDrive/AppData da Store). Mova o projeto para `C:\Projetos\...` e rode `npm install` de novo.

## Como era antes (CLI/servidor rápido)

```bash
node apps/server/dist/index.js        # http://localhost:8090
node apps/cli/dist/index.js meu-ambiente.json relatorio.html
```

## O contrato de módulo (para os colegas migrarem o assessment técnico)

Todo módulo implementa a interface `Modulo` de `@flowbix/core`:

```ts
import type { Modulo, Check, Finding, Ambiente, ContextoAuditoria } from "@flowbix/core";

export class GrafanaTecnicoModule implements Modulo {
  id = "grafana-tecnico";
  nome = "Grafana — Técnico";
  plataforma = "grafana";
  tipo = "tecnico";           // "tecnico" | "seguranca"
  versao = "0.1.0";

  catalogo(): Check[] { /* lista das verificações que o módulo produz */ }
  aplicavel(amb: Ambiente): boolean { return Boolean(amb.alvos.grafana?.url); }
  async auditar(ctx: ContextoAuditoria): Promise<Finding[]> { /* SOMENTE LEITURA */ }
}
export default new GrafanaTecnicoModule();
```

Pontos do contrato:

- **Check** (catálogo): `id`, `plataforma`, `tipo`, `titulo`, `categoria`, `severidade`
  (`CRITICO|ALTO|MEDIO|BAIXO|INFO`), `recomendacao`, `refs` (norma → controles) e, opcional,
  `ameaca` (por que é risco + casos reais).
- **Finding** (achado): `checkId`, `status` (`PASS|FAIL|WARN|NA|ERRO|MANUAL`), `evidencia`,
  `alvo`, `detalhes?`. O motor junta o Finding ao Check pelo `checkId` e calcula o score.
- **Somente leitura**: módulos nunca alteram o ambiente do cliente.
- Registre o módulo em `apps/server/src/registro.ts` (e no CLI) — nada mais muda.

O mapeamento do assessment técnico dos colegas para esse contrato é: cada "verificação"
atual vira um `Check` no `catalogo()`, e o coletor atual passa a devolver `Finding[]`.
O score, o relatório, o resumo por plataforma e o comitê já funcionam para ambos.

## Base de conhecimento de segurança

`packages/knowledge/data/kb.json` é gerado a partir do projeto Python
(`zabbix_sec_audit/scripts/exportar_kb.py`): 89 verificações em 4 plataformas, com normas
(ISO 27001/27002, NIST CSF 2.0, CIS, OWASP, LGPD, Anatel), contexto de ameaça e **casos
reais documentados com links** (CISA KEV, NCSC, NVD, CERT.br…). Para atualizar, rode o
exportador e substitua o arquivo.

## Comitê (go/no-go)

`avaliarComite()` aplica os critérios de aceite (sem CRÍTICO em falha, sem ALTO em falha,
índice mínimo) e recomenda **go / condicional / no-go**. A decisão final é humana e fica
registrada (quem aprovou, quando) como evidência do repasse.

## Situação atual (scaffold)

- ✅ Núcleo (contrato, motor, score, comitê), base de conhecimento, relatório, servidor, CLI.
- ✅ Módulo de referência: **Grafana — Segurança** (porta do auditor Python).
- ⏳ A portar como módulos: Zabbix/Elastic/Graylog segurança (lógica já existe no projeto
  Python) e os módulos técnicos dos colegas (migrar para o contrato acima).
- ⏳ UI web rica (hoje o servidor entrega JSON + relatório HTML; a UI pode consumir a API).
```
