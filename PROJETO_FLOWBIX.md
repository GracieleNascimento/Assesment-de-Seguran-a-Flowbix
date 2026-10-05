# Projeto Flowbix — Plataforma de Assessment (técnico + segurança)

Documento de visão geral do projeto. Pode ser anexado ao Projeto "Flowbix" no Claude e
compartilhado com a equipe.

## Objetivo

Unificar, numa única plataforma modular, o **assessment técnico** dos ambientes de
monitoramento (health, performance, governança, datasources, dashboards…) — já feito pela
equipe — com o **assessment de segurança** (Zabbix, Grafana, Elastic, Graylog), e um
**portão de comitê** (go/no-go) que valida o ambiente antes da entrega ao cliente.

## Decisões tomadas

- **Arquitetura:** monorepo modular; tudo é módulo sob um mesmo contrato.
- **Stack:** Node.js + TypeScript (servidor Fastify, CLI de testes).
- **Integração com os colegas:** base comum; módulos técnicos e de segurança convivem.
- **Multiusuário (versão anterior em Python):** login por pessoa, perfis Admin/Analista/Leitura.
- **Padrão visual:** tema escuro Flowbix, alinhado às telas de "Assessment Técnico" e
  "Committee Validator" já usadas pela equipe.

## O que já existe

- **Motor + contrato de módulo** (`@flowbix/core`): roda módulos, calcula índice/score,
  avalia o comitê.
- **Base de conhecimento de segurança** (`@flowbix/knowledge`, `kb.json`): 89 verificações
  em 4 plataformas, com normas (ISO 27001/27002, NIST CSF 2.0, CIS, OWASP, LGPD, Anatel),
  contexto de ameaça e **casos reais documentados com links** (CISA KEV, NCSC, NVD, CERT.br).
- **Módulo de referência:** Grafana — Segurança (auditor somente leitura via API).
- **Relatório** no padrão visual Flowbix (tema escuro) e **servidor/CLI**.
- Validado: checagem de tipos OK e execução ponta a ponta (assessment → comitê → relatório).

## Próximos passos

1. Portar os módulos de segurança Zabbix, Elastic e Graylog (lógica já pronta no projeto
   Python) para o contrato de módulo TS.
2. Receber o código dos colegas e migrar os **módulos técnicos** para o mesmo contrato
   (a especificação está no README).
3. UI web (SPA) consumindo a API, no mesmo tema escuro.
4. Persistência de histórico e registro das decisões do comitê (evidência de repasse).

## Repositório

- GitHub: <preencher com o link após publicar>
- Como rodar no PC: ver `README.md` (seção "Como rodar no PC (passo a passo)").

## Origem da base de segurança

A base `kb.json` é exportada do projeto Python `zabbix_sec_audit`
(`scripts/exportar_kb.py`). Para atualizar o conteúdo de segurança, edite lá e reexporte.
