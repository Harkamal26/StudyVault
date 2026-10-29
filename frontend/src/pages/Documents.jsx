
import { useEffect, useState } from "react";
import { apiRequest } from "../services/api";
import { useNavigate } from "react-router-dom";
import "./Documents.css";

function Documents() {
  const [subjects, setSubjects] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [chats, setChats] = useState([]);
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [theme, setTheme] = useState(
    () => localStorage.getItem("studyvault-theme") || "light"
  );
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.dataset.studyvaultTheme = theme;
    localStorage.setItem("studyvault-theme", theme);
  }, [theme]);

  async function loadData() {
    try {
      const [subjectData, documentData, chatData] = await Promise.all([
        apiRequest("/subjects"),
        apiRequest("/documents"),
        apiRequest("/chats"),
      ]);

      setSubjects(
        Array.isArray(subjectData)
          ? subjectData
          : subjectData.subjects || []
      );

      setDocuments(
        Array.isArray(documentData)
          ? documentData
          : documentData.documents || []
      );

      setChats(chatData.chats || []);
    } catch (err) {
      setError(err.message || "Unable to load your library.");
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleUpload(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!file || !subjectId || !title.trim()) {
      setError("Please enter a title, select a subject, and choose a PDF.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title.trim());
    formData.append("subjectId", subjectId);

    setLoading(true);

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        "http://localhost:5000/api/documents/upload",
        {
          method: "POST",
          headers: token
            ? { Authorization: `Bearer ${token}` }
            : {},
          body: formData,
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || data.error || "Upload failed.");
      }

      setMessage("PDF uploaded successfully!");
      setTitle("");
      setSubjectId("");
      setFile(null);

      const input = document.getElementById("pdf-file");
      if (input) input.value = "";

      await loadData();
    } catch (err) {
      setError(err.message || "Upload failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this document?"
    );

    if (!confirmed) return;

    setMessage("");
    setError("");

    try {
      await apiRequest(`/documents/${id}`, { method: "DELETE" });

      setDocuments((current) =>
        current.filter((document) => document._id !== id)
      );

      setChats((current) =>
        current.filter((chat) => {
          const chatDocumentId =
            typeof chat.document === "object"
              ? chat.document?._id
              : chat.document;

          return chatDocumentId !== id;
        })
      );

      setMessage("Document deleted successfully.");
    } catch (err) {
      setError(err.message || "Unable to delete document.");
    }
  }

  async function handleNewChat(documentId) {
    setError("");
    setMessage("");

    try {
      const data = await apiRequest("/chats", {
        method: "POST",
        body: JSON.stringify({ documentId }),
      });

      const newChat = data.chat;

      await loadData();

      navigate(`/documents/${documentId}/ask?chatId=${newChat._id}`);
    } catch (err) {
      setError(err.message || "Unable to create a new chat.");
    }
  }

  async function handleDeleteChat(chatId) {
    const confirmed = window.confirm(
      "Delete this conversation and its saved messages?"
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      await apiRequest(`/chats/${chatId}`, {
        method: "DELETE",
      });

      setChats((current) =>
        current.filter((chat) => chat._id !== chatId)
      );

      setMessage("Conversation deleted successfully.");
    } catch (err) {
      setError(err.message || "Unable to delete conversation.");
    }
  }

  function openChat(chat) {
    const documentId =
      typeof chat.document === "object"
        ? chat.document?._id
        : chat.document;

    if (!documentId) {
      setError("The document associated with this chat could not be found.");
      return;
    }

    navigate(`/documents/${documentId}/ask?chatId=${chat._id}`);
  }

  function formatDate(value) {
    if (!value) return "Unknown";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? "Unknown"
      : date.toLocaleString();
  }

  function formatFileSize(size) {
    if (typeof size !== "number" || !Number.isFinite(size)) {
      return "Unknown size";
    }

    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  }

  return (
    <main className="documents-page">
      <div className="documents-topbar">
        <button
          type="button"
          className="library-back-button"
          onClick={() => navigate("/")}
        >
          <span aria-hidden="true">←</span>
          Dashboard
        </button>

        <button
          type="button"
          className="library-theme-toggle"
          onClick={() =>
            setTheme((current) =>
              current === "light" ? "dark" : "light"
            )
          }
          aria-label={`Switch to ${
            theme === "light" ? "dark" : "light"
          } mode`}
        >
          <span aria-hidden="true">
            {theme === "light" ? "☾" : "☀"}
          </span>
          {theme === "light" ? "Dark mode" : "Light mode"}
        </button>
      </div>

      <header className="documents-header">
        <p className="documents-eyebrow">
          <span className="library-status-dot" />
          STUDYVAULT / YOUR LIBRARY
        </p>

        <h1>Your study materials.</h1>

        <p>
          Keep your notes in one place and return to your learning whenever
          you need to.
        </p>

        <div className="library-stats">
          <div className="library-stat">
            <span className="library-stat-number">{documents.length}</span>
            <span className="library-stat-label">Documents</span>
          </div>

          <span className="library-stat-divider" />

          <div className="library-stat">
            <span className="library-stat-number">{subjects.length}</span>
            <span className="library-stat-label">Subjects</span>
          </div>

          <span className="library-stat-divider" />

          <div className="library-stat">
            <span className="library-stat-number">{chats.length}</span>
            <span className="library-stat-label">Conversations</span>
          </div>
        </div>
      </header>

      {message && (
        <div className="library-notice success-message" role="status">
          <span aria-hidden="true">✓</span>
          {message}
        </div>
      )}

      {error && (
        <div className="library-notice error-message" role="alert">
          <span aria-hidden="true">!</span>
          {error}
        </div>
      )}

      <section className="upload-card">
        <div className="library-section-heading">
          <div>
            <p className="library-section-kicker">ADD TO YOUR LIBRARY</p>
            <h2>Upload study material</h2>
            <p className="section-description">
              Add a PDF to start asking questions about its contents.
            </p>
          </div>

          <span className="upload-heading-mark" aria-hidden="true">
            ↑
          </span>
        </div>

        {subjects.length === 0 ? (
          <div className="library-empty-note">
            <p>You need a subject before uploading a document.</p>
            <button
              type="button"
              className="library-secondary-button"
              onClick={() => navigate("/")}
            >
              Create a subject
            </button>
          </div>
        ) : (
          <form className="upload-form" onSubmit={handleUpload}>
            <div className="upload-fields">
              <label className="library-field" htmlFor="document-title">
                <span>Document title</span>
                <input
                  id="document-title"
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Computer Networks Notes"
                  maxLength={200}
                  required
                />
              </label>

              <label className="library-field" htmlFor="document-subject">
                <span>Subject</span>
                <select
                  id="document-subject"
                  value={subjectId}
                  onChange={(event) => setSubjectId(event.target.value)}
                  required
                >
                  <option value="">Choose a subject</option>
                  {subjects.map((subject) => (
                    <option key={subject._id} value={subject._id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="file-picker" htmlFor="pdf-file">
              <span className="file-picker-icon" aria-hidden="true">
                PDF
              </span>

              <span className="file-picker-copy">
                <strong>
                  {file ? file.name : "Choose a PDF file"}
                </strong>
                <span>
                  {file
                    ? formatFileSize(file.size)
                    : "PDF format · Maximum 10 MB"}
                </span>
              </span>

              <span className="file-picker-action">
                {file ? "Change file" : "Browse"}
              </span>

              <input
                id="pdf-file"
                type="file"
                accept=".pdf,application/pdf"
                onChange={(event) =>
                  setFile(event.target.files?.[0] || null)
                }
                required
              />
            </label>

            <div className="upload-form-footer">
              <p>Your document will be associated with the selected subject.</p>

              <button
                type="submit"
                className="library-primary-button"
                disabled={loading}
              >
                {loading ? "Uploading..." : "Upload PDF"}
                {!loading && <span aria-hidden="true">↗</span>}
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="document-list">
        <div className="library-section-heading list-section-heading">
          <div>
            <p className="library-section-kicker">YOUR MATERIALS</p>
            <h2>Documents</h2>
            <p className="section-description">
              Open a document to study it with AI, or start a fresh conversation.
            </p>
          </div>

          <span className="section-count">
            {documents.length} {documents.length === 1 ? "file" : "files"}
          </span>
        </div>

        {documents.length === 0 ? (
          <div className="library-empty-state">
            <span className="empty-state-mark" aria-hidden="true">—</span>
            <h3>Your library is empty</h3>
            <p>
              Upload your first PDF above. Your saved study material will
              appear here.
            </p>
          </div>
        ) : (
          <div className="document-grid">
            {documents.map((document) => (
              <article className="document-card" key={document._id}>
                <div className="document-card-top">
                  <span className="document-file-mark" aria-hidden="true">
                    PDF
                  </span>

                  <span
                    className={`document-status ${
                      document.processingStatus === "failed"
                        ? "document-status-error"
                        : ""
                    }`}
                  >
                    <span />
                    {document.processingStatus || "uploaded"}
                  </span>
                </div>

                <h3>{document.title}</h3>

                <p className="document-original-name">
                  {document.originalName || "PDF document"}
                </p>

                <div className="document-details">
                  <div>
                    <span>Subject</span>
                    <strong>{document.subject?.name || "Unknown subject"}</strong>
                  </div>

                  <div>
                    <span>File size</span>
                    <strong>{formatFileSize(document.size)}</strong>
                  </div>
                </div>

                <div className="document-card-actions">
                  <button
                    type="button"
                    className="library-primary-button"
                    onClick={() => navigate(`/documents/${document._id}/ask`)}
                  >
                    Ask AI <span aria-hidden="true">↗</span>
                  </button>

                  <button
                    type="button"
                    className="library-secondary-button"
                    onClick={() => handleNewChat(document._id)}
                  >
                    New chat
                  </button>

                  <button
                    type="button"
                    className="library-delete-button"
                    onClick={() => handleDelete(document._id)}
                    aria-label={`Delete ${document.title}`}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="chat-history-section">
        <div className="library-section-heading list-section-heading">
          <div>
            <p className="library-section-kicker">PICK UP WHERE YOU LEFT OFF</p>
            <h2>Chat history</h2>
            <p className="section-description">
              Return to a saved conversation without losing your previous questions.
            </p>
          </div>

          <span className="section-count">
            {chats.length} {chats.length === 1 ? "chat" : "chats"}
          </span>
        </div>

        {historyLoading ? (
          <div className="library-loading">
            <span className="library-spinner" />
            Loading your conversations...
          </div>
        ) : chats.length === 0 ? (
          <div className="library-empty-state history-empty-state">
            <h3>No conversations yet</h3>
            <p>
              Start a chat from one of your documents. Your conversations
              will be saved here.
            </p>
          </div>
        ) : (
          <div className="chat-history-list">
            {chats.map((chat) => (
              <article className="chat-history-card" key={chat._id}>
                <div className="chat-history-main">
                  <span className="chat-history-mark" aria-hidden="true">
                    ↳
                  </span>

                  <div className="chat-history-copy">
                    <h3>{chat.title || "Untitled conversation"}</h3>

                    <p className="chat-document-name">
                      {chat.document?.title || "Unknown document"}
                    </p>

                    <div className="chat-history-meta">
                      <span>
                        {chat.messages?.length || 0} messages
                      </span>
                      <span className="meta-dot">·</span>
                      <span>Updated {formatDate(chat.updatedAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="chat-history-actions">
                  <button
                    type="button"
                    className="library-secondary-button"
                    onClick={() => openChat(chat)}
                  >
                    Open chat <span aria-hidden="true">↗</span>
                  </button>

                  <button
                    type="button"
                    className="library-delete-button"
                    onClick={() => handleDeleteChat(chat._id)}
                    aria-label={`Delete conversation ${chat.title || "Untitled"}`}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className="documents-footer">
        <span>STUDYVAULT</span>
        <span>A quieter space to learn</span>
      </footer>
    </main>
  );
}

export default Documents;
