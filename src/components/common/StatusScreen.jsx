export default function StatusScreen({ message, isError, onRetry }) {
  return (
    <div className={`status-screen${isError ? " status-screen-error" : ""}`}>
      <div className="status-card">
        {!isError && <div className="status-spinner" aria-hidden="true"></div>}
        <p>{message}</p>
        {isError && onRetry && (
          <button className="btn-save" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
