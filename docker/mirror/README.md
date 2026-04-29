# x99 LAN mirror

Reverse-proxies KH Rental from `nucbox` (over Tailscale) to x99's local
network. People on x99's LAN — who are NOT on Tailscale themselves —
can hit `http://x99` (or `http://<x99-lan-ip>`) and get the site.

```
[ LAN user ] --HTTP:80--> [ x99 / Caddy ] --Tailscale:5175--> [ nucbox / vite ]
```

## Prerequisites

- x99 is on Tailscale and can reach `nucbox` (verify: `ping nucbox` from x99)
- x99 has Docker + docker-compose installed
- Nothing else is bound to port 80 on x99 (`sudo lsof -i :80`)
- nucbox's vite dev server is running and includes `x99` in `server.allowedHosts`
  (already configured in `vite.config.js`)

## Deploy

From this directory on x99:

```sh
docker compose up -d
```

Verify:

```sh
curl http://localhost/__mirror/health        # should return "ok"
curl -I http://localhost/                    # should return SvelteKit response headers
```

LAN users then visit `http://x99` (relies on x99's hostname being
resolvable on the LAN — usually true via mDNS/Bonjour) or directly
`http://<x99-ip>`.

## Update / restart

```sh
docker compose pull          # if Caddy has updates
docker compose up -d
```

To change which backend is proxied (e.g. switch nucbox -> prod build on
a different port), edit `Caddyfile` and:

```sh
docker compose restart proxy
```

## Logs

```sh
docker compose logs -f proxy
```

## Notes

- HTTP only. If you want HTTPS on the LAN, Caddy can self-sign with
  `tls internal { ... }` — but you'll need to install the self-signed
  CA on every LAN client. Not worth it for a small trusted LAN.
- This proxies to vite's dev server, which isn't built for production
  load. Fine for a handful of users; for real production swap nucbox
  to `npm run build` + Node adapter and update the upstream port.
- If the upstream port changes, you only need to edit `Caddyfile` —
  no need to bounce the whole compose stack.
