-- Telegram User Mapping Table
-- This table maps Telegram users to internal system users

CREATE TABLE IF NOT EXISTS telegram_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id BIGINT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  telegram_username TEXT,
  telegram_first_name TEXT,
  telegram_last_name TEXT,
  email TEXT, -- For manual mapping if needed
  chat_id BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_telegram_users_telegram_id ON telegram_users(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_users_user_id ON telegram_users(user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_users_email ON telegram_users(email);

-- Row Level Security
ALTER TABLE telegram_users ENABLE ROW LEVEL SECURITY;

-- Users can only see their own mapping
CREATE POLICY "Users can view own telegram mapping" ON telegram_users
  FOR SELECT USING (auth.uid() = user_id);

-- Users can manage their own mapping
CREATE POLICY "Users can manage own telegram mapping" ON telegram_users
  FOR ALL USING (auth.uid() = user_id);

-- Function to setup telegram user mapping
CREATE OR REPLACE FUNCTION setup_telegram_user(
  p_telegram_user_id BIGINT,
  p_user_email TEXT,
  p_telegram_username TEXT DEFAULT NULL,
  p_telegram_first_name TEXT DEFAULT NULL,
  p_telegram_last_name TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_mapping_id UUID;
BEGIN
  -- Find user by email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_user_email;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', p_user_email;
  END IF;

  -- Check if mapping already exists
  SELECT id INTO v_mapping_id
  FROM telegram_users
  WHERE telegram_user_id = p_telegram_user_id;

  IF v_mapping_id IS NOT NULL THEN
    -- Update existing mapping
    UPDATE telegram_users SET
      user_id = v_user_id,
      telegram_username = p_telegram_username,
      telegram_first_name = p_telegram_first_name,
      telegram_last_name = p_telegram_last_name,
      email = p_user_email,
      updated_at = NOW()
    WHERE id = v_mapping_id
    RETURNING id INTO v_mapping_id;
  ELSE
    -- Create new mapping
    INSERT INTO telegram_users (
      telegram_user_id,
      user_id,
      telegram_username,
      telegram_first_name,
      telegram_last_name,
      email
    ) VALUES (
      p_telegram_user_id,
      v_user_id,
      p_telegram_username,
      p_telegram_first_name,
      p_telegram_last_name,
      p_user_email
    ) RETURNING id INTO v_mapping_id;
  END IF;

  RETURN v_mapping_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION setup_telegram_user(BIGINT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
