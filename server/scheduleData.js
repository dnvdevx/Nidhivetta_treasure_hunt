// Master Organizer passwords.
// The GitHub repository is public, so these defaults are NOT secret. Set MASTER_ADMIN_PASSWORDS
// (comma-separated) in the Vercel environment to replace them.
const DEFAULT_MASTER_ADMIN_PASSWORDS = [
  'THANIMA@CORE26',
  'RESET@THANIMA26',
  'THANIMA#RESET26'
];

export const MASTER_ADMIN_PASSWORDS = (process.env.MASTER_ADMIN_PASSWORDS || '')
  .split(',')
  .map((p) => p.trim())
  .filter(Boolean);
if (MASTER_ADMIN_PASSWORDS.length === 0) {
  MASTER_ADMIN_PASSWORDS.push(...DEFAULT_MASTER_ADMIN_PASSWORDS);
}

// Optional per-station overrides, e.g. STATION_PASSCODE_PHOTO_GAME=NEWCODE
function stationPasscode(envName, fallback) {
  return (process.env[envName] || '').trim() || fallback;
}

// Individual Secret Game Station Passcodes for Marshals & Volunteers
export const GAME_STATION_PASSCODES = {
  'Hot n Cold': {
    gameId: 'Hot n Cold',
    passcode: stationPasscode('STATION_PASSCODE_HOT_N_COLD', 'FLAME#82HC'),
    displayName: 'Hot n Cold',
    icon: '🔥',
    alias: ['Hot & Cold', 'Hot n Cold']
  },
  'Numbers on Trees': {
    gameId: 'Jigsaw',
    passcode: stationPasscode('STATION_PASSCODE_JIGSAW', 'PIECE#39JS'),
    displayName: 'Jigsaw',
    icon: '🧩',
    alias: ['Numbers on Trees', 'Jigsaw']
  },
  'Jigsaw': {
    gameId: 'Jigsaw',
    passcode: stationPasscode('STATION_PASSCODE_JIGSAW', 'PIECE#39JS'),
    displayName: 'Jigsaw',
    icon: '🧩',
    alias: ['Numbers on Trees', 'Jigsaw']
  },
  'Photo Game': {
    gameId: 'Photo Game',
    passcode: stationPasscode('STATION_PASSCODE_PHOTO_GAME', 'RELIC#61PG'),
    displayName: 'Photo Game',
    icon: '📸',
    alias: ['Photo Game']
  },
  'Movie Game': {
    gameId: 'Movie Game',
    passcode: stationPasscode('STATION_PASSCODE_MOVIE_GAME', 'CINEMA#82MG'),
    displayName: 'Movie Game',
    icon: '🎬',
    alias: ['Movie Game']
  },
  'Boat Game': {
    gameId: 'Boat Game',
    passcode: stationPasscode('STATION_PASSCODE_BOAT_GAME', 'VALLAM#55BG'),
    displayName: 'Boat Game (The 20-Boat Fleet)',
    icon: '🛶',
    alias: ['Boat Game', 'Boat Game (The 20-Boat Fleet)']
  },
  'Final Game': {
    gameId: 'Final Game',
    passcode: stationPasscode('STATION_PASSCODE_FINAL_GAME', 'MAKUTAM#99FG'),
    displayName: 'Final Game (The Crown)',
    icon: '🏆',
    alias: ['Final Game', 'Final Game (The Crown of Makutam)']
  }
};

export function verifyAdminOrStationPasscode(providedKey) {
  if (!providedKey) return { valid: false, error: 'Passcode is required.' };
  const clean = String(providedKey).trim().toUpperCase();

  // 1. Check Master Organizer Passwords
  for (const m of MASTER_ADMIN_PASSWORDS) {
    if (clean === m.toUpperCase()) {
      return {
        valid: true,
        isMaster: true,
        role: 'master',
        displayName: 'Head Organizer',
        gameName: null,
        aliases: []
      };
    }
  }

  // 2. Check Game Station Passcodes
  for (const [gameName, info] of Object.entries(GAME_STATION_PASSCODES)) {
    if (clean === info.passcode.toUpperCase()) {
      return {
        valid: true,
        isMaster: false,
        role: 'volunteer',
        gameName,
        displayName: info.displayName,
        icon: info.icon,
        aliases: info.alias
      };
    }
  }

  return { valid: false, error: 'Invalid Passcode. Enter master password or station passcode.' };
}

// TEAM GAME SCHEDULE - Exactly as defined in the organizer's schedule table
// 10 Teams, 7 Games each
export const TEAM_GAME_SCHEDULE = {
  1:  ['QR Code', 'Hot & Cold', 'Jigsaw',     'Photo Game', 'Movie Game', 'Boat Game', 'Final Game'],
  2:  ['QR Code', 'Jigsaw',     'Photo Game', 'Movie Game', 'Hot & Cold', 'Boat Game', 'Final Game'],
  3:  ['QR Code', 'Photo Game', 'Movie Game', 'Hot & Cold', 'Jigsaw',     'Boat Game', 'Final Game'],
  4:  ['QR Code', 'Movie Game', 'Hot & Cold', 'Jigsaw',     'Photo Game', 'Boat Game', 'Final Game'],
  5:  ['QR Code', 'Hot & Cold', 'Photo Game', 'Movie Game', 'Jigsaw',     'Boat Game', 'Final Game'],
  6:  ['QR Code', 'Jigsaw',     'Hot & Cold', 'Movie Game', 'Photo Game', 'Boat Game', 'Final Game'],
  7:  ['QR Code', 'Photo Game', 'Jigsaw',     'Hot & Cold', 'Movie Game', 'Boat Game', 'Final Game'],
  8:  ['QR Code', 'Movie Game', 'Photo Game', 'Jigsaw',     'Hot & Cold', 'Boat Game', 'Final Game'],
  9:  ['QR Code', 'Hot & Cold', 'Movie Game', 'Jigsaw',     'Photo Game', 'Boat Game', 'Final Game'],
  10: ['QR Code', 'Jigsaw',     'Movie Game', 'Photo Game', 'Hot & Cold', 'Boat Game', 'Final Game'],
};

