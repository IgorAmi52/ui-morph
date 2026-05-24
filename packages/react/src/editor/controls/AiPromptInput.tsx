import { useState } from 'react';

interface AiPromptInputProps {
  path: string;
}

export function AiPromptInput({ path: _path }: AiPromptInputProps) {
  const [prompt, setPrompt] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!prompt.trim()) return;
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 2000);
  };

  return (
    <div data-morph-editor className="morph-editor-control">
      <span className="morph-editor-control__label">AI prompt</span>
      <textarea
        className="morph-editor-textarea"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder='Describe what you want, e.g. "make this text larger and blue"'
        rows={4}
      />
      <button
        className="morph-editor-btn morph-editor-btn--primary morph-editor-btn--full"
        onClick={handleSubmit}
        disabled={!prompt.trim()}
        style={{ marginTop: 8 }}
      >
        {submitted ? 'Backend not connected' : 'Apply with AI'}
      </button>
      <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
        AI processing requires a backend connection. The prompt will be sent to POST /override when configured.
      </p>
    </div>
  );
}
