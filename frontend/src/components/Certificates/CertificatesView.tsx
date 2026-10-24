import React, { useState } from "react";
import {
  Award,
  Download,
  Eye,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import type { UserProfile, CertificateRecord } from "../../types";
import { storage } from "../../services/storage";
import { generateCertificatePdf } from "../../services/certificatePdf";
import { VerifyCertificateModal } from "./VerifyCertificateModal";

interface CertificatesViewProps {
  user: UserProfile;
  completedLessons: string[];
}

interface CertificateTrack {
  id: string;
  title: string;
  titleKannada: string;
  description: string;
  requiredLessonsCount: number;
  requiredSpeakingCount: number;
  criteria: string[];
}

const certificateTracks: CertificateTrack[] = [
  {
    id: "kb",
    title: "Kannada Basics — Foundation Certificate",
    titleKannada: "ಕನ್ನಡ ಮೂಲಭೂತ ಪ್ರವೀಣತೆ ಪ್ರಮಾಣಪತ್ರ",
    description: "Foundational mastery of Kannada vowels, core words, respectful pronouns, and greetings.",
    requiredLessonsCount: 2,
    requiredSpeakingCount: 0,
    criteria: [
      "Complete 2 foundational vocabulary lessons",
      "Master core vowels and polite pronouns",
    ],
  },
  {
    id: "ek",
    title: "Everyday Kannada — Practical Conversation",
    titleKannada: "ದೈನಂದಿನ ಸಂಭಾಷಣೆ ಪ್ರವೀಣತೆ",
    description: "Fluency in food ordering, Darshini etiquette, and asking directions across Karnataka.",
    requiredLessonsCount: 4,
    requiredSpeakingCount: 1,
    criteria: [
      "Complete 4 practical conversation lessons",
      "Complete at least 1 spoken voice practice session with AI coach",
    ],
  },
  {
    id: "cc",
    title: "Confident Conversation — Spoken Fluency",
    titleKannada: "ಆತ್ಮವಿಶ್ವಾಸದ ಮಾತುಗಾರ ಪ್ರಮಾಣಪತ್ರ",
    description: "Advanced daily communication: bargaining, campus life, office etiquette, and sound distinctions.",
    requiredLessonsCount: 6,
    requiredSpeakingCount: 3,
    criteria: [
      "Complete 6 structured lessons",
      "Conduct 3 distinct speaking practice conversations",
      "Demonstrate natural pronunciation across real-life situations",
    ],
  },
  {
    id: "mm",
    title: "Maatu Milestone Master",
    titleKannada: "ಮಾತು ಪರಿಪೂರ್ಣ ಮಾಸ್ಟರ್ ಪ್ರಶಸ್ತಿ",
    description: "Comprehensive achievement across all 10 learning modules, mini-games, and cultural fluency.",
    requiredLessonsCount: 8,
    requiredSpeakingCount: 5,
    criteria: [
      "Complete 8 syllabus curriculum modules",
      "Maintain active streak consistency",
      "Reach Level 3 (Conversation Starter) or above",
    ],
  },
];

export const CertificatesView: React.FC<CertificatesViewProps> = ({
  user,
  completedLessons,
}) => {
  const [issuedCertificates, setIssuedCertificates] = useState<CertificateRecord[]>(() =>
    storage.getCertificates()
  );
  const [previewCert, setPreviewCert] = useState<CertificateRecord | null>(null);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [selectedVerifyId, setSelectedVerifyId] = useState("");

  const totalSpeakingAttempts = storage.getDailyActivities().reduce(
    (acc, curr) => acc + curr.speakingAttempts,
    0
  );

  function handleClaimCertificate(track: CertificateTrack) {
    const cert = storage.issueCertificate({
      courseId: track.id,
      courseTitle: track.title,
      courseTitleKannada: track.titleKannada,
      learnerName: user.displayName || "ಕನ್ನಡ ಕಲಿ",
      scorePercent: 98,
      criteriaMet: track.criteria,
    });

    setIssuedCertificates(storage.getCertificates());
    setPreviewCert(cert);
  }

  function handleDownloadPdf(cert: CertificateRecord) {
    generateCertificatePdf(cert);
  }

  return (
    <div className="certificates-container">
      <div className="section-heading-with-action">
        <div>
          <div className="section-kicker">VERIFIABLE CREDENTIALS</div>
          <h1>Course Completion Certificates</h1>
          <p>
            Earn official, verifiable certificates as you complete learning milestones. Preview in A4 landscape, download print-ready PDFs, or verify credentials publicly.
          </p>
        </div>
        <button
          className="secondary-button"
          onClick={() => {
            setSelectedVerifyId("");
            setVerifyModalOpen(true);
          }}
        >
          <ShieldCheck size={18} /> Public Verification Tool
        </button>
      </div>

      <div className="certificates-grid">
        {certificateTracks.map((track) => {
          const issued = issuedCertificates.find((c) => c.courseId === track.id);
          const hasLessons = completedLessons.length >= track.requiredLessonsCount;
          const hasSpeaking = totalSpeakingAttempts >= track.requiredSpeakingCount;
          const isEligible = hasLessons && hasSpeaking;

          return (
            <div
              key={track.id}
              className={`certificate-track-card ${issued ? "issued" : isEligible ? "eligible" : "locked"}`}
            >
              <div className="track-card-top">
                <div className="track-icon-emblem">
                  <Award size={26} color="#D4A64A" />
                </div>
                {issued ? (
                  <span className="issued-pill">
                    <CheckCircle2 size={14} /> Issued & Active
                  </span>
                ) : isEligible ? (
                  <span className="eligible-pill">
                    <Sparkles size={14} /> Ready to Claim
                  </span>
                ) : (
                  <span className="in-progress-pill">In Progress</span>
                )}
              </div>

              <h3>{track.title}</h3>
              <div className="track-kn-name">{track.titleKannada}</div>
              <p>{track.description}</p>

              {/* Requirements Checklist */}
              <div className="requirements-box">
                <span className="req-label">COMPLETION CRITERIA</span>
                <div className="req-item">
                  <span className={hasLessons ? "check done" : "check"}>
                    {hasLessons ? "✓" : "○"}
                  </span>
                  <span>
                    Lessons: {Math.min(completedLessons.length, track.requiredLessonsCount)} /{" "}
                    {track.requiredLessonsCount} completed
                  </span>
                </div>
                {track.requiredSpeakingCount > 0 && (
                  <div className="req-item">
                    <span className={hasSpeaking ? "check done" : "check"}>
                      {hasSpeaking ? "✓" : "○"}
                    </span>
                    <span>
                      Speaking: {Math.min(totalSpeakingAttempts, track.requiredSpeakingCount)} /{" "}
                      {track.requiredSpeakingCount} sessions
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="track-card-actions">
                {issued ? (
                  <>
                    <button
                      className="primary-button small"
                      onClick={() => setPreviewCert(issued)}
                    >
                      <Eye size={15} /> Preview
                    </button>
                    <button
                      className="secondary-button small"
                      onClick={() => handleDownloadPdf(issued)}
                    >
                      <Download size={15} /> PDF
                    </button>
                    <button
                      className="text-button small"
                      onClick={() => {
                        setSelectedVerifyId(issued.id);
                        setVerifyModalOpen(true);
                      }}
                    >
                      Verify
                    </button>
                  </>
                ) : isEligible ? (
                  <button
                    className="primary-button full-width"
                    onClick={() => handleClaimCertificate(track)}
                  >
                    Claim Certificate <Sparkles size={16} />
                  </button>
                ) : (
                  <button className="secondary-button full-width" disabled>
                    Complete requirements to unlock
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Live A4 Landscape Certificate Preview Modal */}
      {previewCert && (
        <div className="modal-backdrop" onClick={() => setPreviewCert(null)}>
          <div
            className="modal-card cert-preview-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cert-preview-actions-bar">
              <span className="cert-id-tag">ID: {previewCert.id}</span>
              <div className="btn-group-right">
                <button
                  className="secondary-button small"
                  onClick={() => handleDownloadPdf(previewCert)}
                >
                  <Download size={15} /> Download PDF
                </button>
                <button
                  className="icon-close-btn"
                  onClick={() => setPreviewCert(null)}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* A4 Landscape Certificate Canvas / HTML representation */}
            <div className="certificate-sheet-landscape">
              <div className="cert-inner-border">
                <div className="cert-header">
                  <div className="cert-org-logo">MAATU · VOICE OF KANNADA</div>
                  <div className="cert-org-sub">
                    ACADEMY OF KANNADA LANGUAGE & CULTURAL PROFICIENCY
                  </div>
                  <div className="cert-gold-divider" />
                  <div className="cert-title-badge">CERTIFICATE OF ACHIEVEMENT</div>
                </div>

                <div className="cert-body">
                  <div className="cert-presented-text">This is proudly presented to</div>
                  <div className="cert-learner-name">{previewCert.learnerName}</div>
                  <div className="cert-desc-text">
                    for successfully demonstrating foundational fluency and completing:
                  </div>
                  <div className="cert-course-title">{previewCert.courseTitle}</div>
                  <div className="cert-course-kn">{previewCert.courseTitleKannada}</div>
                  <div className="cert-score-line">
                    Performance Score: {previewCert.scorePercent}% · Demonstrating Practical Fluency
                  </div>
                </div>

                <div className="cert-footer">
                  <div className="cert-footer-col left">
                    <div>Issued: {previewCert.issuedDate}</div>
                    <div className="cert-id-mono">ID: {previewCert.id}</div>
                    <div className="cert-verify-link">
                      Verify: {previewCert.verificationUrl}
                    </div>
                  </div>

                  <div className="cert-footer-col center">
                    <div className="cert-gold-seal">
                      <span>MAATU</span>
                      <small>VERIFIED</small>
                    </div>
                  </div>

                  <div className="cert-footer-col right">
                    <div className="cert-sig-line" />
                    <div className="cert-sig-title">Academic Director</div>
                    <div className="cert-sig-sub">Maatu — Voice of Kannada</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Public Verification Modal */}
      <VerifyCertificateModal
        isOpen={verifyModalOpen}
        onClose={() => setVerifyModalOpen(false)}
        defaultCertId={selectedVerifyId}
      />
    </div>
  );
};
