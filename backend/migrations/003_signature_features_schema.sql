-- ====================================================================
-- MAATU (ಮಾತು) — Migration 003: Signature Features & Intelligence Schema
-- Production Database Schema & Row Level Security (RLS) Migrations
-- Covers: Conversations, Pronunciation, Missions, Skills, Mistakes,
--         Camera Vocabulary, Saved Phrases, and Fluency Reports.
-- ====================================================================

-- 1. CONVERSATIONS & CHAT HISTORY
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    session_title TEXT NOT NULL DEFAULT 'Kannada Conversation',
    situation_id TEXT NOT NULL DEFAULT 'daily',
    learning_mode TEXT NOT NULL DEFAULT 'beginner' CHECK (learning_mode IN ('beginner', 'intermediate', 'challenge')),
    summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.conversation_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_role TEXT NOT NULL CHECK (sender_role IN ('learner', 'companion', 'system')),
    content_raw TEXT NOT NULL,
    kannada_script TEXT,
    transliteration TEXT,
    english_translation TEXT,
    feedback JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. PRONUNCIATION TRAINING & ATTEMPTS
CREATE TABLE IF NOT EXISTS public.pronunciation_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_kannada TEXT NOT NULL,
    target_transliteration TEXT NOT NULL,
    target_english TEXT NOT NULL,
    recognized_transcript TEXT NOT NULL,
    assessment_method TEXT NOT NULL DEFAULT 'transcription_alignment' CHECK (assessment_method IN ('transcription_alignment', 'phonetic_scoring')),
    accuracy_percent INT NOT NULL CHECK (accuracy_percent BETWEEN 0 AND 100),
    recognized_differences JSONB,
    feedback_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. REAL-WORLD ROLEPLAY MISSIONS
CREATE TABLE IF NOT EXISTS public.mission_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    scenario_id TEXT NOT NULL,
    scenario_title TEXT NOT NULL,
    character_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    turns_count INT NOT NULL DEFAULT 0,
    objective_achieved BOOLEAN NOT NULL DEFAULT FALSE,
    evaluation_score INT CHECK (evaluation_score BETWEEN 0 AND 100),
    feedback_summary TEXT,
    xp_awarded INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.mission_evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mission_attempt_id UUID NOT NULL REFERENCES public.mission_attempts(id) ON DELETE CASCADE,
    criterion_name TEXT NOT NULL,
    is_satisfied BOOLEAN NOT NULL DEFAULT FALSE,
    evidence TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. LEARNER SKILLS & INTELLIGENCE
CREATE TABLE IF NOT EXISTS public.learner_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    skill_category TEXT NOT NULL CHECK (skill_category IN ('vocabulary', 'grammar', 'speaking', 'listening', 'questions', 'sentence_structure')),
    skill_score INT NOT NULL DEFAULT 50 CHECK (skill_score BETWEEN 0 AND 100),
    total_evaluations INT NOT NULL DEFAULT 0,
    successful_evaluations INT NOT NULL DEFAULT 0,
    last_evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT user_skill_unique UNIQUE (user_id, skill_category)
);

-- 5. PERSONAL MISTAKE LIBRARY
CREATE TABLE IF NOT EXISTS public.mistake_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category TEXT NOT NULL DEFAULT 'grammar' CHECK (category IN ('grammar', 'vocabulary', 'pronunciation', 'word_order', 'politeness')),
    original_expression TEXT NOT NULL,
    suggested_correction TEXT NOT NULL,
    explanation TEXT NOT NULL,
    occurrences_count INT NOT NULL DEFAULT 1,
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    last_observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. CAMERA VOCABULARY
CREATE TABLE IF NOT EXISTS public.camera_vocabulary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    detected_english TEXT NOT NULL,
    kannada_word TEXT NOT NULL,
    transliteration TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'everyday_objects',
    example_sentence_kannada TEXT,
    example_sentence_english TEXT,
    is_saved_to_phrasebook BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. PERSONAL PHRASEBOOK
CREATE TABLE IF NOT EXISTS public.saved_phrases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    kannada_text TEXT NOT NULL,
    transliteration TEXT NOT NULL,
    english_meaning TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    formality_level TEXT DEFAULT 'polite',
    source TEXT NOT NULL DEFAULT 'manual', -- manual, camera, conversation, mission
    learning_status TEXT NOT NULL DEFAULT 'learning' CHECK (learning_status IN ('learning', 'mastered')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT user_kannada_unique UNIQUE (user_id, kannada_text)
);

-- 8. REVIEW SCHEDULE (SPACED REPETITION)
CREATE TABLE IF NOT EXISTS public.review_schedule (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN ('phrase', 'mistake', 'word')),
    item_id TEXT NOT NULL,
    next_review_date DATE NOT NULL,
    interval_days INT NOT NULL DEFAULT 1,
    repetition_count INT NOT NULL DEFAULT 0,
    last_reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. FLUENCY SCORECARD REPORTS
CREATE TABLE IF NOT EXISTS public.fluency_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    overall_fluency_score INT NOT NULL CHECK (overall_fluency_score BETWEEN 0 AND 100),
    vocabulary_score INT NOT NULL CHECK (vocabulary_score BETWEEN 0 AND 100),
    grammar_score INT NOT NULL CHECK (grammar_score BETWEEN 0 AND 100),
    speaking_score INT NOT NULL CHECK (speaking_score BETWEEN 0 AND 100),
    listening_score INT NOT NULL CHECK (listening_score BETWEEN 0 AND 100),
    objective_completion_rate INT NOT NULL CHECK (objective_completion_rate BETWEEN 0 AND 100),
    strongest_skill TEXT NOT NULL,
    skill_needing_improvement TEXT NOT NULL,
    recommended_next_action TEXT NOT NULL,
    metrics_snapshot JSONB NOT NULL,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR NEW TABLES
-- ====================================================================

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pronunciation_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learner_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mistake_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camera_vocabulary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_phrases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fluency_reports ENABLE ROW LEVEL SECURITY;

-- 1. Conversations & Messages
CREATE POLICY "Users access own conversations" ON public.conversations
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users access own conversation messages" ON public.conversation_messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = conversation_messages.conversation_id AND c.user_id = auth.uid()
        )
    );

-- 2. Pronunciation
CREATE POLICY "Users manage own pronunciation attempts" ON public.pronunciation_attempts
    FOR ALL USING (auth.uid() = user_id);

-- 3. Missions
CREATE POLICY "Users manage own mission attempts" ON public.mission_attempts
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own mission evaluations" ON public.mission_evaluations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.mission_attempts m
            WHERE m.id = mission_evaluations.mission_attempt_id AND m.user_id = auth.uid()
        )
    );

-- 4. Learner Skills
CREATE POLICY "Users view and manage own skills" ON public.learner_skills
    FOR ALL USING (auth.uid() = user_id);

-- 5. Mistake History
CREATE POLICY "Users view and manage own mistakes" ON public.mistake_history
    FOR ALL USING (auth.uid() = user_id);

-- 6. Camera Vocabulary
CREATE POLICY "Users manage own camera vocabulary" ON public.camera_vocabulary
    FOR ALL USING (auth.uid() = user_id);

-- 7. Saved Phrases
CREATE POLICY "Users manage own saved phrases" ON public.saved_phrases
    FOR ALL USING (auth.uid() = user_id);

-- 8. Review Schedule
CREATE POLICY "Users manage own review schedule" ON public.review_schedule
    FOR ALL USING (auth.uid() = user_id);

-- 9. Fluency Reports
CREATE POLICY "Users view own fluency reports" ON public.fluency_reports
    FOR ALL USING (auth.uid() = user_id);

