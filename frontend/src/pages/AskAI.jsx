
import { useEffect, useState } from "react";
import {
  useParams,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { apiRequest } from "../services/api";
import "./AskAI.css";

function AskAI() {
  const { id: documentId } = useParams();
  const [searchParams] = useSearchParams();
  const requestedChatId = searchParams.get("chatId");
  const navigate = useNavigate();

  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [chatId, setChatId] = useState("");
  const [chatTitle, setChatTitle] = useState("");
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState(
    () => localStorage.getItem("studyvault-theme") || "light"
  );

  useEffect(() => {
    let cancelled = false;

    async function initializeChat() {
      setInitializing(true);
      setError("");
      setMessages([]);
      setChatId("");
      setChatTitle("");

      try {
        let chat;

        if (requestedChatId) {
          const saved = await apiRequest(`/chats/${requestedChatId}`);
          chat = saved.chat;

          const savedDocumentId =
            typeof chat.document === "object"
              ? chat.document?._id
              : chat.document;

          if (savedDocumentId !== documentId) {
            throw new Error(
              "This conversation does not belong to the selected document."
            );
          }
        } else {
          const data = await apiRequest(
            `/chats?documentId=${encodeURIComponent(documentId)}`
          );

          chat = data.chats?.[0];

          if (!chat) {
            const created = await apiRequest("/chats", {
              method: "POST",
              body: JSON.stringify({ documentId }),
            });

            chat = created.chat;
          } else {
            const saved = await apiRequest(`/chats/${chat._id}`);
            chat = saved.chat;
          }
        }

        if (cancelled) return;

        setChatId(chat._id);
        setChatTitle(chat.title || "Document conversation");
        setMessages(chat.messages || []);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Unable to load your conversation.");
        }
      } finally {
        if (!cancelled) {
          setInitializing(false);
        }
      }
    }

    initializeChat();

    return () => {
      cancelled = true;
    };
  }, [documentId, requestedChatId]);

  useEffect(() => {
    document.documentElement.dataset.studyvaultTheme = theme;
    localStorage.setItem("studyvault-theme", theme);

    return () => {
      delete document.documentElement.dataset.studyvaultTheme;
    };
  }, [theme]);

  async function handleAsk(event) {
    event.preventDefault();

    const trimmedQuestion = question.trim();

    if (!trimmedQuestion) {
      setError("Please enter a question.");
      return;
    }

    if (!chatId) {
      setError("Your conversation is not ready. Please try again.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await apiRequest(`/chats/${chatId}/messages`, {
        method: "POST",
        body: JSON.stringify({ question: trimmedQuestion }),
      });

      setMessages((previous) => [
        ...previous,
        ...(data.messages || []),
      ]);

      setChatTitle(data.title || chatTitle);
      setQuestion("");
    } catch (err) {
      setError(err.message || "Unable to get an answer.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="ask-ai-page">
      <div className="ask-ai-topbar">
        <button
          className="back-button"
          type="button"
          onClick={() => navigate("/documents")}
        >
          <span aria-hidden="true">←</span>
          <span>Documents</span>
        </button>

        <button
          className="theme-toggle"
          type="button"
          onClick={() =>
            setTheme((current) =>
              current === "light" ? "dark" : "light"
            )
          }
          aria-label={`Switch to ${
            theme === "light" ? "dark" : "light"
          } mode`}
          title={`Switch to ${
            theme === "light" ? "dark" : "light"
          } mode`}
        >
          <span aria-hidden="true">
            {theme === "light" ? "☾" : "☀"}
          </span>
          <span>{theme === "light" ? "Dark mode" : "Light mode"}</span>
        </button>
      </div>

      <header className="ask-ai-header">
        <div className="page-eyebrow">
          <span className="status-dot" />
          STUDYVAULT / STUDY SPACE
        </div>

        <h1>Ask your document.</h1>

        <p className="ask-ai-intro">
          Find explanations, understand key ideas, and explore your
          study material. Answers are generated using your document.
        </p>

        {chatTitle && (
          <div className="conversation-label">
            <span className="conversation-label-icon" aria-hidden="true">
              ↳
            </span>
            <span className="conversation-label-text">
              {chatTitle}
            </span>
          </div>
        )}
      </header>

      <section className="ask-ai-card">
        <form onSubmit={handleAsk}>
          <label htmlFor="question">What would you like to understand?</label>

          <textarea
            id="question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask a question about your study material..."
            rows={4}
            maxLength={2000}
            required
            disabled={initializing || loading}
          />

          <div className="ask-ai-actions">
            <span className="character-count">
              {question.length} / 2000
            </span>

            <button
              className="ask-submit-button"
              type="submit"
              disabled={initializing || loading || !chatId}
            >
              {initializing
                ? "Loading conversation..."
                : loading
                  ? "Finding an answer..."
                  : "Ask question"}
              {!initializing && !loading && (
                <span aria-hidden="true">↗</span>
              )}
            </button>
          </div>
        </form>
      </section>

      {initializing && (
        <div className="status-message" role="status">
          <span className="status-spinner" />
          Loading your saved conversation...
        </div>
      )}

      {loading && (
        <div className="status-message" role="status">
          <span className="status-spinner" />
          Searching your document and preparing an answer...
        </div>
      )}

      {error && (
        <div className="ask-ai-error" role="alert">
          <span className="error-mark" aria-hidden="true">!</span>
          <span>{error}</span>
        </div>
      )}

      {!initializing && messages.length > 0 && (
        <section className="conversation-section">
          <div className="section-heading">
            <div>
              <p className="section-kicker">YOUR STUDY SESSION</p>
              <h2>Conversation</h2>
            </div>

            <span className="message-count">
              {messages.length} {messages.length === 1 ? "message" : "messages"}
            </span>
          </div>

          <div className="conversation-list">
            {messages.map((message, index) => (
              <article
                key={message._id || `${message.role}-${index}`}
                className={`conversation-message ${
                  message.role === "user" ? "user-message" : "assistant-message"
                }`}
              >
                <div className="message-meta">
                  <span
                    className={`message-avatar ${
                      message.role === "user" ? "user-avatar" : "assistant-avatar"
                    }`}
                    aria-hidden="true"
                  >
                    {message.role === "user" ? "Y" : "S"}
                  </span>

                  <div>
                    <h3>
                      {message.role === "user" ? "You" : "StudyVault"}
                    </h3>
                    <span className="message-type">
                      {message.role === "user"
                        ? "YOUR QUESTION"
                        : "ANSWER"}
                    </span>
                  </div>
                </div>

                <div className="answer-text">{message.content}</div>

                {message.role === "assistant" &&
                  message.sources?.length > 0 && (
                    <div className="sources-section">
                      <h4>
                        <span aria-hidden="true">↳</span>
                        Sources from your document
                      </h4>

                      <ul className="source-list">
                        {message.sources.map((source, sourceIndex) => {
                          const page =
                            source.pageNumber ?? source.page_number;
                          const chunk =
                            source.chunkIndex ?? source.chunk_index;
                          const similarity =
                            source.similarity ?? source.score;

                          return (
                            <li key={`${page}-${chunk}-${sourceIndex}`}>
                              <span className="source-page">
                                Page {page ?? "—"}
                              </span>

                              {chunk != null && (
                                <span className="source-detail">
                                  Chunk {chunk}
                                </span>
                              )}

                              {typeof similarity === "number" && (
                                <span className="source-detail">
                                  Score {similarity.toFixed(3)}
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>

                      <p className="source-note">
                        Retrieval scores indicate relevance, not proof that
                        every detail in an answer is supported by a source.
                      </p>
                    </div>
                  )}
              </article>
            ))}
          </div>
        </section>
      )}

      {!initializing && messages.length === 0 && !error && (
        <section className="empty-conversation">
          <span className="empty-line" />
          <p className="empty-title">Start with a question</p>
          <p>
            Ask about a definition, a concept, or a specific part of your PDF.
          </p>
        </section>
      )}

      <footer className="ask-ai-footer">
        <span>STUDYVAULT</span>
        <span>Made for focused learning</span>
      </footer>
    </main>
  );
}

export default AskAI;
