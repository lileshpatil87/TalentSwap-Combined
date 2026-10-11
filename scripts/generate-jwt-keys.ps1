$ErrorActionPreference = 'Stop'

$opensslCmd = 'openssl'
if (-not (Get-Command $opensslCmd -ErrorAction SilentlyContinue)) {
  $gitOpenssl = "C:\Program Files\Git\usr\bin\openssl.exe"
  if (Test-Path $gitOpenssl) {
    $opensslCmd = $gitOpenssl
  } else {
    throw "OpenSSL is required. Install OpenSSL or ensure 'openssl' is available on PATH."
  }
}

$apiDir = Join-Path $PSScriptRoot '..\apps\api'
$privateFile = Join-Path $apiDir 'private-dev.pem'
$publicFile = Join-Path $apiDir 'public-dev.pem'
$envFile = Join-Path $apiDir '.env'

& $opensslCmd genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out $privateFile
& $opensslCmd rsa -pubout -in $privateFile -out $publicFile

$private = ((Get-Content $privateFile -Raw).Trim() -replace "`r?`n", '\\n')
$public = ((Get-Content $publicFile -Raw).Trim() -replace "`r?`n", '\\n')

$example = Get-Content (Join-Path $apiDir '.env.example') -Raw
$env = $example -replace 'JWT_PRIVATE_KEY=.*', ('JWT_PRIVATE_KEY="' + $private + '"') -replace 'JWT_PUBLIC_KEY=.*', ('JWT_PUBLIC_KEY="' + $public + '"')
Set-Content -Path $envFile -Value $env -NoNewline
Remove-Item $privateFile, $publicFile -Force

Write-Host "Created $envFile with a fresh local RSA keypair."
