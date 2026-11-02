import React, { useState, useEffect } from "react";
import {
  Compass,
  Volume2,
  MapPin,
  Info,
  Layers,
} from "lucide-react";
import { api } from "../../services/api";
import { speechService } from "../../services/speech";
import type { RegionalDialect, CrossRegionalComparison } from "../../types";

export const RegionalExplorerView: React.FC = () => {
  const [dialects, setDialects] = useState<RegionalDialect[]>([]);
  const [comparisons, setComparisons] = useState<CrossRegionalComparison[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string>("bengaluru");
  const [activeTab, setActiveTab] = useState<"dialects" | "comparisons">("dialects");

  useEffect(() => {
    Promise.all([api.getRegionalDialects(), api.getRegionalComparisons()])
      .then(([dList, cList]) => {
        setDialects(dList);
        setComparisons(cList);
        if (dList.length > 0) setSelectedRegionId(dList[0].region_id);
      })
      .catch((e) => console.warn("Failed to load regional data:", e));

    return () => speechService.stopSpeaking();
  }, []);

  const selectedDialect = dialects.find((d) => d.region_id === selectedRegionId) || dialects[0];

  return (
    <div className="regional-container">
      {/* Header */}
      <div className="practice-header">
        <div>
          <div className="section-pill">
            <Compass size={14} /> FEATURE 06 · CULTURAL LINGUISTICS
          </div>
          <h1>Regional Kannada Explorer</h1>
          <p className="page-lead">
            Explore authentic local flavors from Bengaluru, Mysuru, Hubballi-Dharwad, and the Karavali coast. Discover how Karnataka communicates across regions.
          </p>
        </div>

        {/* View Switcher */}
        <div className="filter-pill-group">
          <button
            className={`filter-pill ${activeTab === "dialects" ? "active" : ""}`}
            onClick={() => setActiveTab("dialects")}
          >
            <MapPin size={16} /> Regional Varieties
          </button>
          <button
            className={`filter-pill ${activeTab === "comparisons" ? "active" : ""}`}
            onClick={() => setActiveTab("comparisons")}
          >
            <Layers size={16} /> Cross-Region Comparison
          </button>
        </div>
      </div>

      {activeTab === "dialects" && selectedDialect && (
        <div className="regional-grid">
          {/* Region Tabs Sidebar */}
          <div className="region-selector-panel">
            <div className="panel-title-row">
              <h3>Select Region</h3>
              <span className="badge-tag">Verified</span>
            </div>

            <div className="region-tabs-list">
              {dialects.map((d) => (
                <button
                  key={d.region_id}
                  className={`region-tab-btn ${d.region_id === selectedRegionId ? "active" : ""}`}
                  onClick={() => setSelectedRegionId(d.region_id)}
                >
                  <div className="tab-top">
                    <strong>{d.name}</strong>
                  </div>
                  <div className="tab-kannada">{d.name_kannada}</div>
                  <span className="tab-tagline">{d.tagline}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Region Expressions Showcase */}
          <div className="region-showcase-panel">
            <div className="region-banner-card">
              <div className="banner-top">
                <h2>{selectedDialect.name}</h2>
                <div className="kannada-headline">{selectedDialect.name_kannada}</div>
              </div>
              <p className="cultural-note">{selectedDialect.cultural_note}</p>
            </div>

            <div className="expressions-section">
              <div className="panel-title-row">
                <h3>Characteristic Everyday Expressions</h3>
                <span className="badge-tag">{selectedDialect.expressions.length} Phrases</span>
              </div>

              <div className="expressions-grid">
                {selectedDialect.expressions.map((exp, idx) => (
                  <div key={idx} className="expression-card">
                    <div className="exp-top-row">
                      <span className="formality-badge">{exp.formality}</span>
                      <span className="intention-tag">{exp.intention}</span>
                    </div>

                    <div className="exp-kannada-large">{exp.kannada}</div>
                    <div className="exp-translit">{exp.transliteration}</div>
                    <div className="exp-meaning">"{exp.meaning}"</div>

                    <div className="exp-context-box">
                      <Info size={14} color="#174B3A" />
                      <span>{exp.context}</span>
                    </div>

                    <div className="exp-audio-row">
                      <button
                        className="primary-button-small"
                        onClick={() => speechService.speakKannada(exp.kannada, undefined, 0.85)}
                      >
                        <Volume2 size={16} /> Listen to Pronunciation
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cross-Regional Comparison Matrix */}
      {activeTab === "comparisons" && (
        <div className="comparisons-container">
          <div className="comparison-intro-box">
            <h3>How One Intention is Spoken Across Karnataka</h3>
            <p>
              Different regions express the same human feeling through rich local cadence and vocabulary. None is "wrong" — all represent authentic living Kannada.
            </p>
          </div>

          <div className="comparisons-list">
            {comparisons.map((item, idx) => (
              <div key={idx} className="comparison-card">
                <div className="comparison-header">
                  <span className="intention-pill">Intention</span>
                  <h3>"{item.intention}"</h3>
                </div>

                <div className="variations-grid">
                  {item.variations.map((v, vIdx) => (
                    <div key={vIdx} className="variation-item">
                      <div className="var-region-tag">{v.region}</div>
                      <div className="var-kannada">{v.kannada}</div>
                      <div className="var-translit">{v.transliteration}</div>
                      <p className="var-notes">{v.notes}</p>
                      <button
                        className="audio-listen-icon-btn"
                        onClick={() => speechService.speakKannada(v.kannada, undefined, 0.85)}
                        title="Listen"
                      >
                        <Volume2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
