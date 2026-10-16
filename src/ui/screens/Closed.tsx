import { Footer } from "../components/Footer";

/** Shown instead of Home while the owner has Spotto switched off. Practice still works (it's offline). */
export function Closed({ onPractice }: { onPractice: () => void }) {
  return (
    <main className="screen home closed">
      <div className="trophy" aria-hidden>🔒</div>
      <h1 className="logo">Spotto</h1>
      <p className="lead center">Spotto is closed right now.</p>
      <p className="hint center">Rooms are paused for a while. Check back later.</p>
      <button className="secondary" onClick={onPractice}>🎯 Practice while you wait</button>
      <Footer />
    </main>
  );
}