// 5 Starting QR Station Codes for 10 Teams (2 teams per QR as per official flow)
export const STARTING_STATIONS = [
  {
    stationId: 'START-LOC-1',
    qrCode: 'THANIMA-START-STATION-1',
    allowedTeamNumbers: [1, 2],
    locationHint: 'Station 1: ATM'
  },
  {
    stationId: 'START-LOC-2',
    qrCode: 'THANIMA-START-STATION-2',
    allowedTeamNumbers: [3, 4],
    locationHint: 'Station 2: AB3 Lawn'
  },
  {
    stationId: 'START-LOC-3',
    qrCode: 'THANIMA-START-STATION-3',
    allowedTeamNumbers: [5, 6],
    locationHint: 'Station 3: GymKhana'
  },
  {
    stationId: 'START-LOC-4',
    qrCode: 'THANIMA-START-STATION-4',
    allowedTeamNumbers: [7, 8],
    locationHint: 'Station 4: NorthSquare'
  },
  {
    stationId: 'START-LOC-5',
    qrCode: 'THANIMA-START-STATION-5',
    allowedTeamNumbers: [9, 10],
    locationHint: 'Station 5: Open Gym'
  }
];

// Team-Specific 3 Sequential Campus Locations for Photo Game (from official event flow)
export const TEAM_PHOTO_TARGETS = {
  1: [
    {
      index: 0,
      title: 'Location 1',
      locationName: 'Zedaxis',
      clueImage: '/images/c/b6a472e2fe483ab3.jpg',
      description: 'Study the clue image, find this campus location, and take a clear full photo of it.'
    },
    {
      index: 1,
      title: 'Location 2',
      locationName: 'VIT Heart',
      clueImage: '/images/c/9a9fdf8453330490.jpg',
      description: 'Study the clue image, find this campus location, and take a clear full photo of it.'
    },
    {
      index: 2,
      title: 'Location 3',
      locationName: 'Well 10 Gazebo - B Block',
      clueImage: '/images/c/0174a133c83cc954.jpg',
      description: 'Study the clue image, find this campus location, and take a clear full photo of it.'
    }
  ],
  2: [
    {
      index: 0,
      title: 'Location 1',
      locationName: 'VIT Map',
      clueImage: '/images/c/d7430e622c981c7d.jpg',
      description: 'Study the clue image, find this campus location, and take a clear full photo of it.'
    },
    {
      index: 1,
      title: 'Location 2',
      locationName: 'North Sq. Karikku Kada',
      clueImage: '/images/c/ef243cad0847dfd0.jpg',
      description: 'Study the clue image, find this campus location, and take a clear full photo of it.'
    },
    {
      index: 2,
      title: 'Location 3',
      locationName: 'Swimming Pool Banyan Tree',
      clueImage: '/images/c/2cda1ab4241c8cf7.jpg',
      description: 'Study the clue image, find this campus location, and take a clear full photo of it.'
    }
  ],
  3: [
    {
      index: 0,
      title: 'Location 1',
      locationName: 'Indian Bank',
      clueImage: '/images/c/90d715422292ac27.jpg',
      description: 'Study the clue image, find this campus location, and take a clear full photo of it.'
    },
    {
      index: 1,
      title: 'Location 2',
      locationName: 'Courier Point',
      clueImage: '/images/c/9e0090a003384b03.jpg',
      description: 'Study the clue image, find this campus location, and take a clear full photo of it.'
    },
    {
      index: 2,
      title: 'Location 3',
      locationName: 'Clock Court',
      clueImage: '/images/c/dacbec3f1fa02e56.jpg',
      description: 'Study the clue image, find this campus location, and take a clear full photo of it.'
    }
  ],
  4: [
    {
      index: 0,
      title: 'Location 1',
      locationName: 'Guesthouse',
      clueImage: '/images/c/8df97e60df3d06a0.jpg',
      description: 'Study the clue image, find this campus location, and take a clear full photo of it.'
    },
    {
      index: 1,
      title: 'Location 2',
      locationName: 'Courier Point',
      clueImage: '/images/c/9e0090a003384b03.jpg',
      description: 'Study the clue image, find this campus location, and take a clear full photo of it.'
    },
    {
      index: 2,
      title: 'Location 3',
      locationName: 'Well 10 Gazebo - B Block',
      clueImage: '/images/c/0174a133c83cc954.jpg',
      description: 'Study the clue image, find this campus location, and take a clear full photo of it.'
    }
  ],
  5: [
    {
      index: 0,
      title: 'Location 1',
      locationName: 'North Sq. Karikku Kada',
      clueImage: '/images/c/ef243cad0847dfd0.jpg',
      description: 'Study the clue image, find this campus location, and take a clear full photo of it.'
    },
    {
      index: 1,
      title: 'Location 2',
      locationName: 'Zedaxis',
      clueImage: '/images/c/b6a472e2fe483ab3.jpg',
      description: 'Study the clue image, find this campus location, and take a clear full photo of it.'
    },
    {
      index: 2,
      title: 'Location 3',
      locationName: 'MG Auditorium',
      clueImage: '/images/c/81290f312bd1e32b.jpg',
      description: 'Study the clue image, find this campus location, and take a clear full photo of it.'
    }
  ],
  6: [
    {
      index: 0,
      title: 'Location 1',
      locationName: 'Parking Lot',
      clueImage: '/images/c/5d4e3c1dbaf1957c.jpg',
      description: 'Study the clue image, find this campus location, and take a clear full photo of it.'
    },
    {
      index: 1,
      title: 'Location 2',
      locationName: 'North Sq. Karikku Kada',
      clueImage: '/images/c/ef243cad0847dfd0.jpg',
      description: 'Study the clue image, find this campus location, and take a clear full photo of it.'
    },
    {
      index: 2,
      title: 'Location 3',
      locationName: 'Courier Point',
      clueImage: '/images/c/9e0090a003384b03.jpg',
      description: 'Study the clue image, find this campus location, and take a clear full photo of it.'
    }
  ],
  7: [
    {
      index: 0,
      title: 'Location 1',
      locationName: 'VIT Heart',
      clueImage: '/images/c/9a9fdf8453330490.jpg',
      description: 'Study the clue image, find this campus location, and take a clear full photo of it.'
    },
    {
      index: 1,
      title: 'Location 2',
      locationName: 'Zedaxis',
      clueImage: '/images/c/b6a472e2fe483ab3.jpg',
      description: 'Study the clue image, find this campus location, and take a clear full photo of it.'
    },
    {
      index: 2,
      title: 'Location 3',
      locationName: 'Indian Bank',
      clueImage: '/images/c/90d715422292ac27.jpg',
      description: 'Study the clue image, find this campus location, and take a clear full photo of it.'
    }
  ],
  8: [
    {
      index: 0,
      title: 'Location 1',
      locationName: 'Well 10 Gazebo - B Block',
      clueImage: '/images/c/0174a133c83cc954.jpg',
      description: 'Study the clue image, find this campus location, and take a clear full photo of it.'
    },
    {
      index: 1,
      title: 'Location 2',
      locationName: 'Indian Bank',
      clueImage: '/images/c/90d715422292ac27.jpg',
      description: 'Study the clue image, find this campus location, and take a clear full photo of it.'
    },
    {
      index: 2,
      title: 'Location 3',
      locationName: 'Clock Court',
      clueImage: '/images/c/dacbec3f1fa02e56.jpg',
      description: 'Study the clue image, find this campus location, and take a clear full photo of it.'
    }
  ],
  9: [
    {
      index: 0,
      title: 'Location 1',
      locationName: 'MG Auditorium',
      clueImage: '/images/c/81290f312bd1e32b.jpg',
      description: 'Study the clue image, find this campus location, and take a clear full photo of it.'
    },
    {
      index: 1,
      title: 'Location 2',
      locationName: 'Courier Point',
      clueImage: '/images/c/9e0090a003384b03.jpg',
      description: 'Study the clue image, find this campus location, and take a clear full photo of it.'
    },
    {
      index: 2,
      title: 'Location 3',
      locationName: 'Indian Bank',
      clueImage: '/images/c/90d715422292ac27.jpg',
      description: 'Study the clue image, find this campus location, and take a clear full photo of it.'
    }
  ],
  10: [
    {
      index: 0,
      title: 'Location 1',
      locationName: 'North Sq. Karikku Kada',
      clueImage: '/images/c/ef243cad0847dfd0.jpg',
      description: 'Study the clue image, find this campus location, and take a clear full photo of it.'
    },
    {
      index: 1,
      title: 'Location 2',
      locationName: 'VIT Heart',
      clueImage: '/images/c/9a9fdf8453330490.jpg',
      description: 'Study the clue image, find this campus location, and take a clear full photo of it.'
    },
    {
      index: 2,
      title: 'Location 3',
      locationName: 'Guesthouse',
      clueImage: '/images/c/8df97e60df3d06a0.jpg',
      description: 'Study the clue image, find this campus location, and take a clear full photo of it.'
    }
  ]
};

