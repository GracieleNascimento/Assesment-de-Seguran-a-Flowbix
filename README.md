# Flowbix Assessment (plataforma modular)

Plataforma única de **assessment de ambientes de monitoramento** da Flowbix, unindo o
**assessment técnico** (health, performance, governança, datasources, dashboards…) e o
**assessment de segurança** (Zabbix, Grafana, Elastic, Graylog) sob o mesmo motor,
relatório e **portão de comitê** (go/no-go) antes de entregar o ambiente ao cliente.

A ideia central: **tudo é módulo**. O módulo técnico de Grafana dos colegas e o módulo de
segurança de Grafana seguem a **mesma interface** e produzem **achados no mesmo formato**.
Assim o motor, o relatório e o comitê tratam técnico e segurança como uma coisa só.

## Stack

- Node.js ≥ 20.19, TypeScript, monorepo com workspaces do npm.
- **API** (`apps/server`): Fastify 5 em arquitetura **MVC**, PostgreSQL + Prisma 7,
  validação com Zod, autenticação JWT com perfis, documentação OpenAPI/Swagger em `/docs`.
- CLI de testes: `apps/cli`.

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
│  ├─ server/      @flowbix/server    → API REST (MVC) — ver "API" abaixo
│  └─ cli/         @flowbix/cli       → runner de linha de comando
├─ docker-compose.yml                 → Postgres de desenvolvimento
└─ examples/ambiente.exemplo.json
```

## Como rodar no PC (passo a passo)

> Testado em Windows 10/11, mas funciona igual em Linux/macOS. **Importante:** use uma
> pasta "normal" (ex.: `C:\Projetos\flowbix-assessment`). Evite rodar de dentro de pastas
> sincronizadas/virtualizadas (OneDrive, AppData de apps da Store), onde os links do
> `npm workspaces` podem falhar.

### 1. Instalar o Node.js 20+ e o Docker Desktop (uma vez)
- Baixe o instalador LTS em https://nodejs.org e instale (next, next, finish), **ou**
  no Windows, via terminal: `winget install OpenJS.NodeJS.LTS`
- Docker Desktop (para o Postgres): https://www.docker.com/products/docker-desktop
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

### 3. Instalar, configurar e preparar o banco
```bash
npm install
copy appsserver.env.example appsserver.env   # Linux/macOS: cp
# edite apps/server/.env: JWT_SECRET (aleatório, 32+ caracteres) e ADMIN_EMAIL/ADMIN_SENHA

npm run db:up        # sobe o Postgres no Docker
npm run db:deploy    # cria as tabelas (migrations)
npm run db:seed      # cria o primeiro ADMIN a partir do .env
npm run build
```

### 4. Rodar
**API:**
```bash
npm start            # produção (código compilado)
npm run dev          # desenvolvimento (recarrega ao salvar)
```
Abre em `http://localhost:8090` → redireciona para a documentação interativa em `/docs`.
Faça login em `POST /api/v1/auth/login`, copie o `token` e clique em **Authorize**.

**Testes de integração** (usam o banco `flowbix_assessment_teste`, recriado a cada execução):
```bash
npm test
```

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

## API (apps/server) — arquitetura MVC

