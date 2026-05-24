import { useState } from 'react';

export function AiPromptInput() {
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
        {submitted ? 'AI setup required' : 'Apply with AI'}
      </button>
    </div>
  );
}
