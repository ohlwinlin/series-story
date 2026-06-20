
-- ENUMS
CREATE TYPE public.watch_status_enum AS ENUM ('watchlist','watching','paused','dropped','completed');
CREATE TYPE public.review_target_enum AS ENUM ('show','season','episode');

-- updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can delete own profile"
  ON public.profiles FOR DELETE USING (auth.uid() = id);

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  suffix INT := 0;
BEGIN
  base_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1),
    'user'
  );
  base_username := regexp_replace(lower(base_username), '[^a-z0-9_]', '', 'g');
  IF base_username = '' THEN base_username := 'user'; END IF;
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    suffix := suffix + 1;
    final_username := base_username || suffix::text;
  END LOOP;
  INSERT INTO public.profiles (id, username) VALUES (NEW.id, final_username);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- WATCH_STATUS
CREATE TABLE public.watch_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tmdb_show_id INTEGER NOT NULL,
  status public.watch_status_enum NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, tmdb_show_id)
);
CREATE INDEX watch_status_user_idx ON public.watch_status(user_id);
CREATE INDEX watch_status_show_idx ON public.watch_status(tmdb_show_id);
GRANT SELECT ON public.watch_status TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.watch_status TO authenticated;
GRANT ALL ON public.watch_status TO service_role;
ALTER TABLE public.watch_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Watch status viewable by everyone"
  ON public.watch_status FOR SELECT USING (true);
CREATE POLICY "Users can insert own watch status"
  ON public.watch_status FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own watch status"
  ON public.watch_status FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own watch status"
  ON public.watch_status FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER watch_status_set_updated_at
  BEFORE UPDATE ON public.watch_status
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- EPISODE_PROGRESS
CREATE TABLE public.episode_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tmdb_show_id INTEGER NOT NULL,
  season_number INTEGER NOT NULL,
  episode_number INTEGER NOT NULL,
  watched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, tmdb_show_id, season_number, episode_number)
);
CREATE INDEX episode_progress_user_show_idx ON public.episode_progress(user_id, tmdb_show_id);
GRANT SELECT ON public.episode_progress TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.episode_progress TO authenticated;
GRANT ALL ON public.episode_progress TO service_role;
ALTER TABLE public.episode_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Episode progress viewable by everyone"
  ON public.episode_progress FOR SELECT USING (true);
CREATE POLICY "Users can insert own episode progress"
  ON public.episode_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own episode progress"
  ON public.episode_progress FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own episode progress"
  ON public.episode_progress FOR DELETE USING (auth.uid() = user_id);

-- REVIEWS
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type public.review_target_enum NOT NULL,
  tmdb_show_id INTEGER NOT NULL,
  season_number INTEGER,
  episode_number INTEGER,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 10),
  text TEXT NOT NULL DEFAULT '',
  contains_spoilers BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT reviews_target_fields_ck CHECK (
    (target_type = 'show' AND season_number IS NULL AND episode_number IS NULL) OR
    (target_type = 'season' AND season_number IS NOT NULL AND episode_number IS NULL) OR
    (target_type = 'episode' AND season_number IS NOT NULL AND episode_number IS NOT NULL)
  )
);
CREATE INDEX reviews_show_idx ON public.reviews(tmdb_show_id, target_type);
CREATE INDEX reviews_user_idx ON public.reviews(user_id);

CREATE UNIQUE INDEX reviews_unique_show
  ON public.reviews(user_id, tmdb_show_id) WHERE target_type = 'show';
CREATE UNIQUE INDEX reviews_unique_season
  ON public.reviews(user_id, tmdb_show_id, season_number) WHERE target_type = 'season';
CREATE UNIQUE INDEX reviews_unique_episode
  ON public.reviews(user_id, tmdb_show_id, season_number, episode_number) WHERE target_type = 'episode';

GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews viewable by everyone"
  ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Users can insert own reviews"
  ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews"
  ON public.reviews FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own reviews"
  ON public.reviews FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER reviews_set_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
