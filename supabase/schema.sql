-- THANIMA: Nidhivetta Treasure Hunt Database Schema for Supabase / PostgreSQL

-- 1. Teams Table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  passcode TEXT NOT NULL,
  current_step INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Participants Table
CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  name TEXT NOT NULL,
  reg_no TEXT NOT NULL,
  is_leader BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique index to prevent duplicate registration of same reg_no in a team
CREATE UNIQUE INDEX IF NOT EXISTS idx_participant_team_regno ON participants(team_id, reg_no);

-- 3. Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
  step INTEGER PRIMARY KEY,
  letter CHAR(1) NOT NULL,
  title TEXT NOT NULL,
  clue TEXT NOT NULL,
  location_hint TEXT NOT NULL,
  map_url TEXT DEFAULT 'https://www.google.com/maps/search/?api=1&query=VIT+Chennai',
  qr_code TEXT UNIQUE NOT NULL,
  points INTEGER DEFAULT 150
);

-- 4. Scans Log Table
CREATE TABLE IF NOT EXISTS scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES participants(id) ON DELETE SET NULL,
  participant_name TEXT NOT NULL,
  step INTEGER NOT NULL,
  scanned_code TEXT NOT NULL,
  scanned_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initial 7 Tasks for K-E-R-A-L-A-M
INSERT INTO tasks (step, letter, title, clue, location_hint, map_url, qr_code, points)
VALUES
  (0, 'K', 'The Heritage Gateway', 'Begin where ancient roots meet modern minds. Look near the grand amphitheater or main reception canopy where knowledge arrives.', 'Main Block Entrance / Reception', 'https://www.google.com/maps/search/?api=1&query=VIT+Chennai+Admin+Block', 'THANIMA-KERALAM-K-9481', 150),
  (1, 'E', 'Echoes of Wisdom', 'Silence speaks louder than words here. Amid thousands of bound pages, find the desk of silent scholars.', 'Central Library Ground Floor', 'https://www.google.com/maps/search/?api=1&query=VIT+Chennai+Library', 'THANIMA-KERALAM-E-4217', 150),
  (2, 'R', 'Rhythm of the Waters', 'Kerala thrives on water. Seek the calm poolside or the shaded fountain where campus currents meet.', 'Campus Lake / Fountain Area', 'https://www.google.com/maps/search/?api=1&query=VIT+Chennai+Lake', 'THANIMA-KERALAM-R-8832', 150),
  (3, 'A', 'Arena of Champions', 'Where sweat turns to glory and spirits soar high under the open sky. Check the courts of victory.', 'Sports Complex / Basketball Court', 'https://www.google.com/maps/search/?api=1&query=VIT+Chennai+Sports+Complex', 'THANIMA-KERALAM-A-1590', 150),
  (4, 'L', 'Laboratories of Tomorrow', 'Wires, sparks, and machines that never sleep. Where innovation is soldered into reality.', 'Academic Block 1 Tech Hub', 'https://www.google.com/maps/search/?api=1&query=VIT+Chennai+Academic+Block', 'THANIMA-KERALAM-L-7364', 150),
  (5, 'A', 'Aroma of Feasts', 'Sadhya memories linger where appetites are satisfied after long battles of intellect.', 'Food Court / Gazebo Area', 'https://www.google.com/maps/search/?api=1&query=VIT+Chennai+Food+Court', 'THANIMA-KERALAM-A-6025', 150),
  (6, 'M', 'The Final Crown (Makutam)', 'The journey concludes at the festival epicenter where Thanima beats in every heart. Claim the treasure!', 'Thanima Main Stage / Auditorium', 'https://www.google.com/maps/search/?api=1&query=VIT+Chennai+Auditorium', 'THANIMA-KERALAM-M-3148', 150)
ON CONFLICT (step) DO UPDATE SET
  letter = EXCLUDED.letter,
  title = EXCLUDED.title,
  clue = EXCLUDED.clue,
  location_hint = EXCLUDED.location_hint,
  qr_code = EXCLUDED.qr_code,
  points = EXCLUDED.points;
