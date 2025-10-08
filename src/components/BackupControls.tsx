import { useState, useRef } from "react";
import { backupUtils } from "../stores";

export function BackupControls() {
  const [message, setMessage] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadBackup = async () => {
    try {
      await backupUtils.downloadBackup();
      setMessage("✅ Backup downloaded to your Downloads folder!");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage("❌ Failed to download backup");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await backupUtils.restoreFromFile(file);
      setMessage("✅ Data restored successfully! Refresh the page.");
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      setMessage("❌ Failed to restore backup");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: "1rem",
        right: "1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        alignItems: "flex-end",
      }}
    >
      {message && (
        <div
          style={{
            padding: "0.75rem 1rem",
            background: message.includes("✅") ? "#10b981" : "#ef4444",
            color: "white",
            borderRadius: "8px",
            fontSize: "0.9rem",
            fontWeight: "600",
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          }}
        >
          {message}
        </div>
      )}

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          onClick={handleDownloadBackup}
          style={{
            padding: "0.75rem 1rem",
            fontSize: "0.9rem",
            fontWeight: "600",
            background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
            color: "white",
            border: "2px solid #2563eb",
            borderRadius: "12px",
            cursor: "pointer",
            transition: "all 200ms ease",
            boxShadow: "0 4px 12px rgba(59,130,246,0.3)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 6px 16px rgba(59,130,246,0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(59,130,246,0.3)";
          }}
        >
          💾 Download Backup
        </button>

        <button
          onClick={handleRestoreClick}
          style={{
            padding: "0.75rem 1rem",
            fontSize: "0.9rem",
            fontWeight: "600",
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            color: "white",
            border: "2px solid #059669",
            borderRadius: "12px",
            cursor: "pointer",
            transition: "all 200ms ease",
            boxShadow: "0 4px 12px rgba(16,185,129,0.3)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 6px 16px rgba(16,185,129,0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(16,185,129,0.3)";
          }}
        >
          📂 Restore Backup
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          style={{ display: "none" }}
        />
      </div>
    </div>
  );
}
