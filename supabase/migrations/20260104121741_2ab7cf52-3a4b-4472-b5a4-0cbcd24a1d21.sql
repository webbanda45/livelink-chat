-- Create profiles table for user data (linked from Firebase auth)
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firebase_uid TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  nickname TEXT NOT NULL,
  avatar TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create friend_requests table
CREATE TABLE public.friend_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create friends table
CREATE TABLE public.friends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  friend_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- Create chats table
CREATE TABLE public.chats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'dm' CHECK (type IN ('dm', 'group')),
  name TEXT,
  participants TEXT[] NOT NULL,
  last_message TEXT,
  last_message_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unread_counts table
CREATE TABLE public.unread_counts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(chat_id, user_id)
);

-- Create group_members table for group management
CREATE TABLE public.group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(chat_id, user_id)
);

-- Create typing_status table for realtime typing indicators
CREATE TABLE public.typing_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  is_typing BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(chat_id, user_id)
);

-- Create user_presence table for online status
CREATE TABLE public.user_presence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  is_online BOOLEAN NOT NULL DEFAULT false,
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unread_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typing_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles (public read, owner write)
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (true);

-- Create RLS policies for friend_requests
CREATE POLICY "Users can view their friend requests" ON public.friend_requests FOR SELECT USING (true);
CREATE POLICY "Users can send friend requests" ON public.friend_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update friend requests" ON public.friend_requests FOR UPDATE USING (true);
CREATE POLICY "Users can delete friend requests" ON public.friend_requests FOR DELETE USING (true);

-- Create RLS policies for friends
CREATE POLICY "Users can view their friends" ON public.friends FOR SELECT USING (true);
CREATE POLICY "Users can add friends" ON public.friends FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can remove friends" ON public.friends FOR DELETE USING (true);

-- Create RLS policies for chats
CREATE POLICY "Users can view their chats" ON public.chats FOR SELECT USING (true);
CREATE POLICY "Users can create chats" ON public.chats FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their chats" ON public.chats FOR UPDATE USING (true);

-- Create RLS policies for messages
CREATE POLICY "Users can view messages in their chats" ON public.messages FOR SELECT USING (true);
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can delete messages" ON public.messages FOR DELETE USING (true);

-- Create RLS policies for unread_counts
CREATE POLICY "Users can view unread counts" ON public.unread_counts FOR SELECT USING (true);
CREATE POLICY "Users can update unread counts" ON public.unread_counts FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can modify unread counts" ON public.unread_counts FOR UPDATE USING (true);

-- Create RLS policies for group_members
CREATE POLICY "Users can view group members" ON public.group_members FOR SELECT USING (true);
CREATE POLICY "Users can add group members" ON public.group_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can remove group members" ON public.group_members FOR DELETE USING (true);

-- Create RLS policies for typing_status
CREATE POLICY "Users can view typing status" ON public.typing_status FOR SELECT USING (true);
CREATE POLICY "Users can update typing status" ON public.typing_status FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can modify typing status" ON public.typing_status FOR UPDATE USING (true);

-- Create RLS policies for user_presence
CREATE POLICY "Users can view presence" ON public.user_presence FOR SELECT USING (true);
CREATE POLICY "Users can update presence" ON public.user_presence FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can modify presence" ON public.user_presence FOR UPDATE USING (true);

-- Enable realtime for messages and typing_status
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_status;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_requests;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_friend_requests_updated_at BEFORE UPDATE ON public.friend_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON public.chats FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_typing_status_updated_at BEFORE UPDATE ON public.typing_status FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();