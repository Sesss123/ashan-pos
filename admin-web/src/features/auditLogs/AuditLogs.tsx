// AuditLogs.tsx — Re-exports the full AuditLogsManagement component.
// The router (App.tsx) already lazy-loads AuditLogsManagement directly,
// but this file is kept as a barrel export for any direct imports elsewhere.
export { default } from './AuditLogsManagement';
