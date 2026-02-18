$ErrorActionPreference = "Stop"

function Invoke-PythonCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$CommandPrefix,
        [Parameter(Mandatory = $true)]
        [string[]]$Args
    )

    $prefixArgs = @()
    if ($CommandPrefix.Length -gt 1) {
        $prefixArgs = $CommandPrefix[1..($CommandPrefix.Length - 1)]
    }

    & $CommandPrefix[0] @prefixArgs @Args
}

function Resolve-PythonPrefix {
    if (Get-Command py -ErrorAction SilentlyContinue) {
        foreach ($version in @("3.12", "3.11")) {
            try {
                py -$version --version *> $null
                if ($LASTEXITCODE -eq 0) {
                    return @("py", "-$version")
                }
            } catch {
                continue
            }
        }
    }

    if (Get-Command python -ErrorAction SilentlyContinue) {
        return @("python")
    }

    throw "No Python interpreter found. Install Python 3.11 or 3.12."
}

$pythonPrefix = Resolve-PythonPrefix
$versionOutput = (Invoke-PythonCommand -CommandPrefix $pythonPrefix -Args @("--version") | Out-String).Trim()

if ($versionOutput -notmatch "Python\s+(\d+)\.(\d+)") {
    throw "Unable to parse Python version from: $versionOutput"
}

$major = [int]$Matches[1]
$minor = [int]$Matches[2]
if ($major -ne 3 -or $minor -lt 11 -or $minor -gt 12) {
    throw "Unsupported Python version: $versionOutput. Use Python 3.11 or 3.12."
}

Write-Host "Using $versionOutput"

$venvName = ".venv"
$targetVenvPath = Join-Path (Get-Location) $venvName

function Set-VenvTarget {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    $script:venvName = $Name
    $script:targetVenvPath = Join-Path (Get-Location) $script:venvName
}

function New-FallbackVenvName {
    $base = ".venv312"
    if (-not (Test-Path $base)) {
        return $base
    }

    return ".venv312_" + (Get-Date -Format "yyyyMMdd_HHmmss")
}

$isTargetVenvActive = $false
if ($env:VIRTUAL_ENV -and (Test-Path $env:VIRTUAL_ENV)) {
    $resolvedActiveVenv = (Resolve-Path $env:VIRTUAL_ENV).Path
    if ($resolvedActiveVenv -eq $targetVenvPath) {
        $isTargetVenvActive = $true
    }
}

$recreateVenv = $true
if ($isTargetVenvActive) {
    $activeVersion = (python --version | Out-String).Trim()
    if ($activeVersion -match "Python\s+3\.(11|12)\.") {
        Write-Host "Active $venvName detected ($activeVersion). Reusing existing environment."
        $recreateVenv = $false
    } else {
        Write-Host "Active $venvName detected ($activeVersion). Creating fallback environment with $versionOutput."
        Set-VenvTarget -Name (New-FallbackVenvName)
        $isTargetVenvActive = $false
    }
}

if ($recreateVenv) {
    if (Test-Path $venvName) {
        try {
            Remove-Item -Recurse -Force $venvName
        } catch {
            Write-Host "Could not remove '$venvName' (likely locked). Creating a new fallback environment."
            Set-VenvTarget -Name (New-FallbackVenvName)
        }
    }

    Invoke-PythonCommand -CommandPrefix $pythonPrefix -Args @("-m", "venv", $venvName)
}

$venvPython = Join-Path $targetVenvPath "Scripts\python.exe"
if (-not (Test-Path $venvPython)) {
    throw "Virtual environment python not found at $venvPython"
}

& $venvPython -m pip install --upgrade pip setuptools wheel
& $venvPython -m pip install --only-binary=:all: -r requirements.txt

$activateScript = Join-Path $targetVenvPath "Scripts\Activate.ps1"
. $activateScript

Write-Host "Environment ready at $targetVenvPath"
