/**
 * Converte a paleta customizável da empresa (`companies.color_primary/
 * secondary/accent`, hex, editável em Meu negócio) nos tokens HSL que o
 * `globals.css` já usa (`--primary: "H S% L%"`, sem `hsl()` em volta —
 * Tailwind aplica isso em `hsl(var(--primary))`). Antes disso a cor
 * escolhida na tela ficava só salva no banco, nunca mudava a aparência de
 * verdade (era um TODO documentado no próprio `globals.css`).
 */

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
      break;
    case g:
      h = ((b - r) / d + 2) * 60;
      break;
    default:
      h = ((r - g) / d + 4) * 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/** String pronta pro valor de uma CSS var HSL (`"27 87% 37%"`). */
export function hexToHslToken(hex: string): string {
  const { h, s, l } = hexToHsl(hex);
  return `${h} ${s}% ${l}%`;
}

/**
 * Preto ou branco por cima da cor, pelo mesmo critério de contraste (relative
 * luminance, WCAG) — decide se `--primary-foreground` etc. deve ser claro ou
 * escuro conforme a cor escolhida for clara ou escura.
 */
export function hexForeground(hex: string): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return luminance > 0.45 ? "0 0% 9%" : "0 0% 100%";
}

export type CompanyBrandVars = Record<string, string>;

/**
 * Monta o objeto de estilo inline com as variáveis sobrescritas — só entra
 * no DOM quando a empresa realmente customizou (campos `null` = usa o tema
 * estático padrão do app, sem nenhuma mudança visual).
 */
export function companyBrandStyle(company: {
  color_primary: string | null;
  color_secondary: string | null;
  color_accent: string | null;
}): CompanyBrandVars {
  const vars: CompanyBrandVars = {};
  if (company.color_primary) {
    vars["--primary"] = hexToHslToken(company.color_primary);
    vars["--primary-foreground"] = hexForeground(company.color_primary);
    vars["--ring"] = hexToHslToken(company.color_primary);
  }
  if (company.color_secondary) {
    vars["--secondary"] = hexToHslToken(company.color_secondary);
    vars["--secondary-foreground"] = hexForeground(company.color_secondary);
  }
  if (company.color_accent) {
    vars["--accent"] = hexToHslToken(company.color_accent);
    vars["--accent-foreground"] = hexForeground(company.color_accent);
  }
  return vars;
}
