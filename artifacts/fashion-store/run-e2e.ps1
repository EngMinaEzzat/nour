# PowerShell Script to run Playwright E2E tests with automated server lifecycle management

# Set env variables
$env:VITE_PORT="25935"
$env:PORT="5001"
$env:NODE_ENV="test"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Starting Frontend Dev Server (Vite) on port 25935..." -ForegroundColor Cyan
$feProc = Start-Process -PassThru -NoNewWindow -FilePath "pnpm.cmd" -ArgumentList "--filter", "@workspace/fashion-store", "dev"

Write-Host "Starting Backend API Server (Express) on port 5001..." -ForegroundColor Cyan
$beProc = Start-Process -PassThru -NoNewWindow -FilePath "pnpm.cmd" -ArgumentList "--filter", "@workspace/api-server", "dev"

# Wait for both servers to be ready by probing their ports
Write-Host "Waiting for servers to boot up..." -ForegroundColor Cyan
$timeout = 90
$elapsed = 0
$beReady = $false
$feReady = $false

Write-Host "Checking backend (5001) and frontend (25935)..." -ForegroundColor Cyan
while ($elapsed -lt $timeout) {
    if (-not $beReady) {
        try {
            $tcp = New-Object System.Net.Sockets.TcpClient("127.0.0.1", 5001)
            if ($tcp.Connected) {
                $tcp.Close()
                $beReady = $true
                Write-Host "Backend API is ready on port 5001!" -ForegroundColor Green
            }
        } catch {}
    }
    if (-not $feReady) {
        try {
            $tcp = New-Object System.Net.Sockets.TcpClient("127.0.0.1", 25935)
            if ($tcp.Connected) {
                $tcp.Close()
                $feReady = $true
                Write-Host "Frontend server is ready on port 25935!" -ForegroundColor Green
            }
        } catch {}
    }
    if ($beReady -and $feReady) {
        break
    }
    Start-Sleep -Seconds 1
    $elapsed++
}

if (-not $beReady -or -not $feReady) {
    Write-Error "Timeout: Backend or frontend server failed to start within $timeout seconds."
    Write-Host "Shutting down active processes..." -ForegroundColor Yellow
    Stop-Process -Id $feProc.Id -Force -ErrorAction SilentlyContinue
    Stop-Process -Id $beProc.Id -Force -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Running Playwright E2E Tests..." -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan

$exitCode = 0
try {
    # Execute playwright tests inside the fashion-store workspace
    Set-Location -Path "$PSScriptRoot"
    pnpm exec playwright test
    $exitCode = $LASTEXITCODE
}
catch {
    Write-Error $_
    $exitCode = 1
}
finally {
    Write-Host "==================================================" -ForegroundColor Cyan
    Write-Host "Shutting down development servers..." -ForegroundColor Yellow
    Stop-Process -Id $feProc.Id -Force -ErrorAction SilentlyContinue
    Stop-Process -Id $beProc.Id -Force -ErrorAction SilentlyContinue
    Write-Host "Servers stopped. Exiting with code $exitCode." -ForegroundColor Yellow
    exit $exitCode
}
