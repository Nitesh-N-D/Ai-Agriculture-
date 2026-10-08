// Display helpers only - no application data lives here.

export const prettyLabel = (label) =>
  String(label || '').replace(/___/g, ' - ').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();

export const timeAgo = (iso) => {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} d ago`;
  return new Date(iso).toLocaleDateString();
};

export const formatDateTime = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

// Backend yields are hg/ha (FAO).  Convert only for display, per the user's unit setting.
export const convertYield = (hgHa, unit = 'tons/ha') => {
  if (hgHa === null || hgHa === undefined) return null;
  if (unit === 'hg/ha') return { value: hgHa, unit: 'hg/ha', digits: 0 };
  if (unit === 'kg/acre') return { value: hgHa * 0.0404686, unit: 'kg/acre', digits: 0 };
  return { value: hgHa / 10000, unit: 'tons/ha', digits: 2 };
};

export const formatYield = (hgHa, unit) => {
  const c = convertYield(hgHa, unit);
  return c ? `${c.value.toLocaleString(undefined, { maximumFractionDigits: c.digits, minimumFractionDigits: c.digits })} ${c.unit}` : '—';
};

export const SEVERITY_STYLE = {
  critical: { text: 'text-rose-300', bg: 'bg-rose-500/15', border: 'border-rose-500/40' },
  high: { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30' },
  medium: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  low: { text: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/30' },
};
