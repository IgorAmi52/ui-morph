interface MorphToggleButtonProps {
  onClick: () => void;
  onShare?: () => void;
  sharing?: boolean;
}

const groupStyle: React.CSSProperties = {
  position: 'fixed',
  top: 16,
  right: 16,
  zIndex: 9999,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

const buttonStyle: React.CSSProperties = {
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

const iconButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  width: 34,
  height: 34,
  justifyContent: 'center',
  padding: 0,
};

export function MorphToggleButton({ onClick, onShare, sharing = false }: MorphToggleButtonProps) {
  return (
    <div data-morph-editor style={groupStyle}>
      {onShare && (
        <button
          type="button"
          onClick={onShare}
          disabled={sharing}
          style={{ ...iconButtonStyle, opacity: sharing ? 0.5 : 1 }}
          aria-label="Share view"
          title="Share view"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
          </svg>
        </button>
      )}
      <button
        type="button"
        onClick={onClick}
        style={buttonStyle}
        aria-label="Enter edit mode"
      >
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
    </div>
  );
}
