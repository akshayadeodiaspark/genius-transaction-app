# Genius Terminal Transaction Console

A small React (Vite) app that wraps two APIs:

1. **Create Transaction** — `POST` to `create_genius_terminal_transaction`, sending an XML `<params>` body and parsing the XML response (`transport_key`, `validation_key`, `transaction_id`, `transaction_amt`).
2. **Check Terminal Status** — `GET` on the local POS terminal (`http://<host>:<port>/v2/pos?TransportKey=...&Format=XML`) using the `transport_key` from step 1, parsing whatever XML comes back.

All request fields are editable in the UI, with defaults matching the sample payload you provided. Status checking is manual — click **Check Status** whenever you want to poll the terminal.

## Running it

```bash
npm install
npm run dev
```

Then open the printed local URL (defaults to `http://localhost:5173`).

For a production build:

```bash
npm run build
npm run preview
```

## Important: CORS and mixed-content

This app calls both APIs **directly from the browser** (no backend proxy). Two things can block that in practice:

- **CORS.** Both `demosparkle.pos.diasparkonline.com` and the local terminal service at `192.168.203.7:8080` must return CORS headers (`Access-Control-Allow-Origin`, etc.) that allow requests from wherever this app is running. If they don't, the browser will block the response and you'll see a "Failed to fetch" / network error in the UI. This is outside the app's control — it has to be configured on those servers, or you proxy the calls through your own backend.
- **Mixed content.** The terminal endpoint is plain `http://`. If you serve this app over `https://`, browsers will block the `http://` request outright ("mixed content"). Serving the app over plain `http://` (e.g. from the same LAN as the terminal, which is how `npm run dev` / `npm run preview` work by default) avoids this. Don't deploy this app to an `https://` host if it needs to reach the terminal directly.

If either of these becomes a real blocker, the usual fix is a tiny backend (Node/Express, or whatever you already run) that the browser talks to over same-origin HTTP(S), which then forwards the two requests server-side — servers aren't subject to CORS or mixed-content rules. That wasn't included here since the app was built to call both APIs directly, but it's a small addition if you hit this in practice.

## Notes on the API calls

- The create-transaction body is built from the form fields in the exact tag order of your sample. An empty `trans_no` is sent as `<trans_no/>` (self-closing), matching the sample.
- `Content-Type: application/xml` is sent on the POST.
- The terminal host/port on the Check Status form default to `192.168.203.7` / `8080` (from your sample) but are editable, since that address is a local device and may differ on your network.
- Both responses are parsed generically (any flat XML record becomes a key/value table) so it isn't hardcoded to only the sample response shape — useful since the terminal's exact response format wasn't provided. Raw request/response XML is always shown in collapsible sections for debugging.

## Deployment (Render)

`render.yaml` defines this as a Render **static site**: `npm ci && npm run build`,
published from `dist/`, with an SPA rewrite so any path serves `index.html`.

**Read this before relying on a hosted deployment.** Render serves over `https://`,
and that breaks the terminal half of this app in two independent ways:

1. **Mixed content.** Step 2 calls `http://<terminal-host>:<port>/v2/pos`. A browser
   on an `https://` page blocks that request outright. No app-side workaround exists.
2. **The terminal is on a private LAN.** `192.168.203.7` is not routable from the
   public internet, so a server-side proxy hosted on Render could not reach it either.

Step 1 (create transaction) can work from a hosted deployment, but only if
`demosparkle.pos.diasparkonline.com` returns CORS headers permitting the Render
origin. That is a server-side configuration, not something this app controls.

If you need both steps working, serve the app over plain `http://` from a machine
on the same network as the terminal — `npm run dev` already binds all interfaces,
so `http://<that-machine>:5173` is reachable from the LAN.
