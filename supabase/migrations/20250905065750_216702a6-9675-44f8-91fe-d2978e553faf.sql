-- Insert a test notification for the current user
INSERT INTO public.messages (
  auth_user_id,
  from_user_id,
  to_user_id,
  subject,
  content,
  priority,
  read,
  timestamp
) VALUES (
  'f7038878-4389-4cac-bdf5-76b5f06baca1',
  'system',
  'f7038878-4389-4cac-bdf5-76b5f06baca1',
  'Welcome to the Notification System',
  'This is a test notification to demonstrate how reminders and system messages will appear. You can mark this as read using the notification bell at the top of the page.',
  'normal',
  false,
  NOW()
);