$mysqlRoot = 'C:\Program Files\MySQL\MySQL Server 8.4'
$defaultsFile = 'C:\ProgramData\MySQL\MySQL Server 8.4\my.ini'
$mysqlAdmin = "$mysqlRoot\bin\mysqladmin.exe"

function Test-MySqlAlive {
    if (-not (Test-Path $mysqlAdmin)) {
        return $false
    }

    & $mysqlAdmin --protocol=tcp -h 127.0.0.1 -P 3306 -u root ping 2>$null | Out-Null

    return $LASTEXITCODE -eq 0
}

$listening = Get-NetTCPConnection -LocalPort 3306 -State Listen -ErrorAction SilentlyContinue

if ($listening -and (Test-MySqlAlive)) {
    Write-Host "MySQL already listening on 3306 (PID: $($listening.OwningProcess))."
    exit 0
}

if (-not (Test-Path $defaultsFile)) {
    Write-Error "MySQL config not found: $defaultsFile"
    exit 1
}

Start-Process -FilePath "$mysqlRoot\\bin\\mysqld.exe" -ArgumentList "--defaults-file=$defaultsFile" -WindowStyle Hidden

for ($attempt = 0; $attempt -lt 40; $attempt++) {
    Start-Sleep -Seconds 1
    $listening = Get-NetTCPConnection -LocalPort 3306 -State Listen -ErrorAction SilentlyContinue

    if ($listening -and (Test-MySqlAlive)) {
        Write-Host "MySQL started on 3306 (PID: $($listening.OwningProcess))."
        exit 0
    }
}

Write-Error "MySQL did not become ready on port 3306."
exit 1
