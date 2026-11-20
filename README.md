# Franchise Hockey Tycoon (Breakaway)

A mobile hockey management clicker. Build the team; the season runs itself.

## Play

- Web app: https://brysonluke18.github.io/Franchise-Hockey-Tycoon/
- iPhone: open the link in Safari, tap Share, then **Add to Home Screen**.
- Android: open it in Chrome, tap the menu, then **Install app**.

It plays offline after the first visit. Saves stay on each device.

## Layout

- `breakaway/` — the game (plain HTML, CSS and JavaScript, no build step).
- `docs/` — the installable web app that GitHub Pages serves. Generated; do not edit by hand.
- `build-web.ps1` — rebuilds `docs/` from `breakaway/` (adds Home Screen icons, notch spacing and the offline service worker).
- `tools/bot.js` — a dev-only playtest bot. Load it in the browser console on a local copy and call `runBot({ seasons: 10 })`.

## Update the web app

```powershell
./build-web.ps1
git add -A
git commit -m "Update web app"
git push
```

Bump `CACHE` in `breakaway/sw.js` when you ship, so installed copies pick up the new files.
