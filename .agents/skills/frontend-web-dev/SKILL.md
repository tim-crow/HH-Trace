---
name: frontend-web-dev
description: "Develops, inspects, and debugs front-end web applications using a live Chrome browser. Use when building UI, fixing layout/styling issues, verifying visual changes, debugging console/network errors, or testing user interactions on localhost."
---

# Frontend Web Development

Provides live browser control for developing, inspecting, and debugging front-end web applications via Chrome DevTools MCP.

## Capabilities

- Navigate to pages (localhost or any URL)
- Take screenshots to verify visual output
- Take DOM snapshots for accessibility/structure analysis
- Click elements and fill forms to test interactions
- Execute JavaScript in the browser console
- Inspect console messages for errors/warnings
- Inspect network requests for failed loads, CORS issues, API errors
- Resize the viewport to test responsive layouts

## Workflow

### 1. Start the dev server

Before using browser tools, ensure the development server is running:

```
npx pnpm dev
```

The app typically runs at `http://localhost:3000`.

### 2. Navigate and screenshot

Use `navigate_page` to open the app, then `take_screenshot` to see the current state:

```
navigate_page({ url: "http://localhost:3000" })
take_screenshot()
```

### 3. Inspect and debug

- Use `take_snapshot` to get a DOM/accessibility tree snapshot
- Use `list_console_messages` to check for React errors or warnings
- Use `list_network_requests` to verify API calls and asset loading
- Use `evaluate_script` to run JS in the browser for quick checks

### 4. Test interactions

- Use `click` with CSS selectors to interact with buttons and links
- Use `fill` to enter text into form fields
- Use `resize_page` to test responsive breakpoints (e.g., 375x667 for mobile, 768x1024 for tablet)

### 5. Iterate

After making code changes, the dev server hot-reloads automatically. Take a new screenshot to verify the fix.

## Tips

- Always take a screenshot after navigation or interaction to confirm the result
- Use `take_snapshot` instead of screenshot when you need to understand DOM structure
- Check `list_console_messages` after page load to catch hydration errors or warnings
- Test at multiple viewport sizes: mobile (375px), tablet (768px), desktop (1280px)
