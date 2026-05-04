export default function Topbar({ onMenuToggle }) {
  return (
    <header className="topbar">
      <button className="menu-toggle" onClick={onMenuToggle} aria-label="Toggle menu">
        <i className="ri-menu-line" />
      </button>
      <span className="topbar-title">SiPinjem</span>
      <div className="topbar-pulse" />
    </header>
  );
}