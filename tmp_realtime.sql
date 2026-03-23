CREATE OR REPLACE FUNCTION notify_responses_changes()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM realtime.publish(
    'responses:admin',
    TG_OP || '_response',
    row_to_json(NEW)::jsonb
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS responses_realtime ON responses;
CREATE TRIGGER responses_realtime
  AFTER INSERT OR UPDATE ON responses
  FOR EACH ROW
  EXECUTE FUNCTION notify_responses_changes();

INSERT INTO realtime.channels (pattern, description, enabled) 
VALUES ('responses:%', 'Admin responses', true)
ON CONFLICT (pattern) DO UPDATE SET enabled = true;
