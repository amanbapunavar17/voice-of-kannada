-- ====================================================================
-- MAATU (ಮಾತು) — VOICE OF KANNADA
-- Production Database Schema & Row Level Security (RLS) Migrations
-- Compatible with PostgreSQL & Supabase
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. USER PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL DEFAULT 'ಕನ್ನಡ ವಿದ್ಯಾರ್ಥಿ',
    avatar_url TEXT,
    kannada_level TEXT NOT NULL DEFAULT 'Beginner' CHECK (kannada_level IN ('Beginner', 'Elementary', 'Intermediate', 'Advanced')),
    daily_goal_minutes INT NOT NULL DEFAULT 15 CHECK (daily_goal_minutes BETWEEN 5 AND 120),
    learning_motivation TEXT DEFAULT 'Everyday conversations',
    preferred_situations TEXT[] DEFAULT ARRAY['daily', 'food', 'travel'],
    xp_balance INT NOT NULL DEFAULT 0 CHECK (xp_balance >= 0),
    points_balance INT NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
    current_streak INT NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
    best_streak INT NOT NULL DEFAULT 0 CHECK (best_streak >= 0),
    last_activity_date DATE,
    is_public_leaderboard BOOLEAN NOT NULL DEFAULT TRUE,
    role TEXT NOT NULL DEFAULT 'learner' CHECK (role IN ('learner', 'moderator', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. LEARNING MODULES & LESSONS
CREATE TABLE IF NOT EXISTS public.learning_categories (
    id TEXT PRIMARY KEY,
    title_english TEXT NOT NULL,
    title_kannada TEXT NOT NULL,
    description TEXT NOT NULL,
    icon_name TEXT NOT NULL,
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lessons (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL REFERENCES public.learning_categories(id) ON DELETE CASCADE,
    title_english TEXT NOT NULL,
    title_kannada TEXT NOT NULL,
    level TEXT NOT NULL DEFAULT 'Beginner',
    estimated_minutes INT NOT NULL DEFAULT 5,
    xp_reward INT NOT NULL DEFAULT 20,
    points_reward INT NOT NULL DEFAULT 5,
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lesson_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id TEXT NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    kannada_text TEXT NOT NULL,
    transliteration TEXT NOT NULL,
    english_meaning TEXT NOT NULL,
    example_kannada TEXT,
    example_english TEXT,
    item_type TEXT NOT NULL DEFAULT 'phrase' CHECK (item_type IN ('word', 'phrase', 'exercise')),
    exercise_type TEXT CHECK (exercise_type IN ('multiple_choice', 'matching', 'reorder', 'fill_blank', 'listen')),
    exercise_data JSONB,
    order_index INT NOT NULL DEFAULT 0
);

-- 4. USER PROGRESS TRACKING
CREATE TABLE IF NOT EXISTS public.user_lesson_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    lesson_id TEXT NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    score_percent INT DEFAULT 100,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT user_lesson_unique UNIQUE (user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS public.daily_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL,
    minutes_spent INT NOT NULL DEFAULT 0 CHECK (minutes_spent >= 0),
    lessons_completed INT NOT NULL DEFAULT 0 CHECK (lessons_completed >= 0),
    speaking_attempts INT NOT NULL DEFAULT 0 CHECK (speaking_attempts >= 0),
    words_practiced INT NOT NULL DEFAULT 0 CHECK (words_practiced >= 0),
    xp_earned INT NOT NULL DEFAULT 0 CHECK (xp_earned >= 0),
    points_earned INT NOT NULL DEFAULT 0 CHECK (points_earned >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT user_daily_activity_unique UNIQUE (user_id, activity_date)
);

-- 5. SPEAKING PRACTICE LOGS
CREATE TABLE IF NOT EXISTS public.practice_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    scenario_id TEXT NOT NULL,
    recognized_speech TEXT NOT NULL,
    ai_reply_kannada TEXT NOT NULL,
    ai_reply_english TEXT NOT NULL,
    xp_awarded INT NOT NULL DEFAULT 15,
    points_awarded INT NOT NULL DEFAULT 3,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. DUAL CURRENCY TRANSACTIONS (XP & POINTS)
CREATE TABLE IF NOT EXISTS public.point_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    currency_type TEXT NOT NULL CHECK (currency_type IN ('XP', 'MAATU_POINTS')),
    amount INT NOT NULL, -- Positive for rewards, negative for redemptions
    reason TEXT NOT NULL,
    reference_id TEXT, -- e.g. lesson:daily-1, challenge:2026-10-24, order:ord-123
    idempotency_key TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. DAILY CHALLENGES
CREATE TABLE IF NOT EXISTS public.challenges (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    challenge_type TEXT NOT NULL CHECK (challenge_type IN ('words', 'speaking', 'lesson', 'game', 'listening')),
    target_count INT NOT NULL DEFAULT 1,
    xp_reward INT NOT NULL DEFAULT 30,
    points_reward INT NOT NULL DEFAULT 10,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_challenge_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    challenge_id TEXT NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
    challenge_date DATE NOT NULL,
    current_count INT NOT NULL DEFAULT 0,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    is_claimed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    CONSTRAINT user_challenge_day_unique UNIQUE (user_id, challenge_id, challenge_date)
);

-- 8. ACHIEVEMENTS & BADGES
CREATE TABLE IF NOT EXISTS public.achievements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    kannada_title TEXT NOT NULL,
    icon_name TEXT NOT NULL,
    condition_type TEXT NOT NULL,
    threshold INT NOT NULL,
    xp_bonus INT NOT NULL DEFAULT 50,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    achievement_id TEXT NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT user_achievement_unique UNIQUE (user_id, achievement_id)
);

-- 9. CERTIFICATES & PUBLIC VERIFICATION
CREATE TABLE IF NOT EXISTS public.certificates (
    id TEXT PRIMARY KEY, -- e.g. MAATU-KB-2026-89412
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL,
    course_title TEXT NOT NULL,
    course_title_kannada TEXT NOT NULL,
    learner_name TEXT NOT NULL,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    requirements_met JSONB NOT NULL,
    verification_hash TEXT UNIQUE NOT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. MAATU GOODIES STORE & REDEMPTIONS
CREATE TABLE IF NOT EXISTS public.rewards_catalog (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    title_kannada TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('apparel', 'accessories', 'stationery', 'lifestyle')),
    points_required INT NOT NULL CHECK (points_required > 0),
    image_key TEXT NOT NULL,
    badge_label TEXT,
    in_stock BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reward_redemptions (
    id TEXT PRIMARY KEY, -- e.g. ORD-MAATU-2026-0042
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reward_id TEXT NOT NULL REFERENCES public.rewards_catalog(id),
    reward_title TEXT NOT NULL,
    points_spent INT NOT NULL CHECK (points_spent > 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'shipped', 'cancelled')),
    shipping_name TEXT NOT NULL,
    shipping_contact TEXT NOT NULL,
    shipping_city TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can view own profile or public leaderboard profiles
CREATE POLICY "Users view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id OR is_public_leaderboard = TRUE);

CREATE POLICY "Users update own profile fields" ON public.profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Lesson progress: Users read and update own progress
CREATE POLICY "Users manage own lesson progress" ON public.user_lesson_progress
    FOR ALL USING (auth.uid() = user_id);

-- Daily activity: Users view own activity
CREATE POLICY "Users view own daily activity" ON public.daily_activity
    FOR ALL USING (auth.uid() = user_id);

-- Practice sessions: Users view own practice sessions
CREATE POLICY "Users view own practice" ON public.practice_sessions
    FOR ALL USING (auth.uid() = user_id);

-- Point transactions: Read-only for users, writes via backend / functions
CREATE POLICY "Users view own transactions" ON public.point_transactions
    FOR SELECT USING (auth.uid() = user_id);

-- Challenges progress: Users read and update own
CREATE POLICY "Users manage challenge progress" ON public.user_challenge_progress
    FOR ALL USING (auth.uid() = user_id);

-- Certificates: Public can SELECT for verification by ID, users see own
CREATE POLICY "Public verify certificates" ON public.certificates
    FOR SELECT USING (is_revoked = FALSE);

-- Goodies Store: Anyone can browse catalog
ALTER TABLE public.rewards_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view rewards catalog" ON public.rewards_catalog
    FOR SELECT USING (in_stock = TRUE);

-- Redemptions: Users view and submit own redemptions
CREATE POLICY "Users view own redemptions" ON public.reward_redemptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own redemption" ON public.reward_redemptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ====================================================================
-- SECURE ATOMIC POINT REDEMPTION STORED PROCEDURE
-- ====================================================================
CREATE OR REPLACE FUNCTION public.redeem_reward_secure(
    p_reward_id TEXT,
    p_shipping_name TEXT,
    p_shipping_contact TEXT,
    p_shipping_city TEXT,
    p_order_id TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_cost INT;
    v_title TEXT;
    v_current_balance INT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- Fetch reward info
    SELECT points_required, title INTO v_cost, v_title
    FROM public.rewards_catalog
    WHERE id = p_reward_id AND in_stock = TRUE;

    IF v_cost IS NULL THEN
        RAISE EXCEPTION 'Reward item not found or out of stock.';
    END IF;

    -- Fetch and lock user balance
    SELECT points_balance INTO v_current_balance
    FROM public.profiles
    WHERE id = v_user_id FOR UPDATE;

    IF v_current_balance < v_cost THEN
        RAISE EXCEPTION 'Insufficient Maatu points balance. Needed: %, Available: %', v_cost, v_current_balance;
    END IF;

    -- Deduct points atomically
    UPDATE public.profiles
    SET points_balance = points_balance - v_cost,
        updated_at = NOW()
    WHERE id = v_user_id;

    -- Log transaction
    INSERT INTO public.point_transactions (
        user_id, currency_type, amount, reason, reference_id, idempotency_key
    ) VALUES (
        v_user_id, 'MAATU_POINTS', -v_cost, 'Redeemed ' || v_title, p_order_id, 'redemption:' || p_order_id
    );

    -- Create redemption record
    INSERT INTO public.reward_redemptions (
        id, user_id, reward_id, reward_title, points_spent, status,
        shipping_name, shipping_contact, shipping_city, notes
    ) VALUES (
        p_order_id, v_user_id, p_reward_id, v_title, v_cost, 'pending',
        p_shipping_name, p_shipping_contact, p_shipping_city, 'Pilot order placed'
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'order_id', p_order_id,
        'points_spent', v_cost,
        'remaining_balance', v_current_balance - v_cost
    );
END;
$$;