// Malayalam Tree Numbers per Team for Numbers on Trees / Jigsaw
export const TEAM_TREE_NUMBERS = {
  1: {
    letter: 'ഝ',
    number: 24,
    riddle: 'അ  1\nഝ  ?',
    answer: 24,
    sittingArea: null
  },
  2: {
    letter: 'ള',
    number: 49,
    riddle: 'അ  1\nള  ?',
    answer: 49,
    sittingArea: null
  },
  3: {
    letter: 'ഋ',
    number: 8,
    riddle: 'അ  1\nഋ  ?',
    answer: 8,
    sittingArea: 'North Square sitting area'
  },
  4: {
    letter: 'ഫ',
    number: 37,
    riddle: 'അ  1\nഫ  ?',
    answer: 37,
    sittingArea: null
  },
  5: {
    letter: 'ഖ',
    number: 17,
    riddle: 'അ  1\nഖ  ?',
    answer: 17,
    sittingArea: 'North Square sitting area'
  },
  6: {
    letter: 'ഘ',
    number: 19,
    riddle: 'അ  1\nഘ  ?',
    answer: 19,
    sittingArea: 'Tennis court'
  },
  7: {
    letter: 'ദ',
    number: 33,
    riddle: 'അ  1\nദ  ?',
    answer: 33,
    sittingArea: 'Tennis Court'
  },
  8: {
    letter: 'യ',
    number: 41,
    riddle: 'അ  1\nയ  ?',
    answer: 41,
    sittingArea: 'Tennis Court'
  },
  9: {
    letter: 'ട',
    number: 26,
    riddle: 'അ  1\nട  ?',
    answer: 26,
    sittingArea: null
  },
  10: {
    letter: 'ശ',
    number: 45,
    riddle: 'അ  1\nശ  ?',
    answer: 45,
    sittingArea: 'Aavin'
  }
};

