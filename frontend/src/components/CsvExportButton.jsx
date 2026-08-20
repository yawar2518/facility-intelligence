import { Download } from 'lucide-react';

// `style` merges over (and can fully override) the default look, and
// `hoverStyle` merges over that on :hover — lets a page match its own
// design (e.g. an invert-on-hover pill) without duplicating the
// download logic itself.
export default function CsvExportButton({ endpoint, filename, style, hoverStyle }) {
  const handleExport = () => {
    // Get token from localStorage
    const token = localStorage.getItem('access_token');

    // Fetch the CSV with auth header and trigger download
    fetch(`/api/v1/${endpoint}?format=csv`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.blob())
      .then(blob => {
        const url  = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href     = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
      });
  };

  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    borderRadius: '6px',
    border: '1px solid var(--border-2)',
    background: 'transparent',
    color: 'var(--text-2)',
    fontSize: '12px',
    cursor: 'pointer',
    ...style,
  };

  return (
    <button
      onClick={handleExport}
      style={baseStyle}
      onMouseEnter={hoverStyle ? (e) => Object.assign(e.currentTarget.style, hoverStyle) : undefined}
      onMouseLeave={hoverStyle ? (e) => Object.assign(e.currentTarget.style, baseStyle) : undefined}
    >
      <Download size={13} />
      Export CSV
    </button>
  );
}