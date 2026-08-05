import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import DynamicQuestionsList from './DynamicQuestionsList';
import '../styles/FloatingChatbot.css';
import { AUTH_ENDPOINTS } from '../config/api';

export default function FloatingChatbot({ formCode, formDescription }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [questions, setQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);

  const { speak, stop, isSpeaking } = useSpeechSynthesis();
  const chatEndRef = useRef(null);

  // Helper function to get token from local storage
  const getAuthHeader = () => {
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Send query to server, render response, and speak answer
  const sendMessage = useCallback(async (textToSend) => {
    if (!textToSend.trim()) return;

    const userMsg = { sender: 'user', text: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoadingChat(true);

    try {
      const response = await fetch(`${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/chatbot/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          form_code: formCode,
          form_description: formDescription,
          message: textToSend,
        }),
      });

      const data = await response.json();
      const botReply = data.reply || "Systems operational. No response payload received.";

      setMessages((prev) => [...prev, { sender: 'bot', text: botReply }]);
      
      // Auto-speak reply
      speak(botReply);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { sender: 'bot', text: 'Error: Connection lost.' }]);
    } finally {
      setLoadingChat(false);
    }
  }, [formCode, formDescription, speak]);

  const { isListening, toggleListening } = useSpeechRecognition((recognizedText) => {
    sendMessage(recognizedText);
  });

  // Fetch dynamic questions ONLY when the chat window opens
  useEffect(() => {
    if (!isOpen) return;

    setLoadingQuestions(true);
    fetch(`${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/chatbot/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ form_code: formCode, form_description: formDescription }),
    })
      .then((res) => res.json())
      .then((data) => setQuestions(data.questions || []))
      .catch((err) => console.error('Failed to fetch questions:', err))
      .finally(() => setLoadingQuestions(false));
  }, [isOpen, formCode, formDescription]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loadingChat]);

  return (
    <div className="floating-bot-wrapper">
      {/* Robot Face Floating Launcher Button */}
      {!isOpen && (
        <button className="floating-bot-toggle" onClick={() => setIsOpen(true)}>
          <div className="robot-head-icon">
            <div className="robot-ear left"></div>
            <div className="robot-ear right"></div>
            <div className="robot-face">
              <div className="robot-eye left"></div>
              <div className="robot-eye right"></div>
              <div className="robot-mouth"></div>
            </div>
          </div>
        </button>
      )}

      {/* Cybernetic HUD Panel */}
      {isOpen && (
        <div className="chat-window iron-hud-frame">
          {/* Futuristic HUD Top Header */}
          <div className="chat-header">
            <div className="hud-title-block">
              {/* Mini Animated Robot Avatar Header */}
              <div className="robot-head-icon mini">
                <div className="robot-face">
                  <div className="robot-eye left"></div>
                  <div className="robot-eye right"></div>
                </div>
              </div>
              <div>
                <h4>BMPL ASSISTANT</h4>
                <span className="hud-code-tag">SYS // {formCode || 'ACTIVE'}</span>
              </div>
            </div>
            <button className="close-btn" onClick={() => { setIsOpen(false); stop(); }}>✕</button>
          </div>

          {/* Context Banner */}
          {formDescription && (
            <div className="form-desc-banner">
              <span className="banner-label">CONTEXT:</span> {formDescription}
            </div>
          )}

          {/* Messages Console */}
          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="hud-welcome">
                <div className="robot-head-icon welcome-robot">
                  <div className="robot-ear left"></div>
                  <div className="robot-ear right"></div>
                  <div className="robot-face">
                    <div className="robot-eye left"></div>
                    <div className="robot-eye right"></div>
                    <div className="robot-mouth"></div>
                  </div>
                </div>
                <p>Hello! I am your BMPL Assistant. How can I help you today?</p>
              </div>
            )}
            
            {messages.map((m, i) => (
              <div key={i} className={`msg-bubble ${m.sender}`}>
                {m.sender === 'bot' && <div className="bot-avatar-tag">BMPL ASSISTANT</div>}
                <div className="msg-content">{m.text}</div>
              </div>
            ))}

            {loadingChat && (
              <div className="msg-bubble bot loading">
                <div className="bot-avatar-tag">BMPL ASSISTANT</div>
                <div className="hud-typing">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Dynamic Questions Prompt Bar */}
          <DynamicQuestionsList
            questions={questions}
            loading={loadingQuestions}
            onSelectQuestion={(q) => sendMessage(q)}
          />

          {/* Hologram Command Bar Input */}
          <div className="chat-input-area">
            <input
              type="text"
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
            />
            
            <button
              type="button"
              className={`mic-btn ${isListening ? 'listening' : ''}`}
              onClick={toggleListening}
              title="Voice Stream"
            >
              🎤
            </button>

            {isSpeaking && (
              <button type="button" className="stop-speech-btn" onClick={stop} title="Mute Audio">
                🔇
              </button>
            )}

            <button type="button" className="send-btn" onClick={() => sendMessage(input)}>
              ⚡
            </button>
          </div>
        </div>
      )}
    </div>
  );
}