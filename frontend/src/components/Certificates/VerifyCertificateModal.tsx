import React, { useState } from "react";
import { X, Search, CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";
import { api } from "../../services/api";

interface VerifyCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCertId?: string;
}

export const VerifyCertificateModal: React.FC<VerifyCertificateModalProps> = ({
  isOpen,
  onClose,
  defaultCertId = "",
}) => {
  const [certId, setCertId] = useState(defaultCertId);
  const [loading, setLoading] = useState(false);
  const [verifiedResult, setVerifiedResult] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) return null;

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!certId.trim()) return;

    setLoading(true);
    setErrorMessage("");
    setVerifiedResult(null);

    try {
      const data = await api.verifyCertificate(certId.trim());
      if (data.found && data.certificate) {
        setVerifiedResult(data.certificate);
      } else {
        setErrorMessage(
          `Certificate ID "${certId.trim()}" was not found in the official Maatu Registry. Check the ID and try again.`
        );
      }
    } catch {
      setErrorMessage("Could not connect to verification server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card verify-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="brand-mark-mini">
              <ShieldCheck size={18} color="#26845B" />
            </span>
            <h3>Public Certificate Verification</h3>
          </div>
          <button className="icon-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <p className="verify-modal-desc">
          Enter any Maatu Certificate ID to verify its authenticity, course syllabus completion, and issue date against our registry.
        </p>

        <form onSubmit={handleVerify} className="verify-form">
          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder="e.g. MAATU-KB-2026-89412"
              value={certId}
              onChange={(e) => setCertId(e.target.value)}
              required
            />
            <button type="submit" className="primary-button small" disabled={loading}>
              {loading ? "Verifying..." : "Verify"}
            </button>
          </div>
        </form>

        {errorMessage && (
          <div className="verify-error-banner">
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        {verifiedResult && (
          <div className="verified-cert-card">
            <div className="verified-status-row">
              <span className="verified-badge">
                <CheckCircle2 size={16} /> Official Verified Record
              </span>
              <span className="verified-id">{verifiedResult.id}</span>
            </div>

            <div className="verified-body">
              <div className="verified-field">
                <span className="field-lbl">CERTIFICATE TITLE</span>
                <h4>{verifiedResult.course_title}</h4>
                <div className="field-kn">{verifiedResult.course_title_kannada}</div>
              </div>

              <div className="verified-grid-2">
                <div className="verified-field">
                  <span className="field-lbl">RECIPIENT LEARNER</span>
                  <strong>{verifiedResult.learner_name}</strong>
                </div>
                <div className="verified-field">
                  <span className="field-lbl">DATE ISSUED</span>
                  <strong>{verifiedResult.issued_date}</strong>
                </div>
              </div>

              <div className="verified-field">
                <span className="field-lbl">ISSUING AUTHORITY</span>
                <span>{verifiedResult.issuer || "ಮಾತು — Voice of Kannada Academy"}</span>
              </div>

              {verifiedResult.criteria_met && (
                <div className="verified-criteria-list">
                  <span className="field-lbl">CRITERIA COMPLETED</span>
                  <ul>
                    {verifiedResult.criteria_met.map((item: string, idx: number) => (
                      <li key={idx}>✓ {item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="verify-demo-tips">
          <span>Try sample verified ID:</span>
          <button
            type="button"
            className="text-link-btn"
            onClick={() => setCertId("MAATU-KB-2026-89412")}
          >
            MAATU-KB-2026-89412
          </button>
        </div>
      </div>
    </div>
  );
};
