import { Download } from 'lucide-react';

export default function CsvExportButton({ endpoint, filename }) {
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

  return (
    <button
      onClick={handleExport}
      style={{
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
      }}
    >
      <Download size={13} />
      Export CSV
    </button>
  );
}