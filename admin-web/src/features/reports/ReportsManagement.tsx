import { Box, Typography, Button, Paper, Grid } from '@mui/material';
import { Download, Analytics, TrendingUp, Timeline } from '@mui/icons-material';

export default function ReportsManagement() {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>Financial Reports</Typography>
          <Typography variant="body2" color="text.secondary">
            Generate and export IRS-compliant tax and revenue reports.
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<Download />}
          sx={{ borderRadius: 2, textTransform: 'none', px: 3 }}
        >
          Export CSV / PDF
        </Button>
      </Box>

      <Grid container spacing={3}>
        {[
          { title: 'End of Day (EOD) Sales', icon: <TrendingUp fontSize="large" color="primary" />, desc: 'Daily revenue, cash drops, and discrepancies.' },
          { title: 'Tax & Compliance', icon: <Analytics fontSize="large" color="warning" />, desc: 'Quarterly tax collections and automated filings.' },
          { title: 'Cost of Goods Sold (COGS)', icon: <Timeline fontSize="large" color="error" />, desc: 'Inventory consumption vs generated revenue.' }
        ].map((report, i) => (
          <Grid item xs={12} md={4} key={i}>
            <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'background.default', width: 'fit-content' }}>
                {report.icon}
              </Box>
              <Typography variant="h6" fontWeight={700}>{report.title}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>{report.desc}</Typography>
              <Button variant="outlined" sx={{ textTransform: 'none', borderRadius: 2, mt: 2 }}>
                Generate Report
              </Button>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
