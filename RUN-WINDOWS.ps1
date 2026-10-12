$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

function Require-Command([string]$Name, [string]$Hint) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "$Name is required. $Hint"
  }
}

Require-Command 'node' 'Install Node.js 20 LTS or newer.'
Require-Command 'docker' 'Install Docker Desktop and start it.'
Require-Command 'corepack' 'Install Node.js with Corepack enabled.'

Write-Host '== TalentSwap local setup ==' -ForegroundColor Cyan
node --version
corepack enable
corepack prepare pnpm@9.0.0 --activate
if (-not (Test-Path '.env')) { Copy-Item '.env.example' '.env' }
if (-not (Test-Path 'apps/web/.env.local')) { Copy-Item 'apps/web/.env.example' 'apps/web/.env.local' }
if (-not (Test-Path 'apps/api/.env')) { Copy-Item 'apps/api/.env.example' 'apps/api/.env' }

Write-Host 'Review .env and apps/api/.env before continuing. Set valid development JWT keys and database/Redis URLs.' -ForegroundColor Yellow
$answer = Read-Host 'Continue with dependency install and local infrastructure? (y/N)'
if ($answer -ne 'y' -and $answer -ne 'Y') { Write-Host 'Stopped before installing dependencies.'; exit 0 }

corepack pnpm install --no-frozen-lockfile
if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
docker compose up -d postgres redis
if ($LASTEXITCODE -ne 0) { throw 'Docker Compose failed to start PostgreSQL/Redis.' }
corepack pnpm db:generate
if ($LASTEXITCODE -ne 0) { throw 'Prisma client generation failed.' }
corepack pnpm db:migrate
if ($LASTEXITCODE -ne 0) { throw 'Database migrations failed.' }
Write-Host 'Infrastructure and schema setup finished. Start the app in separate terminals with: pnpm dev:api and pnpm dev:web.' -ForegroundColor Green
