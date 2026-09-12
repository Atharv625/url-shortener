import { useState, useRef } from "react";

// --- config --------------------------------------------------------------

// Point this at your API. Adjust the fetch call in createTicket() below
// if your endpoint expects a different request/response shape.
const API_BASE = "http://16.171.140.124:8080/api";
async function createShortLink(originalUrl) {
  const res = await fetch(`${API_BASE}/shorten`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: originalUrl }),
  });

  if (!res.ok) {
    const message = await res.text().catch(() => "");
    throw new Error(message || `Server responded with ${res.status}`);
  }

  const data = await res.json();
  // Expected shape: { code: "abc123", shortUrl: "https://snip.link/abc123" }
  // Adjust these field names to match your API's actual response.
  return {
    code: data.code ?? data.shortCode ?? data.slug,
    shortUrl: data.shortUrl ?? data.short_url ?? data.url,
  };
}

async function deleteShortLink(code) {
  const res = await fetch(`${API_BASE}/links/${encodeURIComponent(code)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(`Failed to void ticket (${res.status})`);
  }
}

// --- helpers -----------------------------------------------------------

function isLikelyUrl(value) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

// --- component -----------------------------------------------------------

export default function App() {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [tickets, setTickets] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  async function handleSubmit(e) {
    e.preventDefault();
    const value = input.trim();
    if (!value) {
      setError("Enter a link first.");
      return;
    }
    if (!isLikelyUrl(value)) {
      setError("That doesn't look like a valid http(s) link.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const { code, shortUrl } = await createShortLink(value);
      const ticket = {
        id: crypto.randomUUID(),
        code,
        shortUrl,
        original: value,
        createdAt: Date.now(),
      };
      setTickets((prev) => [ticket, ...prev]);
      setInput("");
      inputRef.current?.focus();
    } catch (err) {
      setError(err.message || "Couldn't reach the server. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleCopy(ticket) {
    const short = ticket.shortUrl ?? `snip.link/${ticket.code}`;
    navigator.clipboard?.writeText(short).catch(() => {});
    setCopiedId(ticket.id);
    window.setTimeout(
      () => setCopiedId((id) => (id === ticket.id ? null : id)),
      1600,
    );
  }

  async function handleVoid(ticket) {
    const previous = tickets;
    setTickets((prev) => prev.filter((t) => t.id !== ticket.id));
    try {
      await deleteShortLink(ticket.code);
    } catch (err) {
      // Restore the ticket if the server couldn't delete it.
      setTickets(previous);
      setError(err.message || "Couldn't void that ticket.");
    }
  }

  return (
    <div style={styles.page}>
      <style>{fontImports}</style>

      <header style={styles.header}>
        <div style={styles.stamp} aria-hidden="true">
          <svg viewBox="0 0 64 64" width="30" height="30" fill="none">
            <circle
              cx="32"
              cy="32"
              r="29"
              stroke="currentColor"
              strokeWidth="2.5"
            />
            <circle
              cx="32"
              cy="32"
              r="21"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="3 4"
            />
            <text
              x="32"
              y="38"
              textAnchor="middle"
              fontSize="18"
              fontFamily="'Fraunces', serif"
              fill="currentColor"
            >
              §
            </text>
          </svg>
        </div>
        <div>
          <h1 style={styles.title}>Claim Desk</h1>
          <p style={styles.subtitle}>
            Hand in a long link, walk away with a short claim ticket.
          </p>
        </div>
      </header>

      <form onSubmit={handleSubmit} style={styles.form} noValidate>
        <label htmlFor="url-input" style={styles.label}>
          Link to shorten
        </label>
        <div style={styles.inputRow}>
          <input
            id="url-input"
            ref={inputRef}
            type="text"
            inputMode="url"
            placeholder="https://example.com/a/very/long/path?with=params"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (error) setError("");
            }}
            style={styles.input}
          />
          <button
            type="submit"
            style={styles.submitButton}
            disabled={submitting}
          >
            {submitting ? "Stamping…" : "Issue ticket"}
          </button>
        </div>
        {error && (
          <p role="alert" style={styles.errorText}>
            {error}
          </p>
        )}
      </form>

      <section style={styles.ticketStack} aria-label="Issued tickets">
        {tickets.length === 0 ? (
          <div style={styles.empty}>
            <p style={styles.emptyTitle}>No tickets issued yet</p>
            <p style={styles.emptyBody}>
              Paste a link above. Your first claim stub will print here.
            </p>
          </div>
        ) : (
          tickets.map((ticket) => (
            <Ticket
              key={ticket.id}
              ticket={ticket}
              onCopy={() => handleCopy(ticket)}
              onVoid={() => handleVoid(ticket)}
              copied={copiedId === ticket.id}
            />
          ))
        )}
      </section>
    </div>
  );
}

function Ticket({ ticket, onCopy, onVoid, copied }) {
  const shortDisplay = ticket.shortUrl
    ? ticket.shortUrl.replace(/^https?:\/\//, "")
    : ticket.code;
  return (
    <div style={styles.ticket}>
      <div style={styles.ticketMain}>
        <div style={styles.ticketRow}>
          <span style={styles.ticketEyebrow}>Original</span>
          <span style={styles.ticketTime}>{timeAgo(ticket.createdAt)}</span>
        </div>
        <p style={styles.ticketOriginal} title={ticket.original}>
          {truncate(ticket.original, 54)}
        </p>
      </div>

      <div style={styles.perforation} aria-hidden="true">
        {Array.from({ length: 22 }).map((_, i) => (
          <span key={i} style={styles.dot} />
        ))}
      </div>

      <div style={styles.ticketStub}>
        <span style={styles.stubLabel}>Your claim code</span>
        <span style={styles.stubCode}>{shortDisplay}</span>
        <div style={styles.stubActions}>
          <button type="button" onClick={onCopy} style={styles.stubButton}>
            {copied ? "Copied" : "Copy"}
          </button>
          <button type="button" onClick={onVoid} style={styles.stubButtonGhost}>
            Void
          </button>
        </div>
      </div>
    </div>
  );
}

function truncate(str, max) {
  return str.length > max ? `${str.slice(0, max - 1)}…` : str;
}

// --- styling -----------------------------------------------------------

const fontImports = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500&display=swap');
`;

const INK = "#1c2230";
const PAPER = "#efe6d3";
const PAPER_DIM = "#e2d7bd";
const STAMP_RED = "#a5342a";
const LINE = "rgba(28,34,48,0.18)";

const styles = {
  page: {
    minHeight: "100vh",
    background: INK,
    backgroundImage:
      "radial-gradient(circle at 15% 10%, rgba(239,230,211,0.05), transparent 40%), radial-gradient(circle at 85% 90%, rgba(165,52,42,0.08), transparent 45%)",
    color: PAPER,
    fontFamily: "'Inter', sans-serif",
    padding: "48px 20px 80px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    gap: 16,
    maxWidth: 520,
    width: "100%",
    marginBottom: 40,
  },
  stamp: {
    color: STAMP_RED,
    marginTop: 4,
    flexShrink: 0,
  },
  title: {
    fontFamily: "'Fraunces', serif",
    fontWeight: 600,
    fontSize: "2rem",
    margin: 0,
    letterSpacing: "-0.01em",
    color: PAPER,
  },
  subtitle: {
    margin: "6px 0 0",
    fontSize: "0.95rem",
    color: "rgba(239,230,211,0.65)",
    lineHeight: 1.5,
    maxWidth: 360,
  },
  form: {
    width: "100%",
    maxWidth: 520,
    marginBottom: 44,
  },
  label: {
    display: "block",
    fontSize: "0.8rem",
    color: "rgba(239,230,211,0.55)",
    marginBottom: 8,
  },
  inputRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  input: {
    flex: "1 1 260px",
    background: "rgba(239,230,211,0.06)",
    border: `1px solid ${LINE}`,
    borderRadius: 4,
    padding: "13px 14px",
    color: PAPER,
    fontSize: "0.95rem",
    fontFamily: "'IBM Plex Mono', monospace",
    outline: "none",
  },
  submitButton: {
    background: STAMP_RED,
    color: PAPER,
    border: "none",
    borderRadius: 4,
    padding: "0 22px",
    fontFamily: "'Fraunces', serif",
    fontWeight: 600,
    fontSize: "0.95rem",
    cursor: "pointer",
  },
  errorText: {
    color: "#e2988f",
    fontSize: "0.85rem",
    marginTop: 10,
  },
  ticketStack: {
    width: "100%",
    maxWidth: 520,
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  empty: {
    border: `1px dashed ${LINE}`,
    borderRadius: 6,
    padding: "32px 20px",
    textAlign: "center",
  },
  emptyTitle: {
    fontFamily: "'Fraunces', serif",
    fontSize: "1.05rem",
    margin: "0 0 6px",
    color: PAPER,
  },
  emptyBody: {
    margin: 0,
    fontSize: "0.85rem",
    color: "rgba(239,230,211,0.5)",
  },
  ticket: {
    background: PAPER,
    color: INK,
    borderRadius: 8,
    overflow: "hidden",
    boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
  },
  ticketMain: {
    padding: "18px 20px 16px",
  },
  ticketRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 6,
  },
  ticketEyebrow: {
    fontSize: "0.7rem",
    color: "rgba(28,34,48,0.5)",
  },
  ticketTime: {
    fontSize: "0.7rem",
    color: "rgba(28,34,48,0.4)",
    fontFamily: "'IBM Plex Mono', monospace",
  },
  ticketOriginal: {
    margin: 0,
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "0.88rem",
    wordBreak: "break-all",
  },
  perforation: {
    display: "flex",
    justifyContent: "space-between",
    padding: "0 6px",
    background: PAPER,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: INK,
    opacity: 0.15,
    transform: "translateY(-3px)",
  },
  ticketStub: {
    background: PAPER_DIM,
    padding: "16px 20px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  stubLabel: {
    fontSize: "0.7rem",
    color: "rgba(28,34,48,0.5)",
  },
  stubCode: {
    fontFamily: "'Fraunces', serif",
    fontWeight: 600,
    fontSize: "1.3rem",
    letterSpacing: "0.01em",
  },
  stubActions: {
    display: "flex",
    gap: 10,
    marginTop: 4,
  },
  stubButton: {
    background: INK,
    color: PAPER,
    border: "none",
    borderRadius: 4,
    padding: "8px 16px",
    fontSize: "0.82rem",
    fontFamily: "'Inter', sans-serif",
    cursor: "pointer",
  },
  stubButtonGhost: {
    background: "transparent",
    color: "rgba(28,34,48,0.55)",
    border: `1px solid ${LINE}`,
    borderRadius: 4,
    padding: "8px 16px",
    fontSize: "0.82rem",
    fontFamily: "'Inter', sans-serif",
    cursor: "pointer",
  },
};
