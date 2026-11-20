-- 006_fix_feedback_rls.sql: Fix feedback RLS to use app_metadata role instead of hardcoded emails

-- Drop legacy hardcoded policies
DROP POLICY IF EXISTS "Users can read own feedback or admin read all" ON feedbacks;
DROP POLICY IF EXISTS "Users or admin can update status" ON feedbacks;
DROP POLICY IF EXISTS "Users or admin can read feedback replies" ON feedback_replies;
DROP POLICY IF EXISTS "Users or admin can insert feedback replies" ON feedback_replies;
DROP POLICY IF EXISTS "Admin can delete feedback" ON feedbacks;
DROP POLICY IF EXISTS "Admin can delete feedback replies" ON feedback_replies;

-- Recreate policies using app_metadata or service_role
CREATE POLICY "Users can read own feedback or admin read all"
  ON feedbacks FOR SELECT
  USING (
    auth.uid()::text = user_id OR
    (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true OR
    auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "Users or admin can update status"
  ON feedbacks FOR UPDATE
  USING (
    auth.uid()::text = user_id OR
    (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true OR
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Replies policies
CREATE POLICY "Users or admin can read feedback replies"
  ON feedback_replies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM feedbacks f
      WHERE f.id = feedback_replies.feedback_id
      AND (
        f.user_id = auth.uid()::text OR
        (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true OR
        auth.jwt() ->> 'role' = 'service_role'
      )
    )
  );

CREATE POLICY "Users or admin can insert feedback replies"
  ON feedback_replies FOR INSERT
  WITH CHECK (
    auth.uid()::text = user_id OR
    (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true OR
    auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "Admin can delete feedback"
  ON feedbacks FOR DELETE
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true OR
    auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "Admin can delete feedback replies"
  ON feedback_replies FOR DELETE
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true OR
    auth.jwt() ->> 'role' = 'service_role'
  );

