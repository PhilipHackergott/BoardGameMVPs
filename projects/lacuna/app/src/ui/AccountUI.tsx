import { useEffect, useState } from "react";
import { useGame } from "../state/store";

// ─── Sign in / create account ──────────────────────────────────────────────--
export function AuthScreen({ onDone, onBack }: { onDone: () => void; onBack: () => void }) {
  const auth = useGame((s) => s.auth);
  const busy = useGame((s) => s.online.busy);
  const error = useGame((s) => s.online.authError);
  const login = useGame((s) => s.login);
  const signup = useGame((s) => s.signup);
  const clearAuthError = useGame((s) => s.clearAuthError);

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");

  // Close the screen once we're authenticated.
  useEffect(() => {
    if (auth) onDone();
  }, [auth, onDone]);

  const submit = () => {
    if (mode === "login") login(email.trim(), password);
    else signup(email.trim(), handle.trim(), password);
  };

  return (
    <div className="menu-sheet" style={{ maxWidth: 460 }}>
      <div className="sheet-head">
        <h2>{mode === "login" ? "Sign in" : "Create account"}</h2>
        <button className="ghost-btn" onClick={onBack}>
          ← Back
        </button>
      </div>

      <div className="segmented" style={{ marginBottom: 18 }}>
        <button
          className={mode === "login" ? "seg on" : "seg"}
          onClick={() => {
            setMode("login");
            clearAuthError();
          }}
        >
          Sign in
        </button>
        <button
          className={mode === "signup" ? "seg on" : "seg"}
          onClick={() => {
            setMode("signup");
            clearAuthError();
          }}
        >
          Create account
        </button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="acct-field">
          <label>Email</label>
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        {mode === "signup" && (
          <div className="acct-field">
            <label>Handle</label>
            <input value={handle} maxLength={16} onChange={(e) => setHandle(e.target.value)} placeholder="2–16 letters, numbers, _" />
          </div>
        )}
        <div className="acct-field">
          <label>Password</label>
          <input
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "signup" ? "at least 8 characters" : ""}
          />
        </div>

        {error && <p className="acct-error">{error}</p>}

        <button type="submit" className="menu-start" disabled={busy}>
          {busy ? "…" : mode === "login" ? "Sign in" : "Create account & play"}
        </button>
      </form>
    </div>
  );
}

// ─── Account management (inside Settings) ───────────────────────────────────--
export function AccountPanel({ onSignIn }: { onSignIn: () => void }) {
  const auth = useGame((s) => s.auth);
  const busy = useGame((s) => s.online.busy);
  const error = useGame((s) => s.online.authError);
  const updateAccount = useGame((s) => s.updateAccount);
  const changePassword = useGame((s) => s.changePassword);
  const deleteAccount = useGame((s) => s.deleteAccount);
  const logout = useGame((s) => s.logout);

  const [handle, setHandle] = useState(auth?.user.handle ?? "");
  const [email, setEmail] = useState(auth?.user.email ?? "");
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [delPw, setDelPw] = useState("");

  useEffect(() => {
    if (auth) {
      setHandle(auth.user.handle);
      setEmail(auth.user.email);
    }
  }, [auth?.user.handle, auth?.user.email]);

  if (!auth) {
    return (
      <div className="field">
        <label>Account</label>
        <p className="field-hint">Sign in to play ranked online, track your Elo, and sync across devices.</p>
        <button className="ghost-btn" onClick={onSignIn}>
          Sign in / create account
        </button>
      </div>
    );
  }

  const u = auth.user;
  return (
    <>
      <div className="field">
        <label>Account</label>
        <div className="acct-profile">
          <div className="acct-rank">{u.elo}</div>
          <div>
            <div className="acct-handle">{u.handle}</div>
            <div className="field-hint">
              {u.email} · {u.wins}W / {u.losses}L / {u.draws}D
            </div>
          </div>
        </div>
      </div>

      <div className="acct-field">
        <label>Handle</label>
        <div className="acct-row">
          <input value={handle} maxLength={16} onChange={(e) => setHandle(e.target.value)} />
          <button className="ghost-btn" disabled={busy || handle === u.handle} onClick={() => updateAccount({ handle: handle.trim() })}>
            Save
          </button>
        </div>
      </div>

      <div className="acct-field">
        <label>Email</label>
        <div className="acct-row">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="ghost-btn" disabled={busy || email === u.email} onClick={() => updateAccount({ email: email.trim() })}>
            Save
          </button>
        </div>
      </div>

      <div className="acct-field">
        <label>Change password</label>
        <input type="password" autoComplete="current-password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} placeholder="current password" />
        <input type="password" autoComplete="new-password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="new password (8+)" style={{ marginTop: 8 }} />
        <button
          className="ghost-btn"
          style={{ marginTop: 8 }}
          disabled={busy || !oldPw || !newPw}
          onClick={() => {
            changePassword(oldPw, newPw);
            setOldPw("");
            setNewPw("");
          }}
        >
          Update password
        </button>
      </div>

      {error && <p className="acct-error">{error}</p>}

      <div className="field" style={{ borderTop: "1px solid rgba(49,46,129,0.35)", paddingTop: 16 }}>
        <button className="ghost-btn" onClick={logout}>
          Sign out
        </button>
      </div>

      <div className="field">
        <label>Danger zone</label>
        {!confirmDelete ? (
          <button className="reset-btn" onClick={() => setConfirmDelete(true)}>
            Delete account
          </button>
        ) : (
          <div className="acct-field">
            <p className="field-hint">This permanently deletes your account and rating. Enter your password to confirm.</p>
            <div className="acct-row">
              <input type="password" value={delPw} onChange={(e) => setDelPw(e.target.value)} placeholder="password" />
              <button className="reset-btn" disabled={busy || !delPw} onClick={() => deleteAccount(delPw)}>
                Delete forever
              </button>
            </div>
            <button className="ghost-btn" style={{ marginTop: 8 }} onClick={() => setConfirmDelete(false)}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </>
  );
}
