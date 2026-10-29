
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../services/api";
import "./Dashboard.css";

export default function Dashboard() {
  const navigate = useNavigate();

  const [subjects, setSubjects] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [semester, setSemester] = useState("5");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingId, setEditingId] = useState(null);
const [editName, setEditName] = useState("");
const [editDescription, setEditDescription] = useState("");
const [editSemester, setEditSemester] = useState("5");

const [search, setSearch] = useState("");
const [semesterFilter, setSemesterFilter] = useState("all");
const [theme, setTheme] = useState(
  () => localStorage.getItem("studyvault-theme") || "light"
);

useEffect(() => {
  document.documentElement.dataset.studyvaultTheme = theme;
  localStorage.setItem("studyvault-theme", theme);
}, [theme]);

  const loadSubjects = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/subjects");
      setSubjects(data.subjects);
    } catch (err) {
      setError(err.message);

      if (
        err.message.toLowerCase().includes("token") ||
        err.message.toLowerCase().includes("log in") ||
        err.message.toLowerCase().includes("authentication")
      ) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  async function handleCreateSubject(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const data = await apiRequest("/subjects", {
        method: "POST",
        body: JSON.stringify({
          name,
          description,
          semester: Number(semester),
        }),
      });

      setSubjects((current) => [data.subject, ...current]);
      setName("");
      setDescription("");
      setSuccess("Subject created successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSubject(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this subject?"
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await apiRequest(`/subjects/${id}`, {
        method: "DELETE",
      });

      setSubjects((current) =>
        current.filter((subject) => subject._id !== id)
      );

      setSuccess("Subject deleted successfully.");
    } catch (err) {
      setError(err.message);
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  }
  
function startEditing(subject) {
  setEditingId(subject._id);
  setEditName(subject.name);
  setEditDescription(subject.description || "");
  setEditSemester(String(subject.semester));
  setError("");
  setSuccess("");
}

function cancelEditing() {
  setEditingId(null);
  setEditName("");
  setEditDescription("");
  setEditSemester("5");
}

async function handleUpdateSubject(event) {
  event.preventDefault();
  setError("");
  setSuccess("");

  try {
    const data = await apiRequest(`/subjects/${editingId}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: editName,
        description: editDescription,
        semester: Number(editSemester),
      }),
    });

    setSubjects((current) =>
      current.map((subject) =>
        subject._id === editingId ? data.subject : subject
      )
    );

    cancelEditing();
    setSuccess("Subject updated successfully.");
  } catch (err) {
    setError(err.message);
  }
}

const filteredSubjects = subjects.filter((subject) => {
  const matchesSearch = subject.name
    .toLowerCase()
    .includes(search.trim().toLowerCase());

  const matchesSemester =
    semesterFilter === "all" ||
    subject.semester === Number(semesterFilter);

  return matchesSearch && matchesSemester;
});


  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">STUDYVAULT</p>
          <h1>Your study workspace</h1>
          <p>Organize your subjects and learning materials.</p>
        </div>

        <button className="secondary-button" onClick={handleLogout}>
          Log out
        </button>
        <button onClick={() => navigate("/documents")}>
  Manage Documents
</button>
<button
  type="button"
  className="secondary-button"
  onClick={() =>
    setTheme((current) => current === "light" ? "dark" : "light")
  }
  aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
>
  {theme === "light" ? "Dark mode" : "Light mode"}
</button>
      </header>

      {error && <p className="message error">{error}</p>}
      {success && <p className="message success">{success}</p>}

      <section className="subject-form-card">
        <h2>Add a subject</h2>

        <form onSubmit={handleCreateSubject}>
          <label>
            Subject name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Computer Networks"
              minLength={2}
              maxLength={100}
              required
            />
          </label>

          <label>
            Description
            <textarea
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              placeholder="What will you study?"
              maxLength={500}
              rows={3}
            />
          </label>

          <label>
            Semester
            <select
              value={semester}
              onChange={(event) => setSemester(event.target.value)}
              required
            >
              {Array.from({ length: 12 }, (_, index) => index + 1).map(
                (number) => (
                  <option key={number} value={number}>
                    Semester {number}
                  </option>
                )
              )}
            </select>
          </label>

          <button type="submit" disabled={saving}>
            {saving ? "Creating..." : "+ Add subject"}
          </button>
        </form>
      </section>

      <section className="subjects-section">
        <div className="section-heading">
          <h2>Your subjects</h2>
          <span>{subjects.length} total</span>
          
<div className="subject-filters">
  <input
    type="search"
    placeholder="Search subjects..."
    value={search}
    onChange={(event) => setSearch(event.target.value)}
    aria-label="Search subjects"
  />

  <select
    value={semesterFilter}
    onChange={(event) => setSemesterFilter(event.target.value)}
    aria-label="Filter by semester"
  >
    <option value="all">All semesters</option>
    {Array.from({ length: 12 }, (_, index) => index + 1).map(
      (number) => (
        <option key={number} value={number}>
          Semester {number}
        </option>
      )
    )}
  </select>
</div>

        </div>

        
{loading ? (
  <p>Loading your subjects...</p>
) : filteredSubjects.length === 0 ? (
  <p className="empty-state">
    {subjects.length === 0
      ? "No subjects yet. Add your first subject above!"
      : "No subjects match your search or semester filter."}
  </p>
) : (
  <div className="subject-grid">
    {filteredSubjects.map((subject) => (
      <article className="subject-card" key={subject._id}>
        {editingId === subject._id ? (
          <form onSubmit={handleUpdateSubject}>
            <label>
              Subject name
              <input
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                minLength={2}
                maxLength={100}
                required
              />
            </label>

            <label>
              Description
              <textarea
                value={editDescription}
                onChange={(event) =>
                  setEditDescription(event.target.value)
                }
                maxLength={500}
                rows={3}
              />
            </label>

            <label>
              Semester
              <select
                value={editSemester}
                onChange={(event) =>
                  setEditSemester(event.target.value)
                }
              >
                {Array.from({ length: 12 }, (_, index) => index + 1).map(
                  (number) => (
                    <option key={number} value={number}>
                      Semester {number}
                    </option>
                  )
                )}
              </select>
            </label>

            <button type="submit">Save changes</button>
            <button
              type="button"
              className="secondary-button"
              onClick={cancelEditing}
            >
              Cancel
            </button>
          </form>
        ) : (
          <>
            <span className="subject-tag">
              Semester {subject.semester}
            </span>

            <h3>{subject.name}</h3>
            <p>
              {subject.description || "No description added yet."}
            </p>

            <div className="subject-actions">
              <button
                className="secondary-button"
                onClick={() => startEditing(subject)}
              >
                Edit
              </button>

              <button
                className="delete-button"
                onClick={() => handleDeleteSubject(subject._id)}
              >
                Delete
              </button>
            </div>
          </>
        )}
      </article>
    ))}
  </div>
)}

      </section>
    </main>
  );
}
