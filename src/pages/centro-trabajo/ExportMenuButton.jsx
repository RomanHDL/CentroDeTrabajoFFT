import React, { useState } from 'react'
import Button from '@mui/material/Button'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import TodayIcon from '@mui/icons-material/Today'
import DateRangeIcon from '@mui/icons-material/DateRange'
import BarChartIcon from '@mui/icons-material/BarChart'
import AllInboxIcon from '@mui/icons-material/AllInbox'
import {
  exportDailyExcel,
  exportWeeklyExcel,
  exportLineComparisonExcel,
  exportCompleteExcel,
} from '../../data/production/excelExport'

export default function ExportMenuButton({ dateISO }) {
  const [anchorEl, setAnchorEl] = useState(null)
  const open = Boolean(anchorEl)

  const handle = (fn) => {
    fn(dateISO)
    setAnchorEl(null)
  }

  return (
    <>
      <Button
        variant="contained"
        startIcon={<FileDownloadIcon />}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{ height: 40, borderRadius: 2, fontWeight: 600, textTransform: 'none', px: 2.5 }}
      >
        Descargar Excel
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        PaperProps={{ sx: { minWidth: 240, borderRadius: 2 } }}
      >
        <MenuItem onClick={() => handle(exportDailyExcel)}>
          <ListItemIcon>
            <TodayIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Producción del día" />
        </MenuItem>
        <MenuItem onClick={() => handle(exportWeeklyExcel)}>
          <ListItemIcon>
            <DateRangeIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Producción semanal" />
        </MenuItem>
        <MenuItem onClick={() => handle(exportLineComparisonExcel)}>
          <ListItemIcon>
            <BarChartIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Producción por línea" />
        </MenuItem>
        <MenuItem onClick={() => handle(exportCompleteExcel)}>
          <ListItemIcon>
            <AllInboxIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Producción completa" />
        </MenuItem>
      </Menu>
    </>
  )
}
