# Builds the installable web app (PWA) into .\docs (served by GitHub Pages) from the game in .\breakaway.
# The game files are shared with the Claude artifact; only index.html gets web-app extras:
# Home Screen icons, notch spacing for full-screen launch, and the offline service worker.
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$src = Join-Path $here 'breakaway'
$out = Join-Path $here 'docs'
if (Test-Path $out) { Remove-Item -Recurse -Force $out }
New-Item -ItemType Directory -Force $out | Out-Null
foreach ($d in 'css', 'js', 'icons') { Copy-Item -Recurse (Join-Path $src $d) (Join-Path $out $d) }
foreach ($f in 'manifest.webmanifest', 'icon.svg', 'sw.js') { Copy-Item (Join-Path $src $f) $out }
$html = Get-Content -Raw -Encoding utf8 (Join-Path $src 'index.html')
$head = @'
<link rel="apple-touch-icon" href="icons/icon-180.png">
<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">
<meta name="apple-mobile-web-app-title" content="Breakaway">
<style>html{padding-top:env(safe-area-inset-top,0px)}</style>
'@
$tail = @'
<script>
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
</script>
'@
$html = $html.Replace('<link rel="manifest" href="manifest.webmanifest">', '<link rel="manifest" href="manifest.webmanifest">' + "`n" + $head.TrimEnd())
$html = $html.Replace('</body>', $tail + '</body>')
[IO.File]::WriteAllText((Join-Path $out 'index.html'), $html, (New-Object Text.UTF8Encoding $false))
New-Item -ItemType File -Force (Join-Path $out '.nojekyll') | Out-Null
Get-ChildItem -Recurse $out | Measure-Object -Property Length -Sum | ForEach-Object { "web build: $($_.Count) files, $([math]::Round($_.Sum/1KB)) KB" }
