import React, { useState } from "react";
import {
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  Coins,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { curriculumCategories } from "../../data/curriculumData";
import type { Lesson } from "../../types";
import { LessonViewerModal } from "./LessonViewerModal";

interface LearnViewProps {
  completedLessons: string[];
  onLessonCompleted: () => void;
}

export const LearnView: React.FC<LearnViewProps> = ({
  completedLessons,
  onLessonCompleted,
}) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("basics");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeLessonModal, setActiveLessonModal] = useState<Lesson | null>(null);

  const selectedCategory =
    curriculumCategories.find((c) => c.id === selectedCategoryId) ||
    curriculumCategories[0];

  const filteredLessons = selectedCategory.lessons.filter(
    (les) =>
      `${les.title} ${les.titleKannada} ${les.description}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
  );

  return (
    <div className="learn-container">
      {/* Top Header */}
      <div className="section-heading-with-action">
        <div>
          <div className="section-kicker">STRUCTURED CURRICULUM</div>
          <h1>Learn Kannada Step by Step</h1>
          <p>
            Master practical vocabulary, greetings, dining, shopping, and everyday conversations with interactive exercises.
          </p>
        </div>
      </div>

      {/* Category Horizontal Filter Bar */}
      <div className="curriculum-category-tabs">
        {curriculumCategories.map((cat) => {
          const isActive = cat.id === selectedCategoryId;
          const completedInCat = cat.lessons.filter((l) =>
            completedLessons.includes(l.id)
          ).length;

          return (
            <button
              key={cat.id}
              className={`curriculum-tab-btn ${isActive ? "active" : ""}`}
              onClick={() => setSelectedCategoryId(cat.id)}
            >
              <div className="tab-btn-title">{cat.title}</div>
              <div className="tab-btn-kn">{cat.titleKannada}</div>
              <span className="tab-btn-count">
                {completedInCat}/{cat.lessons.length} done
              </span>
            </button>
          );
        })}
      </div>

      {/* Search Bar */}
      <div className="search-box">
        <Search size={18} />
        <input
          type="text"
          placeholder="Search phrases, lessons, or topics..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button className="search-clear-btn" onClick={() => setSearchQuery("")}>
            ×
          </button>
        )}
      </div>

      {/* Category Banner Card */}
      <div className="category-banner-card">
        <div>
          <span className="banner-kicker">SELECTED MODULE</span>
          <h2>{selectedCategory.title}</h2>
          <span className="banner-kn-title">{selectedCategory.titleKannada}</span>
          <p>{selectedCategory.description}</p>
        </div>
        <div className="category-stats-badge">
          <span>
            {
              selectedCategory.lessons.filter((l) =>
                completedLessons.includes(l.id)
              ).length
            }{" "}
            / {selectedCategory.lessons.length} Lessons Completed
          </span>
        </div>
      </div>

      {/* Lessons List Grid */}
      <div className="lessons-grid">
        {filteredLessons.map((lesson) => {
          const isDone = completedLessons.includes(lesson.id);

          return (
            <div
              key={lesson.id}
              className={`lesson-card ${isDone ? "completed" : ""}`}
              onClick={() => setActiveLessonModal(lesson)}
            >
              <div className="lesson-card-top">
                <div className="lesson-icon-circle">
                  <BookOpen size={20} color="#174B3A" />
                </div>
                {isDone ? (
                  <span className="lesson-completed-pill">
                    <CheckCircle2 size={14} color="#26845B" /> Completed
                  </span>
                ) : (
                  <span className="lesson-level-pill">{lesson.level}</span>
                )}
              </div>

              <h3>{lesson.title}</h3>
              <div className="lesson-kn-headline">{lesson.titleKannada}</div>
              <p>{lesson.description}</p>

              <div className="lesson-card-meta">
                <span>
                  <Clock size={13} /> {lesson.estimatedMinutes} min
                </span>
                <span>
                  <Sparkles size={13} /> +{lesson.xpReward} XP
                </span>
                <span>
                  <Coins size={13} /> +{lesson.pointsReward} Pts
                </span>
              </div>

              <div className="lesson-card-bottom-cta">
                <span>{isDone ? "Review Lesson" : "Start Lesson"}</span>
                <ArrowRight size={15} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Dialog for Active Lesson */}
      {activeLessonModal && (
        <LessonViewerModal
          lesson={activeLessonModal}
          onClose={() => setActiveLessonModal(null)}
          onCompleted={() => {
            onLessonCompleted();
          }}
        />
      )}
    </div>
  );
};
