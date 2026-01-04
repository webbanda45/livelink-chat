-- Add unique constraint for unread_counts
ALTER TABLE public.unread_counts 
ADD CONSTRAINT unread_counts_chat_user_unique UNIQUE (chat_id, user_id);

-- Add unique constraint for typing_status
ALTER TABLE public.typing_status 
ADD CONSTRAINT typing_status_chat_user_unique UNIQUE (chat_id, user_id);

-- Add unique constraint for user_presence
ALTER TABLE public.user_presence 
ADD CONSTRAINT user_presence_user_unique UNIQUE (user_id);