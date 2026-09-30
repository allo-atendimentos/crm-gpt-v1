$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $projectRoot
$runtimeRoot = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies'
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$nodePath = if ($nodeCommand) { $nodeCommand.Source } else { Join-Path $runtimeRoot 'node/bin/node.exe' }
if (!(Test-Path -LiteralPath $nodePath)) { throw 'Instale Node.js 22 antes de iniciar.' }
if (!(Test-Path 'node_modules/next')) { throw 'Execute pnpm install --frozen-lockfile nesta pasta primeiro.' }
New-Item -ItemType Directory -Force '.local' | Out-Null
if (!(Test-Path '.env')) {
  $authKey = & $nodePath -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  $encryptionKey = & $nodePath -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  @"
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55433/postgres?connection_limit=1&pgbouncer=true&statement_cache_size=0
AUTH_SECRET=$authKey
ENCRYPTION_KEY=$encryptionKey
AUTH_TRUST_HOST=true
APP_URL=http://localhost:3000
"@ | Set-Content -Encoding utf8 '.env'
}
function Test-LocalPort([int]$Port) {
  $client = New-Object Net.Sockets.TcpClient
  try { $client.Connect('127.0.0.1', $Port); return $true } catch { return $false } finally { $client.Dispose() }
}
function Start-BossProcess([string]$Name, [string[]]$NodeArguments) {
  $process = Start-Process -FilePath $nodePath -ArgumentList $NodeArguments -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput ".local/$Name.log" -RedirectStandardError ".local/$Name.error.log"
  $process.Id | Set-Content ".local/$Name.pid"
}
if (!(Test-LocalPort 55433)) {
  Start-BossProcess 'database' @('scripts/local-db.mjs')
  for ($attempt=0; $attempt -lt 40 -and !(Test-LocalPort 55433); $attempt++) { Start-Sleep -Milliseconds 500 }
  if (!(Test-LocalPort 55433)) { throw 'Banco não iniciou. Consulte .local/database.error.log.' }
}
& $nodePath node_modules/prisma/build/index.js generate
if ($LASTEXITCODE -ne 0) { throw 'Falha ao gerar cliente do banco.' }
& $nodePath node_modules/prisma/build/index.js db push --skip-generate
if ($LASTEXITCODE -ne 0) { throw 'O esquema exige revisão. Nenhuma perda de dados foi autorizada automaticamente.' }
& $nodePath --env-file=.env --import tsx scripts/constraints.ts
if ($LASTEXITCODE -ne 0) { throw 'Falha nas restrições de isolamento.' }
& $nodePath --env-file=.env --import tsx scripts/seed.ts
if ($LASTEXITCODE -ne 0) { throw 'Falha ao configurar planos.' }
if (!(Test-LocalPort 3000)) {
  $env:NEXT_DIST_DIR = '.next-dev'
  Start-BossProcess 'application' @('node_modules/next/dist/bin/next','dev','--webpack','--hostname','127.0.0.1')
}
$workerRunning = $false
if (Test-Path '.local/worker.pid') {
  $workerId = [int](Get-Content '.local/worker.pid')
  $workerProcess = Get-Process -Id $workerId -ErrorAction SilentlyContinue
  $workerRunning = $workerProcess -and $workerProcess.ProcessName -eq 'node'
}
if (!$workerRunning) { Start-BossProcess 'worker' @('--env-file=.env','--import','tsx','workers/run.ts') }
Write-Host 'CRM: http://localhost:3000 — logs em .local'
