import { useEffect, useState } from "react";
import { SHIFT_KEYS, SHIFT_LABELS } from "../utils/shiftUtils";

export default function SettingsModal({ open, defaults, onSave, onClose }) {
  const [form, setForm] = useState(defaults);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(defaults);
  }, [open, defaults]);

  if (!open) return null;

  const updateField = (code, field, value) => {
    setForm((prev) => ({ ...prev, [code]: { ...prev[code], [field]: value } }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (e) {
      alert("Could not save shift timings: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="overlay show"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal">
        <h3>Default shift timings</h3>
        <div id="defaultsForm">
          <div className="defaults-columns">
            <span></span>
            <span>START</span>
            <span>END</span>
          </div>
          {SHIFT_KEYS.map((code) => (
            <div className="default-shift-row" key={code}>
              <div className="default-shift-label">
                <strong>{code}</strong>
                <span>{SHIFT_LABELS[code]}</span>
              </div>
              <input
                type="time"
                aria-label={`${code} start time`}
                value={form[code]?.start || ""}
                onChange={(e) => updateField(code, "start", e.target.value)}
              />
              <input
                type="time"
                aria-label={`${code} end time`}
                value={form[code]?.end || ""}
                onChange={(e) => updateField(code, "end", e.target.value)}
              />
            </div>
          ))}
        </div>
        <div className="modalbtns">
          <button className="btn-cancel" onClick={onClose} disabled={saving}>
            Close
          </button>
          <button className="btn-save" onClick={handleSave} disabled={saving}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
