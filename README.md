# WebView (Standalone Tests)

Static, frontend-only pages for testing in-app WebViews. Suitable for GitHub Pages.

- index: lists tests
- tests/sample: minimal template to copy

Notes (Telegram): WebApp APIs are injected only when opening via a Bot WebApp button, not via plain chat links.

## Local preview

Any static server works, e.g.:

```bash
npx http-server -p 5173 .
```

## GitHub Pages
- Settings → Pages → Deploy from a branch → Branch: main, Folder: /(root)
- Your site will be available at: https://<user>.github.io/webview/
