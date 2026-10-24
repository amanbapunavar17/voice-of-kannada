import React, { useState } from "react";
import { X, ShoppingBag, CheckCircle2, AlertCircle, Info } from "lucide-react";
import confetti from "canvas-confetti";
import type { RewardProduct, UserProfile } from "../../types";
import { storage } from "../../services/storage";

interface RedemptionModalProps {
  reward: RewardProduct;
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onRedeemed: () => void;
}

export const RedemptionModal: React.FC<RedemptionModalProps> = ({
  reward,
  user,
  isOpen,
  onClose,
  onRedeemed,
}) => {
  const [shippingName, setShippingName] = useState(user.displayName || "");
  const [shippingContact, setShippingContact] = useState("");
  const [shippingCity, setShippingCity] = useState("Bengaluru");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [orderResult, setOrderResult] = useState<{ orderId: string } | null>(null);

  if (!isOpen) return null;

  const hasEnoughPoints = user.points >= reward.pointsRequired;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!shippingName.trim()) {
      setError("Please enter your delivery name.");
      return;
    }
    if (!shippingContact.trim() || shippingContact.length < 8) {
      setError("Please enter a valid phone number or email for confirmation.");
      return;
    }

    const result = storage.redeemReward({
      rewardId: reward.id,
      rewardTitle: reward.title,
      pointsRequired: reward.pointsRequired,
      shippingName: shippingName.trim(),
      shippingContact: shippingContact.trim(),
      shippingCity: shippingCity.trim(),
      notes: notes.trim(),
    });

    if (result.success && result.orderId) {
      setOrderResult({ orderId: result.orderId });
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      onRedeemed();
    } else {
      setError(result.error || "Redemption could not be completed.");
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card redemption-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="brand-mark-mini">
              <ShoppingBag size={18} color="#D4A64A" />
            </span>
            <h3>
              {orderResult ? "Redemption Request Received!" : `Redeem: ${reward.title}`}
            </h3>
          </div>
          <button className="icon-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {!orderResult ? (
          <form onSubmit={handleSubmit} className="redemption-form">
            {/* Item Summary */}
            <div className="item-summary-card">
              <div className="item-summary-info">
                <h4>{reward.title}</h4>
                <div className="item-kn">{reward.titleKannada}</div>
                <p>{reward.description}</p>
              </div>
              <div className="item-summary-cost">
                <span className="cost-label">POINTS COST</span>
                <div className="cost-val">{reward.pointsRequired} pts</div>
              </div>
            </div>

            {/* Balances Check */}
            <div className="balance-check-bar">
              <span>Your Current Balance: <strong>{user.points} points</strong></span>
              <span>Balance After: <strong>{Math.max(0, user.points - reward.pointsRequired)} points</strong></span>
            </div>

            {!hasEnoughPoints && (
              <div className="form-alert error">
                <AlertCircle size={16} />
                <span>
                  You need {reward.pointsRequired - user.points} more Maatu Points to redeem this item. Keep practicing to earn more points!
                </span>
              </div>
            )}

            {/* Pilot Mode Notice Requirement */}
            <div className="pilot-mode-notice">
              <Info size={18} color="#174B3A" />
              <div>
                <strong>Pilot Mode Notice:</strong>
                <p>
                  Reward redemption requests are currently in pilot mode. Availability and fulfillment will be confirmed by the Maatu team.
                </p>
              </div>
            </div>

            {/* Shipping Form Fields */}
            <div className="form-group">
              <label>Recipient Name</label>
              <input
                type="text"
                placeholder="Full name for delivery parcel"
                value={shippingName}
                onChange={(e) => setShippingName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Contact Phone or Email</label>
              <input
                type="text"
                placeholder="Where should we confirm your order?"
                value={shippingContact}
                onChange={(e) => setShippingContact(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>City / Location in Karnataka</label>
              <input
                type="text"
                placeholder="e.g. Bengaluru, Mysuru, Hubballi, Mangaluru"
                value={shippingCity}
                onChange={(e) => setShippingCity(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Special Notes (Size preference / Landmark)</label>
              <input
                type="text"
                placeholder="e.g. Size M, near Indiranagar Metro"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {error && <div className="form-alert error">{error}</div>}

            <button
              type="submit"
              className="primary-button full-width"
              disabled={!hasEnoughPoints}
            >
              Confirm & Deduct {reward.pointsRequired} Points
            </button>
          </form>
        ) : (
          <div className="order-success-view">
            <div className="success-icon-circle">
              <CheckCircle2 size={48} color="#26845B" />
            </div>
            <h3>Redemption Placed Successfully!</h3>
            <div className="order-id-box">
              <span>ORDER REFERENCE ID</span>
              <strong>{orderResult.orderId}</strong>
            </div>
            <p>
              We have received your pilot redemption request for{" "}
              <strong>"{reward.title}"</strong>. Our team will verify points and confirm delivery details.
            </p>
            <div className="pilot-mode-notice">
              <Info size={16} />
              <span>
                Pilot Mode: No payment is ever collected. Deducted points are logged in your transaction history.
              </span>
            </div>
            <button className="primary-button full-width" onClick={onClose}>
              Done & Return to Store
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