// Target relics for fallback or reference
export const PHOTO_GAME_TARGETS = [
  {
    index: 0,
    title: 'Sacred Nilavilakku (Brass Lamp)',
    description: 'A traditional Kerala multi-tiered bronze or brass lamp used during festivals and auspicious moments.'
  },
  {
    index: 1,
    title: 'Kathakali Art or Emblem',
    description: 'An emblem, carving, miniature mask, or decorative painting showcasing the grand green Vesham of Kathakali.'
  },
  {
    index: 2,
    title: 'Kasavu Fabric / Golden Weave',
    description: 'Traditional off-white cotton fabric interwoven with real golden Kasavu borders.'
  },
  {
    index: 3,
    title: 'Coir Craft or Coconut Heritage Relic',
    description: 'Handmade coconut shell art, braided coir artifact, or traditional spice vessel.'
  },
  {
    index: 4,
    title: 'Vallam Motif / Traditional Snake Boat Carving',
    description: 'A wood carving, painting, or model representing Kerala’s majestic Chundan Vallam.'
  }
];

// 5 Campus Locations for Boat Game (2 Question Boats per location)
export const BOAT_GAME_LOCATIONS = [
  {
    locationNumber: 1,
    title: 'Location 1: The Gathering Spot (Northwest)',
    riddle: 'Guided by the compass, seek the direction that lies between the setting sun and the midnight hour. Within this part of the campus lies a familiar gathering spot, now featuring a newly created space where one can pause and unwind.',
    boats: [1, 2],
    questionCodes: ['W4N8X2', 'B7K3Y9']
  },
  {
    locationNumber: 2,
    title: 'Location 2: The Polished Stone Seats',
    riddle: 'Stone-like seats with a polished glow, Where tired feet pause before they go. Not quite a hall, nor a place to read, Between a place of learning and a stage of talents, Lies a resting spot within your reach. Find where glossy rocks serve your needs. Your next clue awaits where people sit.',
    boats: [3, 4],
    questionCodes: ['T2M6V5', 'L9P4H7']
  },
  {
    locationNumber: 3,
    title: 'Location 3: Racket & Ripple',
    riddle: 'Shuttles fly on one side, splashes on the other. Find the spot where the racket meets the ripple.',
    boats: [5, 6],
    questionCodes: ['D5C8R3', 'G3Z7F2']
  },
  {
    locationNumber: 4,
    title: 'Location 4: The Newborn Court',
    riddle: 'Among the old, a newborn stands tall, The youngest member among them all. Seek the place where quick reflexes reign, And a feathered object dances across the terrain.',
    boats: [7, 8],
    questionCodes: ['S6J2N8', 'X1V5Q9']
  },
  {
    locationNumber: 5,
    title: 'Location 5: The Contours of Nature',
    riddle: "Where the earth wears a crown and the winds whisper tales of youthful adventures, countless moments of joy unfold. A familiar pursuit finds its home where nature's contours take an unexpected turn, inviting those who seek it to look beyond the obvious.",
    boats: [9, 10],
    questionCodes: ['M8T3K6', 'Y7R9D4']
  }
];

// 10 Boat Game Questions & 6-character Alphanumeric Codes (1 per Team)
export const BOAT_GAME_QUESTIONS = [
  {
    teamNumber: 1,
    questionBoatNumber: 1,
    questionCode: 'W4N8X2',
    question: 'The King of Kottarakkara wished to watch the Zamorin of Kozhikode’s Krishnanattam, but the Zamorin refused his request. In protest, the King of Kottarakkara created Ramanattam, based on the Ramayana. Which art form evolved through the further refinement of Ramanattam?',
    answerBoatNumber: 11,
    answer: 'Kathakali',
    answerCode: 'A3B2C1',
    code: 'A3B2C1'
  },
  {
    teamNumber: 2,
    questionBoatNumber: 2,
    questionCode: 'B7K3Y9',
    question: 'Which traditional Kerala performing art, associated with the worship of Goddess Bhadrakali, is famous for its elaborate facial painting, dramatic storytelling, and performances depicting the battle between Kali and Darika?',
    answerBoatNumber: 12,
    answer: 'Mudiyettu',
    answerCode: 'K7M4X9',
    code: 'K7M4X9'
  },
  {
    teamNumber: 3,
    questionBoatNumber: 3,
    questionCode: 'T2M6V5',
    question: 'In the iconic 1993 film Manichitrathazhu, which unique psychological condition does Dr. Sunny explain to describe Ganga’s transformation into Nagavalli?',
    answerBoatNumber: 13,
    answer: 'Split Personality / Multiple Personality Disorder',
    answerCode: 'R8D5T2',
    code: 'R8D5T2'
  },
  {
    teamNumber: 4,
    questionBoatNumber: 4,
    questionCode: 'L9P4H7',
    question: 'Long before Vellayiyappan’s present plight, a debt had found its way into his life. Hidden within the pages of a Malayalam Class 10 textbook chapter lies the story of a sum—fifteen rupees and four annas—that binds the past to the present. Turn back the pages of this tale and uncover the identity of the man who lent him this sum.',
    answerBoatNumber: 14,
    answer: 'Kuttyassan Mappila',
    answerCode: 'J4N9P6',
    code: 'J4N9P6'
  },
  {
    teamNumber: 5,
    questionBoatNumber: 5,
    questionCode: 'D5C8R3',
    question: 'What is the name of Kerala\'s traditional shadow-puppet theatre, which uses leather puppets to narrate stories, particularly from the Ramayana?',
    answerBoatNumber: 15,
    answer: 'Tholpavakoothu',
    answerCode: 'E2L7W3',
    code: 'E2L7W3'
  },
  {
    teamNumber: 6,
    questionBoatNumber: 6,
    questionCode: 'G3Z7F2',
    question: 'A phone call meant for one person reaches the wrong hands. What follows is a kidnapping plan filled with confusion and comedy. Which classic Malayalam film am I?',
    answerBoatNumber: 16,
    answer: 'Ramji Rao Speaking (1989)',
    answerCode: 'H6F1Y8',
    code: 'H6F1Y8'
  },
  {
    teamNumber: 7,
    questionBoatNumber: 7,
    questionCode: 'S6J2N8',
    question: 'In the blockbuster movie a college lecturer Vimal Sir tries to impress a Miss by dramatically describing a language as "Simple, Object-Oriented, Distributed, Dynamic... simple, powerful, and robust." Which language was he trying so passionately to teach?',
    answerBoatNumber: 17,
    answer: 'Java',
    answerCode: 'C9V3Q5',
    code: 'C9V3Q5'
  },
  {
    teamNumber: 8,
    questionBoatNumber: 8,
    questionCode: 'X1V5Q9',
    question: 'Four symbols in the Malayalam script conceal my identity. Decode them carefully and discover who I am!\n൨൩൦൭ — Can you guess who I am?',
    answerBoatNumber: 18,
    answer: '2307',
    answerCode: 'Z5S8B4',
    code: 'Z5S8B4'
  },
  {
    teamNumber: 9,
    questionBoatNumber: 9,
    questionCode: 'M8T3K6',
    question: 'Two detectives, one precious crown, and a journey across the sea. A barber awaits, but he won\'t recognise you unless you ask the right question.\nWhat are the three magical words that reveal his identity?',
    answerBoatNumber: 19,
    answer: '"Sadhanam kayyil undo?" (Akkare Akkare Akkare)',
    answerCode: 'T3G6M1',
    code: 'T3G6M1'
  },
  {
    teamNumber: 10,
    questionBoatNumber: 10,
    questionCode: 'Y7R9D4',
    question: 'In a Malayalam movie, during a memorable car ride, a passenger takes a hilarious dig at the driver\'s outdated music collection! 😂 The scene features a red Ford Ikon. Can you identify the last four digits of its registration number?',
    answerBoatNumber: 20,
    answer: '2367',
    answerCode: 'P7W2K8',
    code: 'P7W2K8'
  }
];

