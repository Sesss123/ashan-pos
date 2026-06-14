$features = @(
  "branches\BranchesManagement.tsx",
  "roles\RolesManagement.tsx",
  "purchases\PurchasesManagement.tsx",
  "customers\CustomersManagement.tsx",
  "notifications\NotificationsCenter.tsx",
  "auditLogs\AuditLogs.tsx",
  "security\SecurityCenter.tsx",
  "backups\BackupCenter.tsx"
)

foreach ($f in $features) {
  $dir = Split-Path "src\features\$f"
  if (-not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }
  $name = (Split-Path $f -Leaf).Replace(".tsx", "")
  $content = "import { Box, Typography } from '@mui/material';`n`nexport default function $name() {`n  return (`n    <Box sx={{ p: 4, fontFamily: '`"Plus Jakarta Sans`", sans-serif' }}>`n      <Typography variant=`"h4`" fontWeight={800}>$name</Typography>`n      <Typography color=`"text.secondary`">Module under construction.</Typography>`n    </Box>`n  );`n}`n"
  Set-Content -Path "src\features\$f" -Value $content
}
