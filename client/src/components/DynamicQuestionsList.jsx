import React from 'react';

export default function DynamicQuestionsList({ questions, onSelectQuestion, loading }) {
  if (loading) {
    return <div className="q-loading">Generating form questions...</div>;
  }

  if (!questions || questions.length === 0) return null;

  return (
    <div className="dynamic-questions-container">
      <p className="q-title">💡 Suggested Questions:</p>

      <div className="q-pills">
        {questions.map((q, idx) => (
          <button key={idx} className="q-pill" onClick={() => onSelectQuestion(q)}>
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}