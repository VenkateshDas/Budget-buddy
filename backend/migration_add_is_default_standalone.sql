-- Migration: Add is_default column and seed default categories
-- This is a standalone migration that includes all necessary functions

-- Step 1: Add is_default column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'custom_categories'
        AND column_name = 'is_default'
    ) THEN
        ALTER TABLE custom_categories ADD COLUMN is_default BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Step 2: Create or replace the seed function
CREATE OR REPLACE FUNCTION public.seed_default_categories(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO custom_categories (user_id, name, icon, color, is_default, is_active, sort_order)
    VALUES
        (p_user_id, 'Groceries', '🛒', '#10b981', TRUE, TRUE, 1),
        (p_user_id, 'Dining', '🍽️', '#f59e0b', TRUE, TRUE, 2),
        (p_user_id, 'Transport', '🚗', '#3b82f6', TRUE, TRUE, 3),
        (p_user_id, 'Utilities', '💡', '#8b5cf6', TRUE, TRUE, 4),
        (p_user_id, 'Entertainment', '🎬', '#ec4899', TRUE, TRUE, 5),
        (p_user_id, 'Shopping', '🛍️', '#f97316', TRUE, TRUE, 6),
        (p_user_id, 'Health', '💊', '#ef4444', TRUE, TRUE, 7),
        (p_user_id, 'Other', '📦', '#6b7280', TRUE, TRUE, 8),
        (p_user_id, 'Produce', '🥬', '#22c55e', TRUE, TRUE, 9),
        (p_user_id, 'Bakery', '🍞', '#fbbf24', TRUE, TRUE, 10),
        (p_user_id, 'Meat', '🥩', '#dc2626', TRUE, TRUE, 11)
    ON CONFLICT (user_id, name) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Update existing categories to mark them as default if they match default names
UPDATE custom_categories
SET is_default = TRUE
WHERE name IN ('Groceries', 'Dining', 'Transport', 'Utilities', 'Entertainment', 'Shopping', 'Health', 'Other', 'Produce', 'Bakery', 'Meat')
AND is_default = FALSE;

-- Step 4: Seed default categories for all existing users
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT id FROM public.users LOOP
        PERFORM seed_default_categories(user_record.id);
    END LOOP;
END $$;

-- Step 5: Update the handle_new_user function to include seeding
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create user profile
    INSERT INTO public.users (id, email, display_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
    );

    -- Seed default categories
    PERFORM seed_default_categories(NEW.id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verification: Show categories per user
SELECT
    user_id,
    name,
    is_default,
    is_active,
    COUNT(*) OVER (PARTITION BY user_id) as total_categories
FROM custom_categories
ORDER BY user_id, is_default DESC, sort_order;
