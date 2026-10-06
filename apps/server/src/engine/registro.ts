/**
 * Registro central de módulos da plataforma.
 *
 * Aqui entram TODOS os módulos — os de segurança (meus) e os técnicos (dos colegas),
 * bastando implementarem a interface Modulo de @flowbix/core. Para adicionar um módulo,
 * importe-o e chame registro.registrar(...).
 */
import { Registro } from "@flowbix/core";
import grafanaSeguranca from "@flowbix/module-grafana-security";

export function montarRegistro(): Registro {
  const registro = new Registro();

  // --- Módulos de SEGURANÇA (Flowbix Security Audit) ---
  registro.registrar(grafanaSeguranca);
  // registro.registrar(zabbixSeguranca);   // a portar de zabbix_sec_audit
  // registro.registrar(elasticSeguranca);  // a portar
  // registro.registrar(graylogSeguranca);  // a portar

  // --- Módulos TÉCNICOS (assessment dos colegas) ---
  // registro.registrar(grafanaTecnico);    // migrar a ferramenta atual para o contrato Modulo
  // registro.registrar(zabbixTecnico);

  return registro;
}