```
apps/server/
├─ prisma/
│  ├─ schema.prisma        → tabelas: usuarios, ambientes, assessments, decisoes_comite
│  ├─ migrations/          → histórico versionado do banco
│  └─ seed.ts              → cria o primeiro ADMIN
├─ src/
│  ├─ server.ts            → entrada: sobe a API, desligamento gracioso
│  ├─ app.ts               → monta o Fastify (plugins + container + rotas)
│  ├─ container.ts         → injeção de dependências: Models → Services → Controllers
│  ├─ config/env.ts        → variáveis de ambiente validadas (falha cedo se faltar algo)
│  │
│  ├─ routes/              → URL + método + middlewares + schema → controller
│  ├─ middlewares/         → autenticar (JWT) e autorizar (perfil)
│  ├─ validators/          → schemas Zod de ENTRADA (body, query, params)
│  ├─ controllers/  (C)    → recebe a requisição validada, chama o service, devolve a view
│  ├─ services/            → regras de negócio (sem HTTP, sem SQL)
│  ├─ models/       (M)    → acesso ao banco via Prisma (único lugar com consultas)
│  ├─ views/        (V)    → formato de SAÍDA: schema da resposta + render (JSON e HTML)
│  │
│  ├─ engine/              → integração com o motor: registro de módulos + executor assíncrono
│  ├─ plugins/             → infraestrutura: erros, segurança, banco, JWT, Swagger
│  └─ lib/                 → utilitários: erros de aplicação, senha, tipos HTTP
└─ test/api.test.ts        → testes de integração (Postgres real + Grafana simulado)
```

Fluxo de uma requisição:

```
HTTP → route → middlewares (autenticar/autorizar) → validator (Zod)
     → controller → service (regras) → model (Prisma) → banco
     ← controller ← view (render + schema de resposta) ← resposta JSON/HTML
```

**Para adicionar um recurso novo:** model → service → controller → view → validator →
arquivo em `routes/` + uma linha em `routes/index.ts` e no `container.ts`.

### Endpoints (`/api/v1`)

| Método | Rota | Perfil | Descrição |
|---|---|---|---|
| GET | `/health`, `/health/ready` | público | liveness / readiness (banco) |
| POST | `/auth/login` | público | login → token JWT (limite de 10/min) |
| GET | `/auth/me` | logado | usuário atual |
| POST | `/auth/me/senha` | logado | troca a própria senha |
| GET/POST | `/usuarios` | ADMIN | lista / cria usuários |
| GET/PATCH | `/usuarios/:id` | ADMIN | detalha / altera (desativar = `ativo:false`) |
| GET | `/modulos`, `/catalogo` | logado | módulos registrados e verificações |
| GET | `/ambientes`, `/ambientes/:id` | logado | lista / detalha ambientes |
| POST/PATCH | `/ambientes`, `/ambientes/:id` | ADMIN, ANALISTA | cria / altera |
| DELETE | `/ambientes/:id` | ADMIN | arquiva (mantém histórico) |
| POST | `/ambientes/:id/assessments` | ADMIN, ANALISTA | inicia assessment (202, assíncrono) |
| GET | `/assessments`, `/assessments/:id` | logado | lista / detalha (achados, comitê, log) |
| GET | `/assessments/:id/relatorio` | logado | relatório HTML (`?download=true`) |
| POST | `/assessments/:id/decisao` | ADMIN | decisão do comitê (única e imutável) |
| GET | `/assessments/:id/decisao`, `/decisoes` | logado | decisão / trilha de evidências |

Convenções: listas paginadas (`?pagina=1&porPagina=20` → `{ dados, paginacao }`), erros
no formato `{ erro: { codigo, mensagem, detalhes? }, requestId }`, cabeçalho
`X-Request-Id` em toda resposta, datas em ISO 8601.

**Segredos:** credenciais das plataformas nunca vão para o banco. No ambiente, use
`"apiToken": "env:GRAFANA_TOKEN"` e defina a variável no `.env` do servidor; a API
recusa segredo em texto puro.

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
- Registre o módulo em `apps/server/src/engine/registro.ts` (e no CLI) — nada mais muda.

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

- ✅ Núcleo (contrato, motor, score, comitê), base de conhecimento, relatório, CLI.
- ✅ API MVC com Postgres/Prisma, JWT + perfis, assessments assíncronos, decisões do comitê
  persistidas, OpenAPI em `/docs` e testes de integração.
- ✅ Módulo de referência: **Grafana — Segurança** (porta do auditor Python).
- ⏳ A portar como módulos: Zabbix/Elastic/Graylog segurança (lógica já existe no projeto
  Python) e os módulos técnicos dos colegas (migrar para o contrato acima).
- ⏳ UI web (SPA) consumindo a API.
```
