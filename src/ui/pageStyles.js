/* ─────────────────────────────────────────────
   Shared page-level styles for Control de Produccion.
   Import: import { usePageStyles } from '../../ui/pageStyles'
   Usage:  const ps = usePageStyles()
   ───────────────────────────────────────────── */

import { useTheme, alpha } from '@mui/material/styles'

export function usePageStyles() {
  const theme = useTheme()
  const d = theme.palette.mode === 'dark'
  const border = d ? 'rgba(255,255,255,0.06)' : theme.palette.divider

  return {
    isDark: d,

    page: {
      minHeight: 'calc(100vh - 40px)',
      animation: 'fadeIn .25s ease-out',
      '@keyframes fadeIn': {
        from: { opacity: 0, transform: 'translateY(6px)' },
        to: { opacity: 1, transform: 'translateY(0)' },
      },
    },

    pageTitle: {
      fontWeight: 800,
      letterSpacing: -0.4,
      color: 'text.primary',
      fontSize: { xs: '1.25rem', sm: '1.5rem' },
    },

    pageSubtitle: {
      color: 'text.secondary',
      fontSize: 13,
      fontWeight: 500,
      mt: 0.25,
    },

    card: {
      borderRadius: 3,
      overflow: 'hidden',
      transition: 'box-shadow .2s ease, border-color .2s ease, transform .2s ease',
      border: `1px solid ${border}`,
      '&:hover': {
        borderColor: d ? 'rgba(255,255,255,.10)' : 'rgba(0,0,0,.08)',
        boxShadow: d
          ? '0 4px 20px rgba(0,0,0,.3), 0 0 0 1px rgba(255,255,255,.04)'
          : '0 4px 20px rgba(0,0,0,.06)',
      },
    },

    cardHeader: {
      px: 2.5,
      py: 1.75,
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      background: d ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
      borderBottom: `1px solid ${border}`,
    },

    cardHeaderTitle: {
      fontWeight: 700,
      color: 'text.primary',
      fontSize: '0.9rem',
      letterSpacing: -0.1,
    },

    cardHeaderSubtitle: {
      fontSize: 12,
      color: 'text.secondary',
    },

    tableHeaderRow: {
      '& .MuiTableCell-head': {
        backgroundColor: d ? 'rgba(255,255,255,.03)' : 'rgba(0,0,0,.02)',
        color: d ? 'rgba(148,163,184,1)' : 'rgba(71,85,105,1)',
        fontWeight: 600,
        fontSize: '0.6875rem',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
      },
    },

    tableRow: (idx) => ({
      transition: 'background .12s ease',
      '&:hover': {
        backgroundColor: d ? 'rgba(59,130,246,.04)' : 'rgba(59,130,246,.02)',
      },
      ...(idx % 2 === 1 ? { bgcolor: d ? 'rgba(255,255,255,.01)' : 'rgba(0,0,0,.008)' } : {}),
    }),

    cellText: { color: 'text.primary', fontSize: '0.8125rem' },
    cellTextSecondary: { color: 'text.secondary', fontSize: '0.8125rem' },

    inputSx: {
      '& .MuiOutlinedInput-root': {
        backgroundColor: d ? 'rgba(255,255,255,.03)' : '#FFFFFF',
      },
    },

    statusChip: (status) => {
      const map = {
        PENDIENTE:   { bg: d ? 'rgba(245,158,11,.10)' : '#FFFBEB', color: d ? '#FCD34D' : '#B45309', border: d ? 'rgba(245,158,11,.18)' : '#FDE68A' },
        'EN PROCESO':{ bg: d ? 'rgba(59,130,246,.10)' : '#EFF6FF', color: d ? '#93C5FD' : '#1D4ED8', border: d ? 'rgba(59,130,246,.18)' : '#BFDBFE' },
        COMPLETADA:  { bg: d ? 'rgba(16,185,129,.10)'  : '#ECFDF5', color: d ? '#6EE7B7' : '#047857', border: d ? 'rgba(16,185,129,.18)' : '#A7F3D0' },
        CANCELADA:   { bg: d ? 'rgba(239,68,68,.10)'  : '#FEF2F2', color: d ? '#FCA5A5' : '#B91C1C', border: d ? 'rgba(239,68,68,.18)' : '#FECACA' },
      }
      const s = map[status] || map['PENDIENTE']
      return { bgcolor: s.bg, color: s.color, border: `1px solid ${s.border}`, fontWeight: 600 }
    },

    metricChip: (tone = 'default') => {
      const tones = {
        default: { bg: d ? 'rgba(255,255,255,.05)' : '#F8FAFC', color: d ? '#E2E8F0' : '#334155', border: d ? 'rgba(255,255,255,.08)' : '#E2E8F0' },
        warn:    { bg: d ? 'rgba(245,158,11,.08)' : '#FFFBEB', color: d ? '#FCD34D' : '#B45309', border: d ? 'rgba(245,158,11,.15)' : '#FDE68A' },
        info:    { bg: d ? 'rgba(6,182,212,.08)' : '#ECFEFF', color: d ? '#67E8F9' : '#0E7490', border: d ? 'rgba(6,182,212,.15)' : '#A5F3FC' },
        ok:      { bg: d ? 'rgba(16,185,129,.08)' : '#ECFDF5', color: d ? '#6EE7B7' : '#047857', border: d ? 'rgba(16,185,129,.15)' : '#A7F3D0' },
        bad:     { bg: d ? 'rgba(239,68,68,.08)' : '#FEF2F2', color: d ? '#FCA5A5' : '#B91C1C', border: d ? 'rgba(239,68,68,.15)' : '#FECACA' },
      }
      const t = tones[tone] || tones.default
      return { fontWeight: 600, borderRadius: '8px', height: 28, bgcolor: t.bg, color: t.color, border: `1px solid ${t.border}` }
    },

    actionBtn: (color = 'primary') => {
      const colors = {
        primary: { c: d ? '#93C5FD' : '#1D4ED8', bg: d ? 'rgba(59,130,246,.08)' : 'rgba(29,78,216,.05)', border: d ? 'rgba(59,130,246,.15)' : 'rgba(29,78,216,.12)' },
        success: { c: d ? '#6EE7B7' : '#047857', bg: d ? 'rgba(16,185,129,.08)' : 'rgba(4,120,87,.05)', border: d ? 'rgba(16,185,129,.15)' : 'rgba(4,120,87,.12)' },
        error:   { c: d ? '#FCA5A5' : '#B91C1C', bg: d ? 'rgba(239,68,68,.08)' : 'rgba(185,28,28,.05)', border: d ? 'rgba(239,68,68,.15)' : 'rgba(185,28,28,.12)' },
        warning: { c: d ? '#FCD34D' : '#B45309', bg: d ? 'rgba(245,158,11,.08)' : 'rgba(180,83,9,.05)', border: d ? 'rgba(245,158,11,.15)' : 'rgba(180,83,9,.12)' },
      }
      const s = colors[color] || colors.primary
      return {
        color: s.c, borderRadius: 2, border: `1px solid ${s.border}`, bgcolor: s.bg,
        transition: 'all .15s ease',
        '&:hover': { bgcolor: alpha(s.c, 0.12), transform: 'translateY(-1px)' },
      }
    },

    filterBar: {
      px: 2.5, py: 1.75, display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center',
      borderBottom: `1px solid ${border}`,
      background: d ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.01)',
    },

    kpiCard: (accent = 'blue') => {
      const accents = {
        blue:   { border: d ? 'rgba(59,130,246,.18)' : '#DBEAFE', left: '#3B82F6', bg: d ? 'rgba(59,130,246,.04)' : 'rgba(59,130,246,.02)', glow: 'rgba(59,130,246,.08)' },
        green:  { border: d ? 'rgba(16,185,129,.18)' : '#A7F3D0', left: '#10B981', bg: d ? 'rgba(16,185,129,.04)' : 'rgba(16,185,129,.02)', glow: 'rgba(16,185,129,.08)' },
        red:    { border: d ? 'rgba(239,68,68,.18)' : '#FEE2E2', left: '#EF4444', bg: d ? 'rgba(239,68,68,.04)' : 'rgba(239,68,68,.02)', glow: 'rgba(239,68,68,.08)' },
        amber:  { border: d ? 'rgba(245,158,11,.18)' : '#FEF3C7', left: '#F59E0B', bg: d ? 'rgba(245,158,11,.04)' : 'rgba(245,158,11,.02)', glow: 'rgba(245,158,11,.08)' },
        purple: { border: d ? 'rgba(168,85,247,.18)' : '#EDE9FE', left: '#A855F7', bg: d ? 'rgba(168,85,247,.04)' : 'rgba(168,85,247,.02)', glow: 'rgba(168,85,247,.08)' },
        cyan:   { border: d ? 'rgba(6,182,212,.18)' : '#A5F3FC', left: '#06B6D4', bg: d ? 'rgba(6,182,212,.04)' : 'rgba(6,182,212,.02)', glow: 'rgba(6,182,212,.08)' },
        slate:  { border: d ? 'rgba(100,116,139,.22)' : '#E2E8F0', left: '#64748B', bg: d ? 'rgba(100,116,139,.05)' : 'rgba(100,116,139,.03)', glow: 'rgba(100,116,139,.08)' },
      }
      const a = accents[accent] || accents.blue
      return {
        p: 2.5, borderRadius: 3, height: '100%',
        border: `1px solid ${a.border}`, borderLeft: `3px solid ${a.left}`, bgcolor: a.bg,
        transition: 'all .2s cubic-bezier(.4,0,.2,1)', position: 'relative', overflow: 'hidden',
        '&:hover': {
          borderColor: a.left, transform: 'translateY(-2px)',
          boxShadow: d ? `0 8px 24px ${a.glow}, 0 0 0 1px ${a.border}` : `0 8px 24px ${a.glow}`,
        },
      }
    },

    progressBar: {
      height: 6, borderRadius: 999,
      bgcolor: d ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)',
      overflow: 'hidden',
    },

    progressFill: (pct, color = '#1D4ED8') => ({
      height: '100%',
      width: `${Math.max(0, Math.min(100, pct))}%`,
      borderRadius: 999,
      bgcolor: d ? '#60A5FA' : color,
      transition: 'width .5s cubic-bezier(.4,0,.2,1)',
    }),

    emptyText: {
      color: 'text.secondary', textAlign: 'center', py: 5,
      fontSize: '0.875rem', fontWeight: 500, opacity: 0.7,
    },

    sectionTitle: { fontWeight: 700, fontSize: 15, letterSpacing: -0.2, color: 'text.primary' },

    gauge: (pct, color = '#3B82F6') => ({
      position: 'relative', width: 80, height: 80, borderRadius: '50%',
      background: `conic-gradient(${color} ${pct * 3.6}deg, ${d ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)'} 0deg)`,
      display: 'grid', placeItems: 'center',
      '&::after': {
        content: '""', position: 'absolute', inset: 6, borderRadius: '50%',
        bgcolor: d ? '#0F172A' : '#FFFFFF',
      },
    }),
  }
}
