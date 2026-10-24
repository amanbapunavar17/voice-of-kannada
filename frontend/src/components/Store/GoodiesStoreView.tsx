import React, { useState } from "react";
import {
  ShoppingBag,
  Coins,
  Sparkles,
  Info,
  Clock,
  Package,
} from "lucide-react";
import type { RewardProduct, UserProfile, RewardRedemption } from "../../types";
import { goodiesCatalog } from "../../data/rewardsData";
import { storage } from "../../services/storage";
import { RedemptionModal } from "./RedemptionModal";

interface GoodiesStoreViewProps {
  user: UserProfile;
}

export const GoodiesStoreView: React.FC<GoodiesStoreViewProps> = ({ user }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeModalReward, setActiveModalReward] = useState<RewardProduct | null>(null);
  const [viewTab, setViewTab] = useState<"catalog" | "orders">("catalog");
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>(() =>
    storage.getRedemptions()
  );

  const filteredProducts =
    selectedCategory === "all"
      ? goodiesCatalog
      : goodiesCatalog.filter((p) => p.category === selectedCategory);

  function handleRedeemed() {
    setRedemptions(storage.getRedemptions());
  }

  return (
    <div className="store-container">
      {/* Top Header */}
      <div className="section-heading-with-action">
        <div>
          <div className="section-kicker">CULTURAL MERCHANDISE</div>
          <h1>Maatu Goodies Store</h1>
          <p>
            Earn through every word! Redeem your points for authentic Karnataka quote t-shirts, handcrafted wooden bookmarks, steel flasks, and learning notebooks.
          </p>
        </div>
        <div className="store-balance-badge">
          <Coins size={20} color="#D4A64A" />
          <div>
            <span className="balance-badge-lbl">YOUR MAATU POINTS</span>
            <div className="balance-badge-val">{user.points} Points</div>
          </div>
        </div>
      </div>

      {/* Pilot Mode Global Warning Banner */}
      <div className="store-pilot-banner">
        <Info size={20} color="#174B3A" />
        <div>
          <strong>Pilot Fulfillment Mode:</strong>
          <span>
            {" "}Reward redemptions are currently in community pilot mode. Points are deducted atomically from your account, and order dispatch is managed directly by the Maatu platform team.
          </span>
        </div>
      </div>

      {/* Tabs: Catalog vs My Orders */}
      <div className="store-tab-controls">
        <div className="tab-pills-row">
          <button
            className={`store-tab-btn ${viewTab === "catalog" ? "active" : ""}`}
            onClick={() => setViewTab("catalog")}
          >
            <ShoppingBag size={16} /> Catalog ({goodiesCatalog.length})
          </button>
          <button
            className={`store-tab-btn ${viewTab === "orders" ? "active" : ""}`}
            onClick={() => setViewTab("orders")}
          >
            <Package size={16} /> My Orders ({redemptions.length})
          </button>
        </div>

        {viewTab === "catalog" && (
          <div className="category-chips-row">
            {["all", "apparel", "stationery", "lifestyle", "accessories"].map((cat) => (
              <button
                key={cat}
                className={`cat-chip-btn ${selectedCategory === cat ? "active" : ""}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      {viewTab === "catalog" ? (
        /* PRODUCTS GRID */
        <div className="products-catalog-grid">
          {filteredProducts.map((product) => {
            const hasEnough = user.points >= product.pointsRequired;
            const pointsRemaining = Math.max(0, product.pointsRequired - user.points);

            return (
              <div key={product.id} className="product-card">
                <div className="product-card-top">
                  {product.badge && <span className="product-badge">{product.badge}</span>}
                  <span className="product-points-tag">
                    <Coins size={14} /> {product.pointsRequired} pts
                  </span>
                </div>

                <div className={`product-visual-box ${product.category}`}>
                  <span className="visual-calligraphy">{product.titleKannada}</span>
                </div>

                <div className="product-card-body">
                  <div className="product-kn-title">{product.titleKannada}</div>
                  <h3>{product.title}</h3>
                  <p>{product.description}</p>

                  <ul className="product-details-bullets">
                    {product.details.slice(0, 2).map((det, idx) => (
                      <li key={idx}>• {det}</li>
                    ))}
                  </ul>

                  <div className="product-card-footer">
                    {hasEnough ? (
                      <button
                        className="primary-button full-width"
                        onClick={() => setActiveModalReward(product)}
                      >
                        Redeem Now <Sparkles size={15} />
                      </button>
                    ) : (
                      <button
                        className="secondary-button full-width"
                        onClick={() => setActiveModalReward(product)}
                      >
                        {pointsRemaining} more points needed
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* MY ORDERS HISTORY */
        <div className="orders-history-panel">
          {redemptions.length === 0 ? (
            <div className="empty-state">
              You haven't placed any reward redemptions yet. Explore the catalog and redeem with your earned Maatu Points!
            </div>
          ) : (
            <div className="orders-table-wrapper">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Order Reference</th>
                    <th>Item</th>
                    <th>Points Spent</th>
                    <th>Delivery City</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {redemptions.map((order) => (
                    <tr key={order.id}>
                      <td className="mono-text">{order.id}</td>
                      <td>
                        <strong>{order.rewardTitle}</strong>
                      </td>
                      <td>{order.pointsSpent} pts</td>
                      <td>{order.shippingCity}</td>
                      <td>
                        <span className={`order-status-pill ${order.status}`}>
                          <Clock size={12} /> {order.status}
                        </span>
                      </td>
                      <td>{new Date(order.redeemedAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Redemption Checkout Modal */}
      {activeModalReward && (
        <RedemptionModal
          reward={activeModalReward}
          user={user}
          isOpen={true}
          onClose={() => setActiveModalReward(null)}
          onRedeemed={handleRedeemed}
        />
      )}
    </div>
  );
};
