import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, AlertCircle, X } from 'lucide-react';
import reviewApi from '../services/reviewApi';
import reviewPersistenceApi from '../services/reviewPersistenceApi';

const SUGGESTED_PROMPTS = [
  'Why is the top critical issue dangerous?',
  'How can I further optimize the time complexity?',
  'Explain key changes in the refactored code.',
  'Write unit tests for the refactored implementation.',
  'What edge cases could still break this code?',
];

export default function Copilot({
  reviewId = null,
  code,
  language,
  review,
  refactoredCode,
  onClose = null,
}) {
  const [messages, setMessages] = useState(() => [
    {
      id: `initial-${reviewId || 'default'}`,
      sender: 'copilot',
      text: "Hello! I am your Code Copilot. I have full context of your original code, audit findings, and refactored solution. Ask me anything about fixing issues, writing tests, or optimizing performance.",
    },
  ]);
  const [input, setInput] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [chatError, setChatError] = useState('');
  const messagesEndRef = useRef(null);
  const counterRef = useRef(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAsking]);

  const handleSend = async (questionText) => {
    const textToSend = (questionText || input).trim();
    if (!textToSend || isAsking) return;

    setChatError('');
    setInput('');

    counterRef.current += 1;
    const userMessageId = `user-${counterRef.current}`;
    const userMsg = { id: userMessageId, sender: 'user', text: textToSend };

    setMessages((prev) => [...prev, userMsg]);
    setIsAsking(true);

    try {
      let response;
      if (reviewId) {
        response = await reviewPersistenceApi.chatWithReview(reviewId, {
          question: textToSend,
        });
      } else {
        response = await reviewApi.askAboutCode({
          code,
          language,
          review,
          refactoredCode,
          question: textToSend,
        });
      }

      if (response && response.success && response.answer) {
        counterRef.current += 1;
        setMessages((prev) => [
          ...prev,
          {
            id: `copilot-${counterRef.current}`,
            sender: 'copilot',
            text: response.answer,
          },
        ]);
      } else {
        setChatError(response?.message || 'Failed to receive answer from Copilot.');
      }
    } catch (err) {
      setChatError(err.message || 'Unable to connect to Copilot.');
    } finally {
      setIsAsking(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="copilot-container">
      {/* Top Header */}
      <div className="copilot-header">
        <div className="copilot-title-group">
          <div className="copilot-icon-badge">
            <Bot size={16} />
          </div>
          <div>
            <h4 className="copilot-title">Code Copilot</h4>
            <p className="copilot-subtitle">Ask questions about the code and review.</p>
          </div>
        </div>
        <div className="copilot-header-right">
          <span className="copilot-status-pill">Context-Aware</span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="btn-copilot-close"
              title="Close Copilot"
              aria-label="Close Copilot"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Suggested Query Chips */}
      <div className="copilot-suggestions">
        <div className="suggestion-label">
          <Sparkles size={12} className="icon-mr text-accent" />
          <span>Suggested:</span>
        </div>
        <div className="suggestion-chips">
          {SUGGESTED_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(prompt)}
              className="chip-btn"
              disabled={isAsking}
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Chat Area */}
      <div className="copilot-messages-list">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`copilot-bubble-row ${msg.sender === 'user' ? 'bubble-user-row' : 'bubble-bot-row'}`}
          >
            <div className={`copilot-avatar ${msg.sender === 'user' ? 'avatar-user' : 'avatar-bot'}`}>
              {msg.sender === 'user' ? <User size={13} /> : <Bot size={13} />}
            </div>
            <div className={`copilot-bubble ${msg.sender === 'user' ? 'bubble-user' : 'bubble-bot'}`}>
              <div className="bubble-text">{msg.text}</div>
            </div>
          </div>
        ))}

        {isAsking && (
          <div className="copilot-bubble-row bubble-bot-row">
            <div className="copilot-avatar avatar-bot">
              <Bot size={13} />
            </div>
            <div className="copilot-bubble bubble-bot typing-bubble">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-hint">Thinking about your code...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {chatError && (
        <div className="alert alert-error alert-compact" role="alert">
          <AlertCircle size={14} className="alert-icon" />
          <span>{chatError}</span>
        </div>
      )}

      {/* Fixed Bottom Input Area */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="copilot-input-bar"
      >
        <textarea
          className="copilot-textarea"
          placeholder="Ask about this code..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={isAsking}
        />
        <button
          type="submit"
          className="btn btn-primary copilot-send-btn"
          disabled={isAsking || !input.trim()}
          title="Send message (Enter)"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
