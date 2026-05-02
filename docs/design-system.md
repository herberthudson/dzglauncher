# Design system (frontend)

Este projeto usa **tokens estruturais** + **temas por ficheiro CSS** com variáveis semânticas. Os componentes React não fixam cores hex; usam classes em `src/shared/layout.css` e variáveis definidas no tema ativo.

## Ficheiros

| Ficheiro | Função |
|----------|--------|
| `frontend/src/theme/tokens.css` | Espaçamentos, raios, sombras, tipografia base (sem cores de marca). |
| `frontend/src/theme/themes/flat-dark-theme.css` | Tema escuro plano: superfícies escuras, acento azul, texto claro. |
| `frontend/src/theme/themes/flat-light-theme.css` | Tema claro plano (mesmas variáveis semânticas). |
| `frontend/src/theme/app.css` | Ponto de entrada: importa tokens e **todos** os temas. |
| `frontend/src/shared/layout.css` | Componentes UI (`.btn`, `.ds-card`, `.shell-nav`, tabelas, mensagens). |

## Ativar um tema

1. Em **Configurações** do app escolha o tema (persistido em `uiTheme` no JSON) ou edite `index.html`: `data-theme="flat-dark-theme"` ou `data-theme="flat-light-theme"`.

2. Ou importe apenas um ficheiro de tema em `app.css` (substituindo os `@import` atuais) se quiser **sem** alternância por atributo.

O valor guardado nas definições (`flat-dark-theme` / `flat-light-theme`) é aplicado ao `<html>` na arranque e ao gravar.

Cada tema deve declarar o **mesmo conjunto** de variáveis usadas em `layout.css`, por exemplo:

- `--bg`, `--bg-elevated`, `--bg-hover`, `--bg-input`
- `--border`, `--border-focus`
- `--text`, `--text-muted`, `--text-on-accent`
- `--accent`, `--accent-hover`, `--accent-muted`
- `--danger`, `--radius`, `--font`, `--table-row-hover`, `--nav-active-bg`, `--nav-active-text`, `--page-header-icon-bg`

## Novos temas

1. Crie `frontend/src/theme/themes/<nome>.css` com:

   ```css
   html[data-theme="nome"] {
     --bg: ...;
     /* restantes */
   }
   ```

2. Adicione `@import "./themes/<nome>.css";` em `app.css`.

3. Defina `data-theme="nome"` no `<html>` (ou alterne em runtime com `document.documentElement.dataset.theme = 'nome'`).

## Componentes

- **`.ds-card`**: bloco de conteúdo com borda e fundo elevado.
- **`.ds-section-title`**: título de secção (maiúsculas discretas); pode incluir ícone `lucide-react` ao lado.
- **`PageHeader`**: cabeçalho de página com ícone, título e descrição opcional (`src/shared/PageHeader.tsx`).

## Ícones

Biblioteca: **`lucide-react`**. Preferir ícones SVG consistentes em vez de emoji em navegação e cabeçalhos.
