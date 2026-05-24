import { useState } from "react";
import { useGame } from "../state/store";
import type { FriendInfo } from "../net/protocol";

const PRESENCE_LABEL: Record<FriendInfo["presence"], string> = {
  online: "Online",
  "in-game": "In game",
  offline: "Offline",
};

// ─── Friends view (menu) ────────────────────────────────────────────────────-
export function FriendsPanel({ onBack, onSignIn }: { onBack: () => void; onSignIn: () => void }) {
  const auth = useGame((s) => s.auth);
  const friends = useGame((s) => s.friends);
  const online = useGame((s) => s.online);
  const addFriend = useGame((s) => s.addFriend);
  const acceptFriend = useGame((s) => s.acceptFriend);
  const declineFriend = useGame((s) => s.declineFriend);
  const removeFriend = useGame((s) => s.removeFriend);
  const inviteFriend = useGame((s) => s.inviteFriend);
  const [handle, setHandle] = useState("");

  const canInvite = online.status !== "playing" && online.status !== "queued";

  return (
    <div className="menu-sheet">
      <div className="sheet-head">
        <h2>Friends</h2>
        <button className="ghost-btn" onClick={onBack}>
          ← Back
        </button>
      </div>

      {!auth ? (
        <div className="field">
          <p className="field-hint">Sign in to add friends and invite them to games.</p>
          <button className="ghost-btn" onClick={onSignIn}>
            Sign in / create account
          </button>
        </div>
      ) : (
        <>
          <div className="acct-field">
            <label>Add a friend by handle</label>
            <div className="acct-row">
              <input value={handle} maxLength={16} onChange={(e) => setHandle(e.target.value)} placeholder="their handle" />
              <button
                className="ghost-btn"
                disabled={!handle.trim()}
                onClick={() => {
                  addFriend(handle.trim());
                  setHandle("");
                }}
              >
                Add
              </button>
            </div>
          </div>

          {friends.reqIn.length > 0 && (
            <div className="field">
              <label>Requests</label>
              <ul className="friend-list">
                {friends.reqIn.map((f) => (
                  <li className="friend-row" key={f.userId}>
                    <span className="friend-name">{f.handle}</span>
                    <span className="friend-elo">{f.elo}</span>
                    <button className="ghost-btn friend-btn" onClick={() => acceptFriend(f.userId)}>
                      Accept
                    </button>
                    <button className="ghost-btn friend-btn" onClick={() => declineFriend(f.userId)}>
                      Decline
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="field">
            <label>Your friends</label>
            {friends.list.length === 0 ? (
              <p className="field-hint">No friends yet — add someone by their handle above.</p>
            ) : (
              <ul className="friend-list">
                {friends.list.map((f) => (
                  <li className="friend-row" key={f.userId}>
                    <span className={`friend-presence ${f.presence}`} title={PRESENCE_LABEL[f.presence]} aria-hidden />
                    <span className="friend-name">{f.handle}</span>
                    <span className="friend-elo">{f.elo}</span>
                    <button
                      className="ghost-btn friend-btn invite"
                      disabled={f.presence !== "online" || !canInvite}
                      title={f.presence !== "online" ? "Available when they're online" : "Invite to a casual game"}
                      onClick={() => inviteFriend(f.userId)}
                    >
                      Invite
                    </button>
                    <button className="ghost-btn friend-btn" onClick={() => removeFriend(f.userId)}>
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {friends.reqOut.length > 0 && (
            <div className="field">
              <label>Pending (sent)</label>
              <ul className="friend-list">
                {friends.reqOut.map((f) => (
                  <li className="friend-row pending" key={f.userId}>
                    <span className="friend-name">{f.handle}</span>
                    <span className="field-hint">requested</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Incoming game-invite toast (rendered globally) ─────────────────────────--
export function InviteToast() {
  const invite = useGame((s) => s.incomingInvite);
  const accept = useGame((s) => s.acceptInvite);
  const decline = useGame((s) => s.declineInvite);
  if (!invite) return null;
  return (
    <div className="invite-toast" role="dialog" aria-live="assertive">
      <div className="invite-toast-text">
        <strong>{invite.handle}</strong> invites you to a game
      </div>
      <div className="invite-toast-actions">
        <button className="menu-start invite-accept" onClick={() => accept(invite.userId)}>
          Accept
        </button>
        <button className="ghost-btn" onClick={() => decline(invite.userId)}>
          Decline
        </button>
      </div>
    </div>
  );
}