// Enigmatic Clues & Official Rules for each game
export const GAME_DETAILS = {
  'QR Code': {
    internalName: 'QR Code',
    displayName: 'Starting Station',
    clueTitle: 'The Gateway of Dawn',
    riddle: 'Where thousands gather before the grand arena, two destinies unlock a single doorway. Find your designated gateway keeper to begin the saga.',
    crypticHint: 'Look near the campus arrival arch / amphitheater reception.',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=VIT+Chennai',
    qrCode: 'ENTRY_STATION',
    points: 150,
    rules: {
      title: 'Rules & Instructions',
      items: [
        { num: 1, title: 'Locate Station', text: 'Head to your team\'s assigned starting station location on campus (1 of 5 stations).' },
        { num: 2, title: 'Scan Starting QR', text: 'Scan the official station QR code posted at your location with your phone camera or app.' },
        { num: 3, title: 'Enter Team Passcode', text: 'Enter your team\'s secret passcode provided by the organizers to verify your 4-player roster.' },
        { num: 4, title: 'Unlock Letter "K"', text: 'Successful verification unseals the first letter "K" of KERALAM and starts your official hunt clock!' }
      ],
      remember: 'Only the 2 teams assigned to this specific station can enter through it!'
    }
  },
  'Hot & Cold': {
    internalName: 'Hot & Cold',
    displayName: 'Hot n Cold',
    clueTitle: 'The Whispering Flame',
    riddle: `Where rackets fly and footballers chase,
A silent hunter once passed this place.
Near a little seat on a carpet of green,
Look for the traces of a visitor unseen.
Rambo may have left a secret behind,
Look closely at the ground to see what you find!`,
    crypticHint: 'Near the sports ground / football & racket courts.',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=VIT+Chennai+Ground',
    qrCode: 'THANIMA-GAME-HOTCOLD-5821',
    points: 150,
    rules: {
      title: 'Rules & Instructions',
      items: [
        {
          num: 1,
          title: 'Colour Assignment',
          text: 'Each team will be assigned a specific colour by the game-rule coordinator at the location.'
        },
        {
          num: 2,
          title: 'Search for Your Colour',
          text: 'Find only the clues that match your team\'s allotted colour.'
        },
        {
          num: 3,
          title: 'Ignore Other Colours',
          text: 'If you spot a clue of a different colour, ignore it completely. It belongs to another team, and finding it will earn a point for that team.'
        },
        {
          num: 4,
          title: 'Two Clues to Find',
          text: 'There are two clues hidden for each team\'s assigned colour. Find both to complete this round.'
        },
        {
          num: 5,
          title: 'Hot and Cold Hints',
          text: 'The game-rule coordinator will guide you during the search using the words "Hot" and "Cold."',
          subItems: [
            { label: 'Hot', type: 'hot', desc: 'You are getting closer to the clue.' },
            { label: 'Cold', type: 'cold', desc: 'You are moving farther away from the clue.' }
          ]
        },
        {
          num: 6,
          title: 'Do Not Disturb Other Clues',
          text: 'Do not collect, move, or tamper with clues belonging to other teams.'
        },
        {
          num: 7,
          title: 'Follow the Coordinator',
          text: 'The game-rule coordinator\'s instructions must be followed throughout the round.'
        }
      ],
      remember: 'Focus only on your assigned colour, use the hot-and-cold hints wisely, and find both clues to score!'
    }
  },
  'Jigsaw': {
    internalName: 'Jigsaw',
    displayName: 'Jigsaw',
    clueTitle: 'Jigsaw',
    riddle: `Some pulled ropes, some chased chairs, some showed off their muscles. Remember where all the madness happened?`,
    crypticHint: 'Find the number hidden in the clue, then locate the envelope bearing that number.',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=VIT+Chennai+Lawn',
    qrCode: 'THANIMA-GAME-JIGSAW-3904',
    points: 150,
    isNumbersOnTrees: true,
    rules: {
      title: 'Rules & Instructions',
      items: [
        {
          num: 1,
          title: 'Remember the Madness',
          text: 'Some pulled ropes, some chased chairs, some showed off their muscles. Remember where all the madness happened?'
        },
        {
          num: 2,
          title: 'Find the Hidden Number',
          text: 'Find the number hidden in the clue, then locate the envelope bearing that number.'
        },
        {
          num: 3,
          title: 'Solve the Puzzle Inside',
          text: 'Inside awaits a puzzle that will lead you to your next clue!'
        }
      ],
      remember: 'Find the number hidden in the clue, then locate the envelope bearing that number. Inside awaits a puzzle that will lead you to your next clue!'
    }
  },
  'Numbers on Trees': {
    internalName: 'Numbers on Trees',
    displayName: 'Jigsaw',
    clueTitle: 'Jigsaw',
    riddle: `Some pulled ropes, some chased chairs, some showed off their muscles. Remember where all the madness happened?`,
    crypticHint: 'Find the number hidden in the clue, then locate the envelope bearing that number.',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=VIT+Chennai+Lawn',
    qrCode: 'THANIMA-GAME-JIGSAW-3904',
    points: 150,
    isNumbersOnTrees: true,
    rules: {
      title: 'Rules & Instructions',
      items: [
        {
          num: 1,
          title: 'Remember the Madness',
          text: 'Some pulled ropes, some chased chairs, some showed off their muscles. Remember where all the madness happened?'
        },
        {
          num: 2,
          title: 'Find the Hidden Number',
          text: 'Find the number hidden in the clue, then locate the envelope bearing that number.'
        },
        {
          num: 3,
          title: 'Solve the Puzzle Inside',
          text: 'Inside awaits a puzzle that will lead you to your next clue!'
        }
      ],
      remember: 'Find the number hidden in the clue, then locate the envelope bearing that number. Inside awaits a puzzle that will lead you to your next clue!'
    }
  },
  'Photo Game': {
    internalName: 'Photo Game',
    displayName: 'Photo Game',
    clueTitle: 'Photo Game',
    riddle: `Only a small piece of the picture is revealed, but the full picture is waiting to be found!\n\nStudy the given image carefully, explore the campus, and identify the exact location shown. Once you find it, take a photograph of the complete location and upload it.`,
    crypticHint: 'Identify the exact location shown from the crop, explore campus, and photograph the complete location.',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=VIT+Chennai',
    qrCode: 'THANIMA-GAME-PHOTO-6142',
    points: 150,
    isPhotoGame: true,
    rules: {
      title: 'Rules & Instructions',
      items: [
        {
          num: 1,
          title: 'Piece of the Picture',
          text: 'Only a small piece of the picture is revealed, but the full picture is waiting to be found!'
        },
        {
          num: 2,
          title: 'Study & Explore',
          text: 'Study the given image carefully, explore the campus, and identify the exact location shown.'
        },
        {
          num: 3,
          title: 'Photograph Complete Location',
          text: 'Once you find it, take a photograph of the complete location and upload it.'
        }
      ],
      remember: 'Study the given image carefully, explore the campus, and identify the exact location shown. Once you find it, take a photograph of the complete location and upload it!'
    }
  },
  'Movie Game': {
    internalName: 'Movie Game',
    displayName: 'Movie Game',
    clueTitle: 'The Sweet Silhouette',
    riddle: `Where creamy treasures stay cool and bright,
And milky delights offer a bite.
Near the quarters where ladies reside,
A little shop keeps your next clue inside.`,
    crypticHint: 'Near the Ladies Hostel milk/ice cream stall.',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=VIT+Chennai+Ladies+Hostel',
    qrCode: 'THANIMA-GAME-MOVIE-8273',
    points: 150,
    rules: {
      title: 'Rules & Instructions',
      items: [
        { num: 1, title: 'Report to the Location', text: 'Solve the station riddle, find the location, and assemble with your squad before the Movie Game coordinator.' },
        { num: 2, title: 'Identify the Movie', text: 'Listen to the coordinator\'s clue on a movie and identify the movie.' },
        { num: 3, title: 'Team Consensus', text: 'Confer with your teammates and announce your final answer within the time limit.' },
        { num: 4, title: 'Earn Marshal Approval', text: 'Correctly identifying the films or characters earns the coordinator\'s approval or QR scan.' }
      ],
      remember: 'Discuss quietly so neighboring teams don\'t overhear your answers!'
    }
  },
  'Boat Game': {
    internalName: 'Boat Game',
    displayName: 'Boat Game',
    clueTitle: 'Rhythm of the Oars: The Five Harbors',
    riddle: `Inspired by Kerala’s traditional Vallamkali, this challenge tests your observation, knowledge, and teamwork. Five locations hold boats containing hidden codes and clues. Search across the 5 campus locations to find a boat, decipher its challenge, and navigate to victory!`,
    crypticHint: '5 campus locations hold the boats — consult the 5 location riddles below!',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=VIT+Chennai',
    qrCode: 'BOAT_GAME_DYNAMIC_CODE',
    points: 150,
    isBoatGame: true,
    rules: {
      title: 'Rules & Instructions',
      items: [
        {
          num: 1,
          title: 'Find a Boat at One of Five Locations',
          text: 'Find a boat containing a code at one of the five locations.'
        },
        {
          num: 2,
          title: 'Unlock Question on Website',
          text: 'Enter the code on the website to unlock a question.'
        },
        {
          num: 3,
          title: 'Solve & Search for Answer Boat',
          text: 'Solve the question and search the boats for the answer and its corresponding code.'
        },
        {
          num: 4,
          title: 'Enter Answer Code',
          text: 'Enter the new code on the website to complete the challenge.'
        }
      ],
      remember: 'Any team can enter any unoccupied question boat code; once claimed, that question is locked exclusively to your team!'
    }
  },
  'Final Game': {
    internalName: 'Final Game',
    displayName: 'One Step Ahead to Save Rambo',
    clueTitle: 'One Step Ahead to Save Rambo',
    clueImage: '/images/c/a12d8da9bcb185ce.png',
    riddle: 'The sacred 7th letter "M" has materialized! Study the highlighted zone on your treasure map, locate the secret place, and race with all your vigor to claim your crowning triumph!',
    crypticHint: 'Refer to the red highlighted zone on your final clue map.',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=VIT+Chennai+Auditorium',
    qrCode: 'THANIMA-GAME-FINAL-9901',
    points: 150,
    rules: {
      title: 'Rules & Instructions',
      items: [
        { num: 1, title: 'Secret 7th Letter "M"', text: 'Having conquered the 6th challenge, the hidden letter "M" is now revealed on your board!' },
        { num: 2, title: 'Race Together', text: 'All team members must race together to the final location.' },
        { num: 3, title: 'Save Rambo', text: 'Rambo will be placed somewhere in the final location with a key.' },
        { num: 4, title: 'Claim Your Victory', text: 'Present the key at the starting point to claim your victory.' }
      ],
      remember: 'Every second counts—stay together, find Rambo, and bring the key back to the starting point!'
    }
  }
};

