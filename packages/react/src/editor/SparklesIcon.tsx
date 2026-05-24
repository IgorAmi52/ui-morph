interface SparklesIconProps {
  className?: string;
}

/** Two 4-point sparkles (large + small), optically centered in 24×24. */
export function SparklesIcon({ className = 'morph-editor-sparkles' }: SparklesIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M10.5 7.5 12 11.25 15.75 12.75 12 14.25 10.5 18 9 14.25 5.25 12.75 9 11.25 10.5 7.5Z" />
      <path d="M17.5 5.5 18.15 7.45 20 8.1 18.15 8.75 17.5 10.7 16.85 8.75 15 8.1 16.85 7.45 17.5 5.5Z" />
    </svg>
  );
}
