interface MorphToggleButtonProps {
  onClick: () => void;
}

const buttonStyle: React.CSSProperties = {
  position: 'fixed',
  top: 16,
  right: 16,
  zIndex: 9999,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 14px',
  background: '#fff',
  color: '#475569',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 500,
  fontFamily: 'system-ui, -apple-system, sans-serif',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
};

export function MorphToggleButton({ onClick }: MorphToggleButtonProps) {
  return (
    <button data-morph-editor onClick={onClick} style={buttonStyle} aria-label="Enter edit mode">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
        <path d="m15 5 4 4" />
      </svg>
      Edit Mode
    </button>
  );
}
