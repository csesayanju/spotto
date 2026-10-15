/** Copyright and version line. */
export function Footer() {
  return (
    <footer className="footer">
      <span>© {new Date().getFullYear()} Sayan</span>
      <span aria-hidden>·</span>
      <span>v{__APP_VERSION__}</span>
    </footer>
  );
}
