import chroniqLogo from "../assets/chroniqlogo.svg";

export default function Header({ saved, onLogout }) {
  return (
    <header className="app-header">
      <div className="header-brand">
        <img
          src={chroniqLogo}
          alt="Chroniq"
          className="header-logo"
        />
      </div>

      <div className="header-actions">
        <div className={`savebadge${saved ? " show" : ""}`}>
          <i className="fa-solid fa-circle-check" aria-hidden="true"></i>
          saved
        </div>

        <button
          className="settingsbtn"
          onClick={onLogout}
          title="Sign out"
          aria-label="Sign out"
        >
          <i
            className="fa-solid fa-right-from-bracket"
            aria-hidden="true"
          />
        </button>
      </div>
    </header>
  );
}