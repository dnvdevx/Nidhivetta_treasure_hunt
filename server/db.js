import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import {
  TEAM_GAME_SCHEDULE,
  STARTING_STATIONS,
  GAME_DETAILS,
  PHOTO_GAME_TARGETS,
  TEAM_PHOTO_TARGETS,
  TEAM_TREE_NUMBERS,
  BOAT_GAME_LOCATIONS,
  BOAT_GAME_QUESTIONS,
  LETTERS,
  INITIAL_10_TEAMS
} from './scheduleData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

let supabase = null;
if (isSupabaseConfigured) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('Connected to Supabase PostgreSQL Database.');
} else {
  console.log('Using local JSON storage adapter (Provide SUPABASE_URL to use Supabase).');
}

const IS_VERCEL = Boolean(process.env.VERCEL || process.env.NOW_REGION);
const LOCAL_STORE_FILE = IS_VERCEL
  ? path.join('/tmp', 'thanima_store.json')
  : path.join(__dirname, 'data', 'store.json');

function initInitialStore() {
  const store = {
    teams: JSON.parse(JSON.stringify(INITIAL_10_TEAMS)),
    scans: [],
    photoSubmissions: [],
    boatQuestions: JSON.parse(JSON.stringify(BOAT_GAME_QUESTIONS)),
    startingStations: JSON.parse(JSON.stringify(STARTING_STATIONS)),
    version: 10
  };
  try {
    fs.mkdirSync(path.dirname(LOCAL_STORE_FILE), { recursive: true });
    fs.writeFileSync(LOCAL_STORE_FILE, JSON.stringify(store, null, 2));
  } catch (err) {
    try {
      const fallbackFile = path.join('/tmp', 'thanima_store.json');
      fs.writeFileSync(fallbackFile, JSON.stringify(store, null, 2));
    } catch (_) {}
  }
  return store;
}

function readLocalStore() {
  try {
    let targetPath = LOCAL_STORE_FILE;
    if (IS_VERCEL && !fs.existsSync(targetPath)) {
      // Seed /tmp/thanima_store.json from packaged store.json if available
      const packagedStore = path.join(__dirname, 'data', 'store.json');
      if (fs.existsSync(packagedStore)) {
        try {
          const content = fs.readFileSync(packagedStore, 'utf-8');
          fs.writeFileSync(targetPath, content, 'utf-8');
        } catch (_) {}
      }
    }

    if (!fs.existsSync(targetPath)) {
      return initInitialStore();
    }
    const content = fs.readFileSync(targetPath, 'utf-8');
    const parsed = JSON.parse(content);
    if (!parsed.teams || parsed.teams.length !== 10) {
      console.log('Migrating store...');
      return initInitialStore();
    }
    let modified = false;
    if (!parsed.boatQuestions || parsed.boatQuestions.length !== 10 || !parsed.boatQuestions[0].questionCode) {
      parsed.boatQuestions = JSON.parse(JSON.stringify(BOAT_GAME_QUESTIONS));
      modified = true;
    }
    if (!parsed.startingStations || parsed.startingStations.length !== 5) {
      parsed.startingStations = JSON.parse(JSON.stringify(STARTING_STATIONS));
      modified = true;
    }
    if (parsed.version !== 10) {
      if (!parsed.boatQuestions || parsed.boatQuestions.length !== 10) {
        parsed.boatQuestions = JSON.parse(JSON.stringify(BOAT_GAME_QUESTIONS));
      }
      parsed.version = 10;
      modified = true;
    }
    if (modified) {
      writeLocalStore(parsed);
    }
    return parsed;
  } catch (err) {
    console.error('Error reading local store:', err);
    return initInitialStore();
  }
}

