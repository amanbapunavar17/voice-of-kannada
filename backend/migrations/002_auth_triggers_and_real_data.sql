-- ====================================================================
-- MAATU (ಮಾತು) — Migration 002: Auth Triggers, Real Catalog & Helper RPCs
-- ====================================================================

-- 1. AUTOMATIC PROFILE CREATION TRIGGER ON auth.users SIGN-UP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        display_name,
        avatar_url,
        kannada_level,
        daily_goal_minutes,
        learning_motivation,
        preferred_situations,
        xp_balance,
        points_balance,
        current_streak,
        best_streak,
        is_public_leaderboard,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL),
        'Beginner',
        15,
        'Everyday conversations',
        ARRAY['daily', 'food', 'travel'],
        0,
        0,
        0,
        0,
        TRUE,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger cleanly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. SECURE CERTIFICATE ISSUANCE STORED PROCEDURE
CREATE OR REPLACE FUNCTION public.issue_certificate_secure(
    p_course_id TEXT,
    p_course_title TEXT,
    p_course_title_kannada TEXT,
    p_score_percent INT,
    p_criteria JSONB
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_learner_name TEXT;
    v_cert_id TEXT;
    v_cert_hash TEXT;
    v_existing_id TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to issue certificate.';
    END IF;

    -- Check if user already holds a certificate for this course
    SELECT id INTO v_existing_id
    FROM public.certificates
    WHERE user_id = v_user_id AND course_id = p_course_id AND is_revoked = FALSE;

    IF v_existing_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', TRUE,
            'certificate_id', v_existing_id,
            'message', 'Certificate already issued'
        );
    END IF;

    -- Fetch user display name
    SELECT display_name INTO v_learner_name
    FROM public.profiles
    WHERE id = v_user_id;

    IF v_learner_name IS NULL OR TRIM(v_learner_name) = '' THEN
        v_learner_name := 'ಕನ್ನಡ ಕಲಿ (Kannada Learner)';
    END IF;

    -- Generate verifiable ID and hash
    v_cert_id := 'MAATU-' || UPPER(SUBSTRING(p_course_id, 1, 3)) || '-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(FLOOR(RANDOM() * 90000 + 10000)::TEXT, 5, '0');
    v_cert_hash := MD5(v_cert_id || v_user_id::TEXT || NOW()::TEXT);

    INSERT INTO public.certificates (
        id,
        user_id,
        course_id,
        course_title,
        course_title_kannada,
        learner_name,
        issued_at,
        requirements_met,
        verification_hash,
        is_revoked
    ) VALUES (
        v_cert_id,
        v_user_id,
        p_course_id,
        p_course_title,
        p_course_title_kannada,
        v_learner_name,
        NOW(),
        p_criteria,
        v_cert_hash,
        FALSE
    );

    -- Award certificate milestone XP bonus
    INSERT INTO public.point_transactions (
        user_id, currency_type, amount, reason, reference_id, idempotency_key
    ) VALUES (
        v_user_id, 'XP', 100, 'Earned Certificate: ' || p_course_title, v_cert_id, 'cert_xp_' || v_cert_id
    ) ON CONFLICT (idempotency_key) DO NOTHING;

    INSERT INTO public.point_transactions (
        user_id, currency_type, amount, reason, reference_id, idempotency_key
    ) VALUES (
        v_user_id, 'MAATU_POINTS', 25, 'Earned Certificate: ' || p_course_title, v_cert_id, 'cert_pts_' || v_cert_id
    ) ON CONFLICT (idempotency_key) DO NOTHING;

    UPDATE public.profiles
    SET xp_balance = xp_balance + 100,
        points_balance = points_balance + 25,
        updated_at = NOW()
    WHERE id = v_user_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'certificate_id', v_cert_id,
        'learner_name', v_learner_name,
        'issued_date', TO_CHAR(NOW(), 'YYYY-MM-DD')
    );
END;
$$;

-- 3. SEED MERCHANDISE REWARDS CATALOG (GENUINE STORE ITEMS)
INSERT INTO public.rewards_catalog (id, title, title_kannada, description, category, points_required, image_key, badge_label, in_stock)
VALUES
    ('stickers-pack', 'Kannada Pride Die-Cut Stickers', 'ಕನ್ನಡ ಹೆಮ್ಮೆಯ ಸ್ಟಿಕ್ಕರ್‌ಗಳು', '5 premium matte vinyl stickers featuring iconic phrases like "ಸ್ವಲ್ಪ ಅಡ್ಜಸ್ಟ್ ಮಾಡಿ" and "ಕನ್ನಡವೇ ಸತ್ಯ".', 'stationery', 100, 'stickers', 'Popular', TRUE),
    ('wooden-bookmark', 'Handcrafted Wooden Bookmark', 'ಮರದ ಪುಸ್ತಕ ಗುರುತು', 'Carved Channapatna style wooden bookmark with Kannada typography and tassel.', 'stationery', 150, 'bookmark', 'Artisanal', TRUE),
    ('hardcover-notebook', 'Maatu Kannada Learning Journal', 'ಕನ್ನಡ ಕಲಿಯುವ ನೋಟ್‌ಬುಕ್', '160-page premium ruled notebook with daily Kannada phrase prompts and culture notes.', 'stationery', 300, 'notebook', 'Top Choice', TRUE),
    ('steel-bottle', 'Insulated Steel Flask (750ml)', 'ಸ್ಟೀಲ್ ನೀರಿನ ಬಾಟಲಿ', 'Matte green stainless steel bottle laser-engraved with "ನಮ್ಮ ಕರ್ನಾಟಕ" and Maatu emblem.', 'lifestyle', 600, 'bottle', 'Eco-Friendly', TRUE),
    ('quote-tshirt', '''ಸ್ವಲ್ಪ ಅಡ್ಜಸ್ಟ್ ಮಾಡಿ'' Cotton T-Shirt', 'ಕನ್ನಡ ಟೀ-ಶರ್ಟ್', '100% bio-washed combed cotton t-shirt in forest green with classic Bengaluru culture script.', 'apparel', 900, 'tshirt', 'Bestseller', TRUE),
    ('hoodie-heritage', 'Voice of Kannada Heavyweight Hoodie', 'ಪ್ರೀಮಿಯಂ ಹುಡ್ಡಿ', '350 GSM fleece hoodie with embroidered golden "ಮಾತು" crest on chest and Kannada typography.', 'apparel', 1500, 'hoodie', 'Exclusive', TRUE)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    title_kannada = EXCLUDED.title_kannada,
    description = EXCLUDED.description,
    points_required = EXCLUDED.points_required,
    in_stock = EXCLUDED.in_stock;
