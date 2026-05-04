# Design system (frontend)

UI stack: **SolidJS 1.9**, **TypeScript**, **Vite 5**, **Tailwind CSS 3**, **@kobalte/core** (Dialog, Select, Checkbox, …), **[@solidjs/router](https://docs.solidjs.com/solid-router)**, **i18next** / **solid-i18next**, **lucide-solid**. Componentes em [`frontend/src/components/ui/`](frontend/src/components/ui/) (padrão tipo shadcn / SolidUI: `Button`, `Card`, `Input`, `Label`, `Table*`, `StringSelect`/`DsSelect`, `FormCheckboxRow`, `TableCheckbox`, `Dialog*`, alertas). Referência: [SolidUI](https://github.com/stefan-karger/solid-ui) / [solid-ui.com](https://www.solid-ui.com).

O Wails incorpora o output de `npm run build` (`frontend/dist`).

## Camada de tokens e temas

Cores e superfícies vêm de **variáveis CSS em canais HSL** (formato `H S% L%` sem envoltório `hsl()`), consumidas pelo `tailwind.config.ts` via `hsl(var(--nome) / <alpha-value>)`. Não há segundo conjunto legado (`--bg` / `--accent` em paralelo).

| Ficheiro | Função |
|----------|--------|
| [`frontend/src/theme/tokens.css`](frontend/src/theme/tokens.css) | Espaçamentos `--ds-*`, sombras, altura da barra de navegação, `--font-sans` / `--font-mono`. |
| [`frontend/src/theme/themes/flat-dark.css`](frontend/src/theme/themes/flat-dark.css) | Tema embutido escuro (`html[data-theme="flat-dark-theme"]` e fallback sem `data-theme`). |
| [`frontend/src/theme/themes/flat-light.css`](frontend/src/theme/themes/flat-light.css) | Tema embutido claro (`html[data-theme="flat-light-theme"]`). |
| [`frontend/src/theme/app.css`](frontend/src/theme/app.css) | `@tailwind` + `@layer base` + utilitário `.select-native` para `<select>`. |
| [`frontend/src/theme/resolveTheme.ts`](frontend/src/theme/resolveTheme.ts) | `resolveTheme` / `applyThemeToDocument` (`data-theme` no `<html>`). |
| [`frontend/src/theme/themeLoader.ts`](frontend/src/theme/themeLoader.ts) | `setExternalThemeFromText`, `attachExternalTheme`, `clearExternalTheme` (nó `#dzg-external-theme`). |
| [`frontend/src/theme/applyFullTheme.ts`](frontend/src/theme/applyFullTheme.ts) | Aplica tema embutido + lê CSS opcional via `ReadUIThemeFile` (Wails). |

Variáveis semânticas esperadas nos temas (exemplos): `--background`, `--foreground`, `--card`, `--primary`, `--muted`, `--border`, `--input`, `--ring`, `--destructive`, `--success`, `--warn`, `--info`, … (ver ficheiros `flat-*.css` e `tailwind.config.ts`). O **`--radius`** comum nos temas embutidos está em **0.5rem** (cantos um pouco mais suaves, alinhado ao preset shadcn/SolidUI).

## Ativar tema embutido

1. **Definições**: escolher tema (gravado como `uiTheme` no JSON de configuração).
2. Ou `index.html`: `data-theme="flat-dark-theme"` ou `data-theme="flat-light-theme"`.

## Tema CSS externo (overlay)

1. Em **Definições**, preencher o caminho absoluto do ficheiro (gravado como `uiExternalThemePath`).
2. O backend expõe [`ReadUIThemeFile`](../../app.go); o frontend injeta o conteúdo como `<style id="dzg-external-theme">` **depois** dos temas embutidos, para sobrescrever variáveis (e regras compatíveis) sem rebuild.

Limite de tamanho do ficheiro e validação de caminho estão no Go.

## Novo tema embutido

1. Criar `frontend/src/theme/themes/<id>.css` com `html[data-theme="<id>"] { ... }` redefinindo as mesmas variáveis que `flat-dark.css`.
2. Adicionar `@import` em [`app.css`](frontend/src/theme/app.css).
3. Incluir `<id>` em `THEME_IDS` em [`resolveTheme.ts`](frontend/src/theme/resolveTheme.ts) e nas opções da página de definições.

## Tabelas e layout partilhado

Componentes de tabela: [`frontend/src/components/ui/table.tsx`](frontend/src/components/ui/table.tsx) (`TableScroll`, `Table`, `TableHead`, `TableCell`, `tablePasswordColClass`, …).

## Componentes

- **`PageHeader`**: [`frontend/src/shared/PageHeader.tsx`](frontend/src/shared/PageHeader.tsx).
- **`DsSelect` / `StringSelect`**: [`frontend/src/components/ui/select.tsx`](frontend/src/components/ui/select.tsx) — Select Kobalte + estilos Tailwind (substitui o antigo `shared/DsSelect`).
- **`FormCheckboxRow`**, **`TableCheckbox`**: [`frontend/src/components/ui/checkbox.tsx`](frontend/src/components/ui/checkbox.tsx).
- **Diálogo modal**: [`frontend/src/components/ui/dialog.tsx`](frontend/src/components/ui/dialog.tsx) (`Dialog`, `DialogOverlay`, `DialogContent` sobre Kobalte).

## Ícones

**lucide-solid**.
