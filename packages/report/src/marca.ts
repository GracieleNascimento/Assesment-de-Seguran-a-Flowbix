/** Identidade visual Flowbix (cores, fonte, logo) — fonte única para toda a UI/relatórios. */
export const VERMELHO = "#D2001E";
export const VERMELHO_ESCURO = "#8C0000";
export const VERMELHO_CLARO = "#F4C2C2";
export const FONTE = "'Calibri Light','Calibri','Carlito','Segoe UI',Roboto,Arial,sans-serif";
export const TAGLINE = "Especialistas em monitoramento e observabilidade";
export const EMPRESA = "Flowbix";
export const SITE = "flowbix.com";

export function wordmark(cor = VERMELHO, altura = 26): string {
  const larg = Math.round(altura * 4.4);
  return (
    `<svg viewBox='0 0 220 50' height='${altura}' width='${larg}' role='img' aria-label='Flowbix' ` +
    `xmlns='http://www.w3.org/2000/svg' style='vertical-align:middle'>` +
    `<text x='0' y='38' font-family="${FONTE}" font-size='40' font-weight='700' letter-spacing='-1' fill='${cor}'>flowbix</text>` +
    `<circle cx='208' cy='14' r='6' fill='${cor}'/></svg>`
  );
}

export function faviconSvg(): string {
  return (
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>` +
    `<rect width='64' height='64' rx='12' fill='${VERMELHO}'/>` +
    `<text x='32' y='46' font-family='Calibri,Arial,sans-serif' font-size='44' font-weight='700' ` +
    `fill='#fff' text-anchor='middle'>f</text></svg>`
  );
}
