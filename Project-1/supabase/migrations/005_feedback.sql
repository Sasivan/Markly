-- 005_feedback.sql: User Feedback and Admin Thread Replies
-- Admin account: sasivan177@gmail.com

CREATE TABLE IF NOT EXISTS feedbacks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_email TEXT,
  user_name TEXT,
  user_avatar TEXT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'feedback',
  status TEXT NOT NULL DEFAULT 'received',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS feedback_replies (
  id TEXT PRIMARY KEY,
  feedback_id TEXT NOT NULL REFERENCES feedbacks(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_email TEXT,
  user_name TEXT,
  user_avatar TEXT,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  message TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_feedbacks_user ON feedbacks(user_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created ON feedbacks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_replies_fid ON feedback_replies(feedback_id);

-- Enable Row Level Security
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_replies ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own feedbacks; sasivan177@gmail.com can view all feedbacks
CREATE POLICY "Users can read own feedback or admin read all"
  ON feedbacks FOR SELECT
  USING (
    auth.uid()::text = user_id OR
    auth.jwt() ->> 'email' = 'sasivan177@gmail.com'
  );

CREATE POLICY "Users can insert own feedback"
  ON feedbacks FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users or admin can update status"
  ON feedbacks FOR UPDATE
  USING (
    auth.uid()::text = user_id OR
    auth.jwt() ->> 'email' = 'sasivan177@gmail.com'
  );

-- Replies policies
CREATE POLICY "Users or admin can read feedback replies"
  ON feedback_replies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM feedbacks f
      WHERE f.id = feedback_replies.feedback_id
      AND (f.user_id = auth.uid()::text OR auth.jwt() ->> 'email' = 'sasivan177@gmail.com')
    )
  );

CREATE POLICY "Users or admin can insert feedback replies"
  ON feedback_replies FOR INSERT
  WITH CHECK (
    auth.uid()::text = user_id OR
    auth.jwt() ->> 'email' = 'sasivan177@gmail.com'
  );

-- Admin delete policies
CREATE POLICY "Admin can delete feedbacks"
  ON feedbacks FOR DELETE
  USING (auth.jwt() ->> 'email' = 'sasivan177@gmail.com');

CREATE POLICY "Admin can delete feedback replies"
  ON feedback_replies FOR DELETE
  USING (auth.jwt() ->> 'email' = 'sasivan177@gmail.com');


