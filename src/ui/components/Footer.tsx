import { useState } from "react";

/** Copyright, version, and the privacy note. */
export function Footer() {
  const [privacy, setPrivacy] = useState(false);
  return (
    <>
      <footer className="footer">
        <span>© {new Date().getFullYear()} Sayan</span>
        <span aria-hidden>·</span>
        <span>v{__APP_VERSION__}</span>
        <span aria-hidden>·</span>
        <button className="link inline-quiet" onClick={() => setPrivacy(true)}>Privacy</button>
      </footer>
      {privacy && (
        <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="privacy-title"
          onClick={(e) => e.target === e.currentTarget && setPrivacy(false)}>
          <div className="sheet-inner compact privacy">
            <h2 id="privacy-title">Privacy</h2>
            <p>Spotto signs you in anonymously. There's no account, email or password.</p>
            <p>To improve the game it records anonymous usage: which screens and modes are used, game length,
              device type (phone or computer) and app version, linked to a random id, never your name.</p>
            <p>Google Analytics measures visits, including your approximate country and city.
              Google sees your IP address to do this; Spotto never stores IP addresses.</p>
            <p>Your nickname is visible to other players in your room and on the daily leaderboard.
              Stats on the Stats page stay on your phone.</p>
            <button className="primary" onClick={() => setPrivacy(false)}>OK</button>
          </div>
        </div>
      )}
    </>
  );
}