function writeLocalStore(data) {
  try {
    fs.mkdirSync(path.dirname(LOCAL_STORE_FILE), { recursive: true });
    fs.writeFileSync(LOCAL_STORE_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    try {
      const fallback = path.join('/tmp', 'thanima_store.json');
      fs.writeFileSync(fallback, JSON.stringify(data, null, 2));
    } catch (e2) {
      console.error('Error writing local store:', err, e2);
    }
  }
}

export async function getTeamById(teamId) {
  if (isSupabaseConfigured) {
    const { data: team } = await supabase.from('teams').select('*').eq('id', teamId).maybeSingle();
    if (!team) return null;
    const { data: members } = await supabase.from('participants').select('*').eq('team_id', teamId);
    return { ...team, members: members || [] };
  }
  const store = readLocalStore();
  return store.teams.find((t) => t.id === teamId) || null;
}

export async function getAllTeams() {
  if (isSupabaseConfigured) {
    const { data: teams } = await supabase.from('teams').select('*').order('team_number', { ascending: true });
    return teams || [];
  }
  const store = readLocalStore();
  return (store.teams || []).map((t) => {
    const schedule = TEAM_GAME_SCHEDULE[t.team_number] || TEAM_GAME_SCHEDULE[1];
    const step = t.current_step || 0;
    const isFinished = Boolean(t.completed_at || step >= schedule.length);

    let currentGame = 'Starting Station';
    if (isFinished) {
      currentGame = 'Completed 🏆';
    } else if (step === 0) {
      currentGame = 'Starting Station';
    } else if (step < schedule.length) {
      currentGame = schedule[step];
    }

    const teamPhotos = (store.photoSubmissions || []).filter((p) => p.team_id === t.id);

    return {
      ...t,
      current_step: step,
      total_steps: schedule.length,
      schedule,
      currentGame,
      isFinished,
      photoSubmissions: teamPhotos,
      approvedPhotosCount: teamPhotos.filter((p) => p.status === 'approved').length
    };
  });
}

// Return current mystery task for team (STRICTLY hiding internal game names from player!)
export function getTeamCurrentTask(team, localStore = null) {
  const step = team.current_step || 0;
  const schedule = TEAM_GAME_SCHEDULE[team.team_number] || TEAM_GAME_SCHEDULE[1];

  if (step >= schedule.length) {
    return {
      step,
      finished: true,
      letter: 'M',
      clueTitle: 'KERALAM Completed! 🎉',
      riddle: 'Your team has triumphed over all trials! Assemble at the Thanima main stage to claim the golden crown.',
      crypticHint: 'Thanima Main Stage / Auditorium',
      mapUrl: 'https://www.google.com/maps/search/?api=1&query=VIT+Chennai+Auditorium',
      points: 150
    };
  }

  const gameName = schedule[step];
  const details = GAME_DETAILS[gameName] || {};
  const letter = LETTERS[step];
  const isPhotoGame = Boolean(details.isPhotoGame);
  const isBoatGame = Boolean(details.isBoatGame);

  const baseTask = {
    step,
    finished: false,
    letter,
    gameName: details.displayName || gameName,
    internalName: gameName,
    displayName: details.displayName || gameName,
    clueTitle: details.clueTitle || `Mystery Challenge #${step + 1}`,
    riddle: details.riddle || 'Investigate your campus surroundings to decipher this clue.',
    crypticHint: details.crypticHint || 'Campus Landmark',
    mapUrl: details.mapUrl || 'https://www.google.com/maps/search/?api=1&query=VIT+Chennai',
    points: details.points || 150,
    rules: details.rules || null,
    clueImage: details.clueImage || null,
    isPhotoGame,
    isBoatGame
  };

  if (isBoatGame) {
    const store = localStore || (isSupabaseConfigured ? null : readLocalStore());
    const questions = store?.boatQuestions || BOAT_GAME_QUESTIONS;
    const locations = store?.boatLocations || BOAT_GAME_LOCATIONS;
    const claimedBoatNum = team.claimed_boat_question;
    const claimedQ = claimedBoatNum
      ? questions.find((q) => q.questionBoatNumber === claimedBoatNum)
      : null;
    const isUnlocked = Boolean(claimedQ && team.boat_question_unlocked);

    baseTask.boatLocations = locations;
    baseTask.boatQuestion = {
      isQuestionUnlocked: isUnlocked,
      questionBoatNumber: isUnlocked ? claimedQ.questionBoatNumber : null,
      questionCode: isUnlocked ? claimedQ.questionCode : null,
      question: isUnlocked ? claimedQ.question : null,
      hint: isUnlocked
        ? 'Figure out the answer to this question, find the physical boat displaying this answer, and enter its 6-character answer code.'
        : 'Locate a Question Boat at one of the 5 locations and enter its 6-character code to claim and reveal your question.'
    };
  }

  // Numbers on Trees: Team-specific Malayalam letter and number riddle
  const isNumbersOnTrees = gameName === 'Numbers on Trees' || gameName === 'Jigsaw';
  if (isNumbersOnTrees) {
    const treeInfo = TEAM_TREE_NUMBERS[team.team_number];
    if (treeInfo) {
      baseTask.isNumbersOnTrees = true;
      baseTask.treeInfo = treeInfo;
      baseTask.treeLetter = treeInfo.letter;
      baseTask.treeRiddle = treeInfo.riddle;
      baseTask.treeNumber = treeInfo.number;
      if (treeInfo.sittingArea) {
        baseTask.sittingArea = treeInfo.sittingArea;
      }
    }
  }

  // Photo Game: Team-specific 3 sequential campus location targets
  if (isPhotoGame) {
    const store = localStore || (isSupabaseConfigured ? null : readLocalStore());
    const allTargets = TEAM_PHOTO_TARGETS[team.team_number] || TEAM_PHOTO_TARGETS[1];

    let teamSubmissions = [];
    if (store && store.photoSubmissions) {
      teamSubmissions = store.photoSubmissions.filter((p) => p.team_id === team.id);
    }

    // Monotonic guard: ensure any target approved on the team record is always present
    if (team.approved_photo_targets && Array.isArray(team.approved_photo_targets)) {
      for (const approvedIdx of team.approved_photo_targets) {
        let sub = teamSubmissions.find((s) => s.target_index === approvedIdx);
        if (!sub) {
          sub = {
            id: `approved-${team.id}-${approvedIdx}`,
            team_id: team.id,
            target_index: approvedIdx,
            status: 'approved'
          };
          teamSubmissions.push(sub);
        } else {
          sub.status = 'approved';
        }
      }
    }

    const approvedCount = teamSubmissions.filter((s) => s.status === 'approved').length;
    // Sequential: show targets one after the other (up to approvedCount + 1)
    const visibleCount = Math.min(approvedCount + 1, allTargets.length);
    // Sanitize targets sent to participants: include clueImage, exclude locationName so participants cannot cheat via devtools
    const visibleTargets = allTargets.slice(0, visibleCount).map((t) => ({
      index: t.index,
      title: t.title,
      clueImage: t.clueImage,
      description: t.description
    }));

    baseTask.photoGameState = {
      targets: visibleTargets,
      allTargetsCount: allTargets.length,
      currentActiveIndex: Math.min(approvedCount, allTargets.length - 1),
      submissions: teamSubmissions,
      approvedCount,
      requiredCount: 3,
      isSequential: true
    };
  }

  return baseTask;
}

// Get starting stations (dynamic)
export async function getStartingStations() {
  const store = readLocalStore();
  return store.startingStations || STARTING_STATIONS;
}

// Update starting station configuration (allowed teams, hint, qrCode)
export async function updateStartingStation(stationId, { allowedTeamNumbers, locationHint, qrCode }) {
  const store = readLocalStore();
  if (!store.startingStations) {
    store.startingStations = JSON.parse(JSON.stringify(STARTING_STATIONS));
  }
  const st = store.startingStations.find((s) => s.stationId === stationId);
  if (!st) {
    throw new Error(`Station ${stationId} not found`);
  }
  if (Array.isArray(allowedTeamNumbers)) {
    st.allowedTeamNumbers = allowedTeamNumbers.map(Number).filter((n) => !isNaN(n));
  }
  if (locationHint) st.locationHint = locationHint;
  if (qrCode) st.qrCode = qrCode;

  // Sync team records with their new assigned starting station
  st.allowedTeamNumbers.forEach((teamNum) => {
    const t = store.teams.find((tm) => tm.team_number === teamNum);
    if (t) {
      t.start_station_id = st.stationId;
      t.start_qr_code = st.qrCode;
    }
  });

  writeLocalStore(store);
  return st;
}

// Verify starting station
export async function verifyEntryScan({ stationQr, passcode, regNo, memberId }) {
  const cleanStationQr = (stationQr || '').trim();
  const cleanPasscode = (passcode || '').trim().toUpperCase();

  const stations = await getStartingStations();
  const station = stations.find(
    (s) => s.qrCode === cleanStationQr || s.stationId === cleanStationQr
  );
  if (!station) {
    throw new Error('Invalid Starting QR Code. Please scan an authentic Thanima Starting Station QR.');
  }

  const store = isSupabaseConfigured ? null : readLocalStore();
  let team = null;

  const cleanUpper = cleanPasscode.replace(/\s+/g, '');
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from('teams')
      .select('*');
    team = (data || []).find(
      (t) =>
        (t.passcode || '').toUpperCase() === cleanPasscode ||
        (t.passcode || '').toUpperCase().replace(/\s+/g, '') === cleanUpper
    );
    if (team) {
      const { data: members } = await supabase.from('participants').select('*').eq('team_id', team.id);
      team.members = members || [];
    }
  } else {
    team = store.teams.find(
      (t) =>
        (t.passcode || '').toUpperCase() === cleanPasscode ||
        (t.passcode || '').toUpperCase().replace(/\s+/g, '') === cleanUpper
    );
  }

  if (!team) {
    throw new Error('Invalid Team Passcode. Please enter the authentic passcode given by the organizers.');
  }

  if (!station.allowedTeamNumbers.includes(team.team_number)) {
    throw new Error(
      `Access Denied! This starting place is NOT assigned to Team ${team.team_number} (${team.name}). Look for your team's clue and find the designated location!`
    );
  }

  let member = null;
  const members = team.members || [];
  if (memberId) {
    member = members.find((m) => m.id === memberId);
  }
  if (!member && regNo) {
    const cleanReg = regNo.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    member = members.find((m) => {
      const mReg = (m.reg_no || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      return (
        mReg === cleanReg ||
        (m.reg_no || '').toUpperCase() === regNo.trim().toUpperCase() ||
        (mReg.startsWith(cleanReg) && cleanReg.length >= 7) ||
        (cleanReg.startsWith(mReg) && mReg.length >= 7)
      );
    });
  }
  if (!member) {
    member = members[0];
  }

  const now = new Date().toISOString();
  if (team.current_step === 0) {
    team.current_step = 1;
    team.points = (team.points || 0) + 150;
    team.updated_at = now;

    if (isSupabaseConfigured) {
      await supabase
        .from('teams')
        .update({ current_step: 1, points: team.points, updated_at: now })
        .eq('id', team.id);

      await supabase.from('scans').insert([
        {
          id: crypto.randomUUID(),
          team_id: team.id,
          participant_id: member ? member.id : null,
          participant_name: member ? member.name : 'Teammate',
          step: 0,
          scanned_code: cleanStationQr,
          scanned_at: now
        }
      ]);
    } else {
      store.scans.push({
        id: crypto.randomUUID(),
        team_id: team.id,
        participant_id: member ? member.id : null,
        participant_name: member ? member.name : 'Teammate',
        step: 0,
        scanned_code: cleanStationQr,
        scanned_at: now
      });
      writeLocalStore(store);
    }
  }

  const currentTask = getTeamCurrentTask(team, store);
  return { team, member, currentTask };
}

// Complete task via QR or Marshal Approval
export async function completeTeamTask({ teamId, participantId = null, participantName = 'Marshal', method = 'QR', scannedCode = '' }) {
  const team = await getTeamById(teamId);
  if (!team) throw new Error('Team not found');

  const currentStep = team.current_step;
  const schedule = TEAM_GAME_SCHEDULE[team.team_number] || TEAM_GAME_SCHEDULE[1];

  if (currentStep >= schedule.length) {
    return {
      finished: true,
      message: 'Your team has already conquered all tasks of KERALAM! Congratulations!',
      team
    };
  }

  const nextStep = currentStep + 1;
  const isFinished = nextStep >= schedule.length;
  const now = new Date().toISOString();
  const nextPoints = (team.points || 0) + 150;

  team.current_step = nextStep;
  team.points = nextPoints;
  if (isFinished) {
    team.completed_at = now;
  }
  team.updated_at = now;

  if (isSupabaseConfigured) {
    await supabase
      .from('teams')
      .update({
        current_step: nextStep,
        points: nextPoints,
        completed_at: isFinished ? now : null,
        updated_at: now
      })
      .eq('id', team.id);

    await supabase.from('scans').insert([
      {
        id: crypto.randomUUID(),
        team_id: team.id,
        participant_id: participantId,
        participant_name: participantName,
        step: currentStep,
        scanned_code: scannedCode || `APPROVED_BY_${method}`,
        scanned_at: now
      }
    ]);
  } else {
    const store = readLocalStore();
    const stTeam = store.teams.find((t) => t.id === team.id);
    if (stTeam) {
      stTeam.current_step = nextStep;
      stTeam.points = nextPoints;
      stTeam.completed_at = isFinished ? now : null;
      stTeam.updated_at = now;
      stTeam.marshal_feedback = null;
    }
    store.scans.push({
      id: crypto.randomUUID(),
      team_id: team.id,
      participant_id: participantId,
      participant_name: participantName,
      step: currentStep,
      scanned_code: scannedCode || `APPROVED_BY_${method}`,
      scanned_at: now
    });
    writeLocalStore(store);
  }

  const unlockedLetter = LETTERS[currentStep];
  const isSixthTaskFinished = nextStep >= 6;

  let celebrationMsg = `✨ Splendid! Challenge solved! You unlocked Letter "${unlockedLetter}"!`;
  if (isFinished) {
    celebrationMsg = '🎉 VICTORY! You conquered the Final Game and assembled all 7 letters of KERALAM!';
  } else if (isSixthTaskFinished) {
    celebrationMsg = '🔥 MYSTERY UNLOCKED! You unlocked Letter "A"! The secret 7th letter "M" has now materialized on your board!';
  }

  return {
    success: true,
    message: celebrationMsg,
    letterUnlocked: unlockedLetter,
    revealedM: isSixthTaskFinished,
    finished: isFinished,
    team,
    currentTask: getTeamCurrentTask(team)
  };
}

// Station Volunteer / Marshal: Deny team or request retry with custom feedback
export async function denyTeamTask({ teamId, marshalName = 'Station Volunteer', reason }) {
  const store = readLocalStore();
  const team = store.teams.find((t) => t.id === teamId);
  if (!team) throw new Error('Team not found');

  const schedule = TEAM_GAME_SCHEDULE[team.team_number] || TEAM_GAME_SCHEDULE[1];
  const currentStep = team.current_step || 0;
  const gameName = schedule[currentStep] || 'Current Station';

  team.marshal_feedback = {
    gameName,
    reason: reason || 'Coordinator requested a retry. Please review the rules, correct your attempt, and show the coordinator again!',
    deniedAt: new Date().toISOString(),
    marshalName
  };

  writeLocalStore(store);

  return {
    success: true,
    message: `Team ${team.name} marked as Retry. Feedback sent to team screen.`,
    team,
    feedback: team.marshal_feedback
  };
}

// QR scan verification with enigmatic feedback
export async function advanceTeamTaskByQR({ teamId, participantId, participantName, scannedCode }) {
  const cleanCode = (scannedCode || '').trim();
  const team = await getTeamById(teamId);
  if (!team) throw new Error('Team not found');

  const currentStep = team.current_step;
  const schedule = TEAM_GAME_SCHEDULE[team.team_number] || TEAM_GAME_SCHEDULE[1];

  if (currentStep >= schedule.length) {
    return {
      finished: true,
      message: 'Your team has already conquered all tasks of KERALAM! Congratulations!',
      team
    };
  }

  const currentGameName = schedule[currentStep];
  const currentGameDetails = GAME_DETAILS[currentGameName];

  // If currently on Boat Game, allow solving via boat code
  if (currentGameName === 'Boat Game') {
    return verifyBoatCode({ teamId, code: cleanCode, participantName, participantId });
  }

  if (cleanCode === currentGameDetails.qrCode) {
    return completeTeamTask({
      teamId,
      participantId,
      participantName,
      method: 'QR',
      scannedCode: cleanCode
    });
  }

  // Check if belonging to past or future without revealing the game title
  const pastGameIndex = schedule.slice(0, currentStep).findIndex((g) => GAME_DETAILS[g]?.qrCode === cleanCode);
  if (pastGameIndex !== -1) {
    return {
      error: `Your team has already conquered this station! Ponder your current riddle to find the next location.`
    };
  }

  const futureGameIndex = schedule.slice(currentStep + 1).findIndex((g) => GAME_DETAILS[g]?.qrCode === cleanCode);
  if (futureGameIndex !== -1) {
    return {
      error: `Station discovered out of sequence! This station belongs to a different riddle. Solve your current clue first!`
    };
  }

  return {
    error: 'Invalid station QR code. Please scan the official station code for your current challenge.'
  };
}

// BOAT GAME: Step 1 - Claim and unlock a Question Boat by entering its 6-character code
// Open to ANY team: first team to enter the code claims that question!
export async function unlockBoatQuestion({ teamId, questionCode }) {
  const team = await getTeamById(teamId);
  if (!team) throw new Error('Team not found');

  const clean = (questionCode || '').trim().toUpperCase();
  if (!clean) throw new Error('Please enter the 6-character Question Boat code.');

  const schedule = TEAM_GAME_SCHEDULE[team.team_number] || TEAM_GAME_SCHEDULE[1];
  const currentStep = team.current_step;
  const currentGame = schedule[currentStep];

  if (currentGame !== 'Boat Game') {
    throw new Error('Your team is not currently on the Boat Challenge.');
  }

  const store = isSupabaseConfigured ? null : readLocalStore();
  const questions = store?.boatQuestions || BOAT_GAME_QUESTIONS;
  const allTeams = isSupabaseConfigured ? (await getAllTeams()) : store.teams;

  // Find which Question Boat this code belongs to
  const matchedQ = questions.find((q) => (q.questionCode || '').toUpperCase() === clean);

  if (!matchedQ) {
    // Check if they accidentally entered an answer code instead
    const isAnswerCode = questions.some((q) => (q.answerCode || q.code || '').toUpperCase() === clean);
    if (isAnswerCode) {
      return {
        error: 'That is an Answer Boat code! First, locate any available Question Boat (Boats 1 to 10) and enter its code to claim your question.'
      };
    }
    return {
      error: 'Invalid Question Boat code. Locate any unoccupied Question Boat (Boats 1 to 10) along the waterside.'
    };
  }

  // If this team has ALREADY claimed a question boat:
  if (team.claimed_boat_question) {
    if (team.claimed_boat_question === matchedQ.questionBoatNumber) {
      return {
        success: true,
        message: `✓ Question Boat #${matchedQ.questionBoatNumber} is unlocked for your team!`,
        boatQuestion: {
          questionBoatNumber: matchedQ.questionBoatNumber,
          questionCode: matchedQ.questionCode,
          question: matchedQ.question,
          isQuestionUnlocked: true
        }
      };
    } else {
      return {
        error: `Your team has already claimed Question Boat #${team.claimed_boat_question}! You must solve that question.`
      };
    }
  }

  // Check if ANOTHER team has already claimed this Question Boat
  const claimingTeam = allTeams.find(
    (t) => t.id !== team.id && t.claimed_boat_question === matchedQ.questionBoatNumber
  );

  if (claimingTeam) {
    return {
      error: `⚠️ Question Boat #${matchedQ.questionBoatNumber} has already been claimed by ${claimingTeam.name}! Please locate another available Question Boat.`
    };
  }

  // Claim Question Boat for this team!
  team.claimed_boat_question = matchedQ.questionBoatNumber;
  team.boat_question_unlocked = true;

  if (store) {
    const stTeam = store.teams.find((t) => t.id === teamId);
    if (stTeam) {
      stTeam.claimed_boat_question = matchedQ.questionBoatNumber;
      stTeam.boat_question_unlocked = true;
    }
    writeLocalStore(store);
  }

  return {
    success: true,
    message: `🎉 Question Boat #${matchedQ.questionBoatNumber} claimed and unlocked! Now find the matching Answer Boat.`,
    boatQuestion: {
      questionBoatNumber: matchedQ.questionBoatNumber,
      questionCode: matchedQ.questionCode,
      question: matchedQ.question,
      isQuestionUnlocked: true
    }
  };
}

// BOAT GAME: Step 2 - Verify 6-character alphanumeric answer boat code against claimed question
export async function verifyBoatCode({ teamId, code, participantName = 'Teammate', participantId = null }) {
  const team = await getTeamById(teamId);
  if (!team) throw new Error('Team not found');

  const clean = (code || '').trim().toUpperCase();
  if (!clean) throw new Error('Please enter the 6-character alphanumeric boat answer code.');

  const schedule = TEAM_GAME_SCHEDULE[team.team_number] || TEAM_GAME_SCHEDULE[1];
  const currentStep = team.current_step;
  const currentGame = schedule[currentStep];

  if (currentGame !== 'Boat Game') {
    throw new Error('Your team is not currently on the Boat Challenge.');
  }

  if (!team.claimed_boat_question || !team.boat_question_unlocked) {
    return {
      error: 'Please claim an available Question Boat first by entering its 6-character code.'
    };
  }

  const store = isSupabaseConfigured ? null : readLocalStore();
  const questions = store?.boatQuestions || BOAT_GAME_QUESTIONS;
  const claimedQ = questions.find((q) => q.questionBoatNumber === team.claimed_boat_question);

  if (!claimedQ) {
    return {
      error: 'Question data not found. Please re-enter your Question Boat code.'
    };
  }

  const validAnswerCode = (claimedQ.answerCode || claimedQ.code || '').toUpperCase();

  if (clean === validAnswerCode) {
    return completeTeamTask({
      teamId,
      participantId,
      participantName,
      method: 'BOAT_GAME_CODE',
      scannedCode: clean
    });
  }

  // Check if code matches another boat's answer
  const otherAnswerBoat = questions.find((q) => (q.answerCode || q.code || '').toUpperCase() === clean);
  if (otherAnswerBoat) {
    return {
      error: `That boat displays a different answer! Search the fleet for the boat displaying the correct answer to YOUR claimed question (Question Boat #${claimedQ.questionBoatNumber}).`
    };
  }

  // Check if they re-entered the question code
  if (clean === (claimedQ.questionCode || '').toUpperCase()) {
    return {
      error: 'You entered the Question Boat code again! Now find the boat displaying the ANSWER to your question.'
    };
  }

  return {
    error: 'Invalid 6-character boat answer code. Search the boats near the waterside for your correct answer.'
  };
}

export async function getBoatLocations() {
  const store = isSupabaseConfigured ? null : readLocalStore();
  return store?.boatLocations || BOAT_GAME_LOCATIONS;
}

export async function getBoatQuestions() {
  const store = isSupabaseConfigured ? null : readLocalStore();
  const questions = store?.boatQuestions || BOAT_GAME_QUESTIONS;
  const locations = store?.boatLocations || BOAT_GAME_LOCATIONS;
  const allTeams = isSupabaseConfigured ? (await getAllTeams()) : (store?.teams || []);

  return questions.map((q) => {
    const claimingTeam = allTeams.find((t) => t.claimed_boat_question === q.questionBoatNumber);
    const locNum = Math.ceil((q.questionBoatNumber || q.teamNumber) / 2);
    const locInfo = locations.find((l) => l.locationNumber === locNum);
    return {
      ...q,
      locationNumber: locNum,
      locationTitle: locInfo ? locInfo.title : `Location ${locNum}`,
      locationRiddle: locInfo ? locInfo.riddle : '',
      claimedByTeamId: claimingTeam ? claimingTeam.id : null,
      claimedByTeamName: claimingTeam ? claimingTeam.name : null
    };
  });
}

// Admin: Release a team's claimed question boat if needed
export async function clearBoatClaim(teamIdOrBoatNumber) {
  const store = readLocalStore();
  let affectedTeam = null;
  if (typeof teamIdOrBoatNumber === 'number') {
    affectedTeam = store.teams.find((t) => t.claimed_boat_question === teamIdOrBoatNumber);
  } else {
    affectedTeam = store.teams.find((t) => t.id === teamIdOrBoatNumber);
  }

  if (affectedTeam) {
    affectedTeam.claimed_boat_question = null;
    affectedTeam.boat_question_unlocked = false;
    writeLocalStore(store);
  }
  return affectedTeam;
}

export async function updateBoatQuestion(teamNumber, { question, answer, questionCode, answerCode, code }) {
  const store = readLocalStore();
  if (!store.boatQuestions) store.boatQuestions = JSON.parse(JSON.stringify(BOAT_GAME_QUESTIONS));
  const bq = store.boatQuestions.find((q) => q.teamNumber === teamNumber);
  if (bq) {
    if (question) bq.question = question;
    if (answer) bq.answer = answer;
    if (questionCode) bq.questionCode = questionCode.toUpperCase().trim();
    const ansCode = (answerCode || code || '').toUpperCase().trim();
    if (ansCode) {
      bq.answerCode = ansCode;
      bq.code = ansCode;
    }
    writeLocalStore(store);
  }
  return bq;
}

// PHOTO GAME: Submit a photo for a specific target index
export async function submitPhotoTarget({ teamId, targetIndex, imageUrl, participantName }) {
  const team = await getTeamById(teamId);
  if (!team) throw new Error('Team not found');

  const teamTargets = TEAM_PHOTO_TARGETS[team.team_number] || TEAM_PHOTO_TARGETS[1];
  const target = teamTargets[targetIndex] || PHOTO_GAME_TARGETS[targetIndex];
  if (!target) throw new Error('Invalid photo target index');

  const now = new Date().toISOString();
  const store = isSupabaseConfigured ? null : readLocalStore();

  const newSubmission = {
    id: crypto.randomUUID(),
    team_id: team.id,
    team_number: team.team_number,
    team_name: team.name,
    target_index: targetIndex,
    target_title: target.title,
    location_name: target.locationName || target.title,
    clue_image: target.clueImage || null,
    image_url: imageUrl,
    participant_name: participantName || 'Teammate',
    status: 'pending', // pending, approved, rejected
    comment: '',
    submitted_at: now,
    reviewed_at: null
  };

  if (!isSupabaseConfigured) {
    if (!store.photoSubmissions) store.photoSubmissions = [];
    // Replace any existing submission for this team and target
    store.photoSubmissions = store.photoSubmissions.filter(
      (s) => !(s.team_id === team.id && s.target_index === targetIndex)
    );
    store.photoSubmissions.push(newSubmission);
    writeLocalStore(store);
  }

  return newSubmission;
}

// PHOTO GAME: Skip an unsolved photo target to unlock the next one (max 2 skips)
export async function skipPhotoTarget({ teamId }) {
  const team = await getTeamById(teamId);
  if (!team) throw new Error('Team not found');

  const currentSkips = team.photo_skips_used || 0;
  if (currentSkips >= 2) {
    throw new Error('Maximum of 2 skips allowed for the Photo Challenge.');
  }

  team.photo_skips_used = currentSkips + 1;
  const store = isSupabaseConfigured ? null : readLocalStore();
  if (store) {
    const stTeam = store.teams.find((t) => t.id === teamId);
    if (stTeam) stTeam.photo_skips_used = team.photo_skips_used;
    writeLocalStore(store);
  }

  return {
    success: true,
    message: `Target skipped! New photo target #${3 + team.photo_skips_used} unlocked.`,
    photoGameState: getTeamCurrentTask(team, store).photoGameState
  };
}

// PHOTO GAME: Marshal reviews and approves/rejects a submission
export async function reviewPhotoSubmission({ submissionId, status, comment }) {
  const store = isSupabaseConfigured ? null : readLocalStore();
  const submission = store.photoSubmissions?.find((s) => s.id === submissionId);
  if (!submission) throw new Error('Submission not found');

  const now = new Date().toISOString();
  submission.status = status; // 'approved' or 'rejected'
  submission.comment = comment || '';
  submission.reviewed_at = now;

  let taskCompleted = false;
  let completeResult = null;

  if (status === 'approved') {
    const stTeam = store.teams?.find((t) => t.id === submission.team_id);
    if (stTeam) {
      if (!stTeam.approved_photo_targets) stTeam.approved_photo_targets = [];
      if (!stTeam.approved_photo_targets.includes(submission.target_index)) {
        stTeam.approved_photo_targets.push(submission.target_index);
      }
    }

    // Check if team now has 3 approved photos
    const teamSubmissions = store.photoSubmissions.filter(
      (s) => s.team_id === submission.team_id && s.status === 'approved'
    );

    if (teamSubmissions.length >= 3) {
      writeLocalStore(store);
      completeResult = await completeTeamTask({
        teamId: submission.team_id,
        participantName: 'Photo Game Marshal',
        method: 'PHOTO_GAME_MARSHAL_APPROVAL'
      });
      taskCompleted = true;
    }
  } else if (status === 'rejected') {
    const stTeam = store.teams?.find((t) => t.id === submission.team_id);
    if (stTeam && stTeam.approved_photo_targets) {
      stTeam.approved_photo_targets = stTeam.approved_photo_targets.filter(
        (idx) => idx !== submission.target_index
      );
    }
  }

  writeLocalStore(store);

  return {
    submission,
    taskCompleted,
    completeResult
  };
}

export async function getAllPhotoSubmissions() {
  const store = isSupabaseConfigured ? null : readLocalStore();
  return store.photoSubmissions || [];
}

export async function getLeaderboard() {
  const teams = await getAllTeams();
  const sorted = [...teams].sort((a, b) => {
    if (b.current_step !== a.current_step) return b.current_step - a.current_step;
    if (a.completed_at && b.completed_at) {
      return new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime();
    }
    if (a.completed_at) return -1;
    if (b.completed_at) return 1;
    return (b.points || 0) - (a.points || 0);
  });

  return sorted.map((t) => ({
    id: t.id,
    team_number: t.team_number,
    name: t.name,
    current_step: t.current_step,
    points: t.points,
    completed_at: t.completed_at
  }));
}

export async function updateTeamRoster(teamId, { name, passcode, members }) {
  const store = readLocalStore();
  const team = store.teams.find((t) => t.id === teamId);
  if (team) {
    if (name) team.name = name;
    if (passcode) team.passcode = passcode;
    if (Array.isArray(members)) {
      team.members = members;
    }
    writeLocalStore(store);
  }
  return getTeamById(teamId);
}

export async function resetTeam(teamId) {
  const store = readLocalStore();
  const team = store.teams.find((t) => t.id === teamId);
  if (team) {
    team.current_step = 0;
    team.points = 0;
    team.completed_at = null;
    team.photo_skips_used = 0;
    team.boat_question_unlocked = false;
    team.claimed_boat_question = null;
    team.approved_photo_targets = [];
    store.scans = store.scans.filter((s) => s.team_id !== teamId);
    store.photoSubmissions = (store.photoSubmissions || []).filter((s) => s.team_id !== teamId);
    writeLocalStore(store);
  }
  return true;
}

export async function resetAllTeams() {
  initInitialStore();
  return true;
}

export async function advanceTeamToStep(teamId, targetStep) {
  if (typeof targetStep !== 'number' || targetStep < 0 || targetStep > 7) return null;
  const team = await getTeamById(teamId);
  if (!team) return null;

  if (targetStep <= (team.current_step || 0)) {
    return team;
  }

  const now = new Date().toISOString();
  const isFinished = targetStep >= 7;
  const nextPoints = targetStep * 150;

  if (isSupabaseConfigured) {
    await supabase
      .from('teams')
      .update({
        current_step: targetStep,
        points: nextPoints,
        completed_at: isFinished ? now : null,
        updated_at: now
      })
      .eq('id', team.id);
  } else {
    const store = readLocalStore();
    const stTeam = store.teams.find((t) => t.id === teamId);
    if (stTeam) {
      stTeam.current_step = targetStep;
      stTeam.points = nextPoints;
      stTeam.completed_at = isFinished ? now : null;
      stTeam.updated_at = now;
      stTeam.marshal_feedback = null;
    }
    writeLocalStore(store);
  }

  team.current_step = targetStep;
  team.points = nextPoints;
  if (isFinished) team.completed_at = now;
  team.updated_at = now;
  return team;
}