export const LETTERS = ['K', 'E', 'R', 'A', 'L', 'A', 'M'];

// Initial 10 Teams pre-seeded with authentic team names, passcodes, and 4 players each
export const INITIAL_10_TEAMS = [
  {
    id: 'team-1',
    team_number: 1,
    name: 'KATHU',
    passcode: 'K8X4M2',
    start_station_id: 'START-LOC-1',
    start_qr_code: 'THANIMA-START-STATION-1',
    current_step: 0,
    points: 0,
    completed_at: null,
    photo_skips_used: 0,
    claimed_boat_question: null,
    boat_question_unlocked: false,
    members: [
      { id: 'p-1-1', name: 'Sharon P Biju', reg_no: '26BMH1121', is_leader: true },
      { id: 'p-1-2', name: 'Diya Sijo', reg_no: '26BMH1051', is_leader: false },
      { id: 'p-1-3', name: 'Niranjana Panicker', reg_no: '26BMH1163', is_leader: false },
      { id: 'p-1-4', name: 'Kadambari Panicker', reg_no: '26BMH1182', is_leader: false }
    ]
  },
  {
    id: 'team-2',
    team_number: 2,
    name: 'Beehive',
    passcode: 'B7W3L9',
    start_station_id: 'START-LOC-1',
    start_qr_code: 'THANIMA-START-STATION-1',
    current_step: 0,
    points: 0,
    completed_at: null,
    photo_skips_used: 0,
    claimed_boat_question: null,
    boat_question_unlocked: false,
    members: [
      { id: 'p-2-1', name: 'Nidheeshwar V S', reg_no: '26BYB1175', is_leader: true },
      { id: 'p-2-2', name: 'Ashwin Dhamesh Kumar', reg_no: '26BYB1161', is_leader: false },
      { id: 'p-2-3', name: 'Aashika Vineesh', reg_no: '26BCL1027', is_leader: false },
      { id: 'p-2-4', name: 'Adhvik Sunil', reg_no: '26BQC1095', is_leader: false }
    ]
  },
  {
    id: 'team-3',
    team_number: 3,
    name: 'Hived',
    passcode: 'H5N2P7',
    start_station_id: 'START-LOC-2',
    start_qr_code: 'THANIMA-START-STATION-2',
    current_step: 0,
    points: 0,
    completed_at: null,
    photo_skips_used: 0,
    claimed_boat_question: null,
    boat_question_unlocked: false,
    members: [
      { id: 'p-3-1', name: 'Shreya Mahendra', reg_no: '26BBT1038', is_leader: true },
      { id: 'p-3-2', name: 'Sreedev', reg_no: '26BYB1364', is_leader: false },
      { id: 'p-3-3', name: 'Ananda', reg_no: '26BRS1318', is_leader: false },
      { id: 'p-3-4', name: 'Aditya', reg_no: '26BYB1022', is_leader: false }
    ]
  },
  {
    id: 'team-4',
    team_number: 4,
    name: 'Parakkum Thalika',
    passcode: 'P6R8V3',
    start_station_id: 'START-LOC-2',
    start_qr_code: 'THANIMA-START-STATION-2',
    current_step: 0,
    points: 0,
    completed_at: null,
    photo_skips_used: 0,
    claimed_boat_question: null,
    boat_question_unlocked: false,
    members: [
      { id: 'p-4-1', name: 'Jasmin Rose', reg_no: '26BRS1091', is_leader: true },
      { id: 'p-4-2', name: 'Devananda Vijish', reg_no: '26BYB1209', is_leader: false },
      { id: 'p-4-3', name: 'Mayukha Siva', reg_no: '26BYB1208', is_leader: false },
      { id: 'p-4-4', name: 'Afrah Sherin', reg_no: '26BRS1190', is_leader: false }
    ]
  },
  {
    id: 'team-5',
    team_number: 5,
    name: 'Hivemind',
    passcode: 'M9J5Q4',
    start_station_id: 'START-LOC-3',
    start_qr_code: 'THANIMA-START-STATION-3',
    current_step: 0,
    points: 0,
    completed_at: null,
    photo_skips_used: 0,
    claimed_boat_question: null,
    boat_question_unlocked: false,
    members: [
      { id: 'p-5-1', name: 'Gaurinandana Rajiv', reg_no: '26BMH1195', is_leader: true },
      { id: 'p-5-2', name: 'Jeremy Nathan Malcolm', reg_no: '26BRS1348', is_leader: false },
      { id: 'p-5-3', name: 'Kashinath Sajeev Nair', reg_no: '26BRS1352', is_leader: false },
      { id: 'p-5-4', name: 'Advait Menon', reg_no: '26BAI1208', is_leader: false }
    ]
  },
  {
    id: 'team-6',
    team_number: 6,
    name: 'Amogus',
    passcode: 'A3Z7K8',
    start_station_id: 'START-LOC-3',
    start_qr_code: 'THANIMA-START-STATION-3',
    current_step: 0,
    points: 0,
    completed_at: null,
    photo_skips_used: 0,
    claimed_boat_question: null,
    boat_question_unlocked: false,
    members: [
      { id: 'p-6-1', name: 'Devna Krishna', reg_no: '24BCE1690', is_leader: true },
      { id: 'p-6-2', name: 'Adonia Alphonsa Romal', reg_no: '24BCE5009', is_leader: false },
      { id: 'p-6-3', name: 'Suyesha', reg_no: '24BCE1962', is_leader: false },
      { id: 'p-6-4', name: 'Sai Sahasra', reg_no: '24BCE5035', is_leader: false }
    ]
  },
  {
    id: 'team-7',
    team_number: 7,
    name: 'HAHAA',
    passcode: 'H4D9T2',
    start_station_id: 'START-LOC-4',
    start_qr_code: 'THANIMA-START-STATION-4',
    current_step: 0,
    points: 0,
    completed_at: null,
    photo_skips_used: 0,
    claimed_boat_question: null,
    boat_question_unlocked: false,
    members: [
      { id: 'p-7-1', name: 'Hitha S', reg_no: '26BRS1210', is_leader: true },
      { id: 'p-7-2', name: 'Srinikesh', reg_no: '26BRS1226', is_leader: false },
      { id: 'p-7-3', name: 'Anirudh Anandhi', reg_no: '26BRS1249', is_leader: false },
      { id: 'p-7-4', name: 'Kailash', reg_no: '26BRS1227', is_leader: false }
    ]
  },
  {
    id: 'team-8',
    team_number: 8,
    name: 'Parippuvada',
    passcode: 'R8C2N5',
    start_station_id: 'START-LOC-4',
    start_qr_code: 'THANIMA-START-STATION-4',
    current_step: 0,
    points: 0,
    completed_at: null,
    photo_skips_used: 0,
    claimed_boat_question: null,
    boat_question_unlocked: false,
    members: [
      { id: 'p-8-1', name: 'Nikhita S Nair', reg_no: '25MID1054', is_leader: true },
      { id: 'p-8-2', name: 'Roy Rich Alok', reg_no: '25MID1034', is_leader: false },
      { id: 'p-8-3', name: 'Rohini Sanjaya', reg_no: '25MID1073', is_leader: false },
      { id: 'p-8-4', name: 'Netradarsini S', reg_no: '25MID1096', is_leader: false }
    ]
  },
  {
    id: 'team-9',
    team_number: 9,
    name: 'Aviyal',
    passcode: 'Y7W4F9',
    start_station_id: 'START-LOC-5',
    start_qr_code: 'THANIMA-START-STATION-5',
    current_step: 0,
    points: 0,
    completed_at: null,
    photo_skips_used: 0,
    claimed_boat_question: null,
    boat_question_unlocked: false,
    members: [
      { id: 'p-9-1', name: 'Shravan Sukumaran', reg_no: '26BMH1077', is_leader: true },
      { id: 'p-9-2', name: 'Niranjan Madhav', reg_no: '26BMH1042', is_leader: false },
      { id: 'p-9-3', name: 'Ethen', reg_no: '26BMH1014', is_leader: false },
      { id: 'p-9-4', name: 'Gokul', reg_no: '26BMH1007', is_leader: false }
    ]
  },
  {
    id: 'team-10',
    team_number: 10,
    name: 'Aarkkariyam',
    passcode: 'K3L8S6',
    start_station_id: 'START-LOC-5',
    start_qr_code: 'THANIMA-START-STATION-5',
    current_step: 0,
    points: 0,
    completed_at: null,
    photo_skips_used: 0,
    claimed_boat_question: null,
    boat_question_unlocked: false,
    members: [
      { id: 'p-10-1', name: 'Aleesha James', reg_no: '26BRS1232', is_leader: true },
      { id: 'p-10-2', name: 'G Akhil Kumar', reg_no: '26BRS1247', is_leader: false },
      { id: 'p-10-3', name: 'V Varshit Reddy', reg_no: '26BRS1208', is_leader: false },
      { id: 'p-10-4', name: 'Abilash', reg_no: '26BRS1204', is_leader: false }
    ]
  }
];
