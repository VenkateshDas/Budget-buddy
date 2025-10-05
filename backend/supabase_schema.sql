-- Budget Buddy - Supabase Database Schema
-- This schema supports multi-user authentication, custom categories, and personalized AI extraction

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (uses Supabase Auth)
-- Note: auth.users is managed by Supabase Auth
-- This table stores additional user profile data
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User spreadsheets (multi-sheet support)
CREATE TABLE user_spreadsheets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    google_sheet_id VARCHAR(255) NOT NULL,
    google_sheet_name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, google_sheet_id)
);

-- Custom categories (user-defined)
CREATE TABLE custom_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(10) DEFAULT '📦',
    color VARCHAR(7) DEFAULT '#6366f1',
    is_default BOOLEAN DEFAULT FALSE, -- true for system defaults, false for user-created
    is_active BOOLEAN DEFAULT TRUE, -- user can toggle on/off
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- Extraction rules (AI personalization)
CREATE TABLE extraction_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    rule_type VARCHAR(50) NOT NULL, -- 'merchant', 'item_keyword', 'price_range'
    pattern VARCHAR(255) NOT NULL,
    target_category_id UUID REFERENCES custom_categories(id) ON DELETE CASCADE,
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Budget templates (reusable templates)
CREATE TABLE budget_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES custom_categories(id) ON DELETE SET NULL,
    budget_limit DECIMAL(10, 2) NOT NULL,
    period VARCHAR(50) NOT NULL, -- 'monthly', 'weekly', 'yearly'
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User preferences
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    default_currency VARCHAR(3) DEFAULT 'EUR',
    date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
    theme VARCHAR(20) DEFAULT 'light',
    auto_categorize BOOLEAN DEFAULT TRUE,
    duplicate_threshold INTEGER DEFAULT 70,
    preferences JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Extraction feedback (AI learning)
CREATE TABLE extraction_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    receipt_id VARCHAR(255),
    original_category VARCHAR(100),
    corrected_category VARCHAR(100),
    item_name VARCHAR(255),
    merchant_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_spreadsheets_user_id ON user_spreadsheets(user_id);
CREATE INDEX idx_spreadsheets_active ON user_spreadsheets(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_categories_user_id ON custom_categories(user_id);
CREATE INDEX idx_extraction_rules_user_id ON extraction_rules(user_id);
CREATE INDEX idx_extraction_rules_priority ON extraction_rules(user_id, priority);
CREATE INDEX idx_budget_templates_user_id ON budget_templates(user_id);
CREATE INDEX idx_extraction_feedback_user_id ON extraction_feedback(user_id);

-- Row Level Security (RLS) Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_spreadsheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE extraction_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE extraction_feedback ENABLE ROW LEVEL SECURITY;

-- Users can only read their own data
CREATE POLICY users_select_policy ON public.users
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY users_update_policy ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Users can only access their own spreadsheets
CREATE POLICY spreadsheets_all_policy ON user_spreadsheets
    FOR ALL USING (auth.uid() = user_id);

-- Users can only access their own categories
CREATE POLICY categories_all_policy ON custom_categories
    FOR ALL USING (auth.uid() = user_id);

-- Users can only access their own extraction rules
CREATE POLICY rules_all_policy ON extraction_rules
    FOR ALL USING (auth.uid() = user_id);

-- Users can read public templates or their own templates
CREATE POLICY templates_select_policy ON budget_templates
    FOR SELECT USING (is_public = TRUE OR auth.uid() = user_id);

CREATE POLICY templates_modify_policy ON budget_templates
    FOR ALL USING (auth.uid() = user_id);

-- Users can only access their own preferences
CREATE POLICY preferences_all_policy ON user_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Users can only access their own feedback
CREATE POLICY feedback_all_policy ON extraction_feedback
    FOR ALL USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_spreadsheets_updated_at BEFORE UPDATE ON user_spreadsheets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON custom_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rules_updated_at BEFORE UPDATE ON extraction_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON budget_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to seed default categories for a user
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

-- Function to handle new user creation
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

-- Trigger to automatically create user profile on sign up
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
