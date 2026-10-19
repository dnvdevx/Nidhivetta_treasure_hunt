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
import {
  configureStore,
  readStore,
  updateStore,
  savePhoto,
  loadPhoto,
  deletePhotos,
  storageBackend
} from './store.js';

export { storageBackend, loadPhoto };

export const JWT_SECRET = process.env.JWT_SECRET || 'thanima-nidhivetta-secret-key-2026';

const STORE_VERSION = 10;
const POINTS_PER_TASK = 150;
const MAX_PHOTO_DATA_URL_LENGTH = 4 * 1024 * 1024;

// Error carrying an HTTP status so routes can answer 400/403/404/409 instead of 500.
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const clone = (value) => JSON.parse(JSON.stringify(value));

function createInitialStore() {
  return {
    teams: clone(INITIAL_10_TEAMS),
    scans: [],
    photoSubmissions: [],
    boatQuestions: clone(BOAT_GAME_QUESTIONS),
    startingStations: clone(STARTING_STATIONS),
    version: STORE_VERSION
  };
}

function normalizeStore(store) {
  if (!store || !Array.isArray(store.teams) || store.teams.length !== 10) {
    console.log('Migrating store...');
    return { store: createInitialStore(), modified: true };
  }
  let modified = false;
  if (!store.boatQuestions || store.boatQuestions.length !== 10 || !store.boatQuestions[0].questionCode) {
    store.boatQuestions = clone(BOAT_GAME_QUESTIONS);
    modified = true;
  }
  if (!store.startingStations || store.startingStations.length !== 5) {
    store.startingStations = clone(STARTING_STATIONS);
    modified = true;
  }
  if (!Array.isArray(store.scans)) {
    store.scans = [];
    modified = true;
  }
  if (!Array.isArray(store.photoSubmissions)) {
    store.photoSubmissions = [];
    modified = true;
  }
  if (store.version !== STORE_VERSION) {
    store.version = STORE_VERSION;
    modified = true;
  }
  return { store, modified };
}

configureStore({ createInitialStore, normalizeStore });

// ---------- Helpers ----------

function findTeam(store, teamId) {
  return store.teams.find((t) => t.id === teamId) || null;
}

function scheduleFor(team) {
  return TEAM_GAME_SCHEDULE[team.team_number] || TEAM_GAME_SCHEDULE[1];
}

// Internal game name the team is currently on, or null once finished.
export function currentGameOf(team) {
  return scheduleFor(team)[team.current_step || 0] || null;
}

// Team object safe to send to players / volunteers (no passcode).
export function publicTeam(team) {
  if (!team) return team;
  const { passcode, ...rest } = team;
  return rest;
}

export function signPhotoId(id) {
  return crypto.createHmac('sha256', JWT_SECRET).update(`photo:${id}`).digest('hex').slice(0, 32);
}

export function verifyPhotoSig(id, sig) {
  const expected = Buffer.from(signPhotoId(id));
  const given = Buffer.from(String(sig || ''));
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

// Replace stored image references with a signed URL so the big base64 never travels in polls.
function presentSubmission(s) {
  const { image_url, has_image, ...rest } = s;
  let url = null;
  if (has_image) {
    url = `/api/photos/${encodeURIComponent(s.id)}?sig=${signPhotoId(s.id)}`;
  } else if (typeof image_url === 'string' && image_url) {
    url = image_url; // legacy inline image from an older store
  }
  return { ...rest, image_url: url };
}

function isFirstPlace(store, team) {
  if (!team.completed_at) return false;
  const myTime = new Date(team.completed_at).getTime();
  return !store.teams.some((t) => {
    if (t.id === team.id || !t.completed_at) return false;
    const otherTime = new Date(t.completed_at).getTime();
    if (otherTime < myTime) return true;
    if (otherTime === myTime) return (t.team_number || 0) < (team.team_number || 0);
    return false;
  });
}

function approvedTargetIndices(store, team) {
  return store.photoSubmissions
    .filter((s) => s.team_id === team.id && s.status === 'approved')
    .map((s) => Number(s.target_index));
}

// Return current mystery task for team (STRICTLY hiding internal game names from player!)
export function getTeamCurrentTask(team, store) {
  const step = team.current_step || 0;
  const schedule = scheduleFor(team);

  if (step >= schedule.length) {
    const firstPlace = isFirstPlace(store, team);
    return {
      step,
      finished: true,
      letter: 'M',
      isFirstPlace: firstPlace,
      clueTitle: firstPlace ? '🏆 VICTORY & GRAND PRIZE!' : '✨ KERALAM COMPLETE!',
      riddle: firstPlace
        ? 'You saved Rambo first! You are the 1st Place Champions of Nidhiveta. The coordinators will hand over your Grand Prize.'
        : 'You saved Rambo and conquered all 7 trials of Nidhiveta. Well played!',
      finalClueImage: GAME_DETAILS['Final Game'].clueImage,
      points: 150
    };
  }

  const gameName = schedule[step];
  const details = GAME_DETAILS[gameName] || {};
  const isPhotoGame = Boolean(details.isPhotoGame);
  const isBoatGame = Boolean(details.isBoatGame);

  // crypticHint / mapUrl name the real location, so they are never sent to players:
  // teams must solve the riddle to find each station.
  const baseTask = {
    step,
    finished: false,
    letter: LETTERS[step],
    gameName: details.displayName || gameName,
    internalName: gameName,
    displayName: details.displayName || gameName,
    clueTitle: details.clueTitle || `Mystery Challenge #${step + 1}`,
    riddle: details.riddle || 'Investigate your campus surroundings to decipher this clue.',
    points: details.points || 150,
    rules: details.rules || null,
    clueImage: details.clueImage || null,
    isPhotoGame,
    isBoatGame
  };

  // The secret "M" clue map is only handed out once the 6th challenge is done
  if (step >= 6) {
    baseTask.finalClueImage = GAME_DETAILS['Final Game'].clueImage;
  }

  if (isBoatGame) {
    const questions = store.boatQuestions || BOAT_GAME_QUESTIONS;
    const claimedQ = team.claimed_boat_question
      ? questions.find((q) => q.questionBoatNumber === team.claimed_boat_question)
      : null;
    const isUnlocked = Boolean(claimedQ && team.boat_question_unlocked);

    baseTask.boatLocations = store.boatLocations || BOAT_GAME_LOCATIONS;
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

  // Jigsaw: team-specific Malayalam letter riddle. The decoded envelope number is the answer,
  // so it is deliberately NOT sent to players.
  if (gameName === 'Numbers on Trees' || gameName === 'Jigsaw') {
    const treeInfo = TEAM_TREE_NUMBERS[team.team_number];
    if (treeInfo) {
      baseTask.isNumbersOnTrees = true;
      baseTask.treeLetter = treeInfo.letter;
      baseTask.treeRiddle = treeInfo.riddle;
      // sittingArea is where the envelope is: coordinators only, never sent to players
    }
  }

  // Photo Game: team-specific 3 sequential campus location targets
  if (isPhotoGame) {
    const allTargets = TEAM_PHOTO_TARGETS[team.team_number] || TEAM_PHOTO_TARGETS[1];
    const teamSubmissions = store.photoSubmissions
      .filter((p) => p.team_id === team.id)
      .map(presentSubmission);

    const approvedCount = teamSubmissions.filter((s) => s.status === 'approved').length;
    // Show targets one after the other, but always keep any target with activity visible.
    const maxTouchedIndex = teamSubmissions.reduce(
      (max, s) => Math.max(max, Number(s.target_index) || 0),
      -1
    );
    const visibleCount = Math.min(Math.max(approvedCount + 1, maxTouchedIndex + 1), allTargets.length);
    // Exclude locationName so participants cannot cheat via devtools
    const sanitize = (t) => ({
      index: t.index,
      title: t.title,
      clueImage: t.clueImage,
      description: t.description
    });

    baseTask.team_number = team.team_number;
    baseTask.teamNumber = team.team_number;
    baseTask.photoGameState = {
      targets: allTargets.slice(0, visibleCount).map(sanitize),
      allTargets: allTargets.map(sanitize),
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

function withTaskState(store, team, result = {}) {
  return { ...result, team: publicTeam(team), currentTask: getTeamCurrentTask(team, store) };
}

// Advance the team one step inside an open updateStore transaction.
function completeTaskInStore(store, team, { participantId = null, participantName = 'Marshal', method = 'QR', scannedCode = '' }) {
  const schedule = scheduleFor(team);
  const currentStep = team.current_step || 0;

  if (currentStep >= schedule.length) {
    return {
      finished: true,
      message: 'Your team has already conquered all tasks of KERALAM! Congratulations!'
    };
  }

  const nextStep = currentStep + 1;
  const isFinished = nextStep >= schedule.length;
  const now = new Date().toISOString();

  team.current_step = nextStep;
  team.points = (team.points || 0) + POINTS_PER_TASK;
  // Immutable completion timestamp: preserve earliest recorded completion time
  team.completed_at = team.completed_at || (isFinished ? now : null);
  team.updated_at = now;
  team.marshal_feedback = null;

  store.scans.push({
    id: crypto.randomUUID(),
    team_id: team.id,
    participant_id: participantId,
    participant_name: participantName,
    step: currentStep,
    scanned_code: scannedCode || `APPROVED_BY_${method}`,
    scanned_at: now
  });

  let message = `✨ Splendid! Challenge solved! You unlocked Letter "${LETTERS[currentStep]}"!`;
  if (isFinished) {
    message = isFirstPlace(store, team)
      ? '🏆 1st PLACE CHAMPIONS! You saved Rambo first and assembled all 7 letters of KERALAM! The coordinators will hand over your Grand Prize!'
      : '✨ KERALAM COMPLETE! You saved Rambo and assembled K-E-R-A-L-A-M! Well played!';
  } else if (nextStep >= 6) {
    message = '🔥 MYSTERY UNLOCKED! You unlocked Letter "A"! The secret 7th letter "M" has now materialized on your board!';
  }

  return {
    success: true,
    message,
    letterUnlocked: LETTERS[currentStep],
    revealedM: nextStep >= 6,
    finished: isFinished
  };
}

// ---------- Reads ----------

export async function getTeamState(teamId) {
  const store = await readStore();
  const team = findTeam(store, teamId);
  if (!team) return null;
  return { team: publicTeam(team), currentTask: getTeamCurrentTask(team, store) };
}

export async function getAllTeams({ includePasscodes = false } = {}) {
  const store = await readStore();
  return store.teams.map((t) => {
    const schedule = scheduleFor(t);
    const step = t.current_step || 0;
    const isFinished = Boolean(t.completed_at || step >= schedule.length);
    const teamPhotos = store.photoSubmissions.filter((p) => p.team_id === t.id).map(presentSubmission);

    let currentGame = 'Starting Station';
    if (isFinished) currentGame = 'Completed 🏆';
    else if (step > 0) currentGame = schedule[step];

    const team = includePasscodes ? t : publicTeam(t);
    return {
      ...team,
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

export async function getStartingStations() {
  const store = await readStore();
  return store.startingStations;
}

export async function getBoatLocations() {
  const store = await readStore();
  return store.boatLocations || BOAT_GAME_LOCATIONS;
}

export async function getBoatQuestions() {
  const store = await readStore();
  const locations = store.boatLocations || BOAT_GAME_LOCATIONS;

  return store.boatQuestions.map((q) => {
    const claimingTeam = store.teams.find((t) => t.claimed_boat_question === q.questionBoatNumber);
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

export async function getAllPhotoSubmissions() {
  const store = await readStore();
  return store.photoSubmissions.map(presentSubmission);
}

export async function getLeaderboard() {
  const store = await readStore();
  const sorted = [...store.teams].sort((a, b) => {
    // 1. Any team that has completed the hunt always comes before any team that has not completed
    const aDone = Boolean(a.completed_at || (a.current_step || 0) >= 7);
    const bDone = Boolean(b.completed_at || (b.current_step || 0) >= 7);

    if (aDone && bDone) {
      // Both finished: strictly ordered by earliest completed_at timestamp!
      const aTime = a.completed_at ? new Date(a.completed_at).getTime() : Infinity;
      const bTime = b.completed_at ? new Date(b.completed_at).getTime() : Infinity;
      if (aTime !== bTime) return aTime - bTime;
      return (a.team_number || 0) - (b.team_number || 0);
    }
    if (aDone) return -1;
    if (bDone) return 1;

    // 2. For teams still playing: higher step first
    if ((b.current_step || 0) !== (a.current_step || 0)) {
      return (b.current_step || 0) - (a.current_step || 0);
    }
    // 3. Higher points next
    if ((b.points || 0) !== (a.points || 0)) {
      return (b.points || 0) - (a.points || 0);
    }
    // 4. Earlier updated_at next
    if (a.updated_at && b.updated_at) {
      const diff = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      if (diff !== 0) return diff;
    }
    return (a.team_number || 0) - (b.team_number || 0);
  });

  return sorted.map((t, idx) => ({
    rank: idx + 1,
    id: t.id,
    team_number: t.team_number,
    name: t.name,
    current_step: t.current_step || 0,
    points: t.points || 0,
    completed_at: t.completed_at,
    isFinished: Boolean(t.completed_at || (t.current_step || 0) >= 7)
  }));
}

// ---------- Player actions ----------

export async function verifyEntryScan({ stationQr, passcode, regNo, memberId }) {
  const cleanStationQr = (stationQr || '').trim();
  const cleanPasscode = (passcode || '').trim().toUpperCase().replace(/\s+/g, '');

  return updateStore((store) => {
    const station = store.startingStations.find(
      (s) => s.qrCode === cleanStationQr || s.stationId === cleanStationQr
    );
    if (!station) {
      throw new HttpError(400, 'Invalid Starting QR Code. Please scan an authentic Thanima Starting Station QR.');
    }

    const team = store.teams.find(
      (t) => (t.passcode || '').toUpperCase().replace(/\s+/g, '') === cleanPasscode
    );
    if (!team) {
      throw new HttpError(400, 'Invalid Team Passcode. Please enter the authentic passcode given by the organizers.');
    }

    if (!station.allowedTeamNumbers.includes(team.team_number)) {
      throw new HttpError(
        400,
        `Access Denied! This starting place is NOT assigned to Team ${team.team_number} (${team.name}). Look for your team's clue and find the designated location!`
      );
    }

    const members = team.members || [];
    let member = memberId ? members.find((m) => m.id === memberId) : null;
    if (!member && regNo) {
      const cleanReg = regNo.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      member = members.find((m) => {
        const mReg = (m.reg_no || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        return (
          mReg === cleanReg ||
          (mReg.startsWith(cleanReg) && cleanReg.length >= 7) ||
          (cleanReg.startsWith(mReg) && mReg.length >= 7)
        );
      });
    }
    if (!member) member = members[0];

    if ((team.current_step || 0) === 0) {
      const now = new Date().toISOString();
      team.current_step = 1;
      team.points = (team.points || 0) + POINTS_PER_TASK;
      team.updated_at = now;
      store.scans.push({
        id: crypto.randomUUID(),
        team_id: team.id,
        participant_id: member ? member.id : null,
        participant_name: member ? member.name : 'Teammate',
        step: 0,
        scanned_code: cleanStationQr,
        scanned_at: now
      });
    }

    return { team: publicTeam(team), member, currentTask: getTeamCurrentTask(team, store) };
  });
}

// QR scan verification with enigmatic feedback
export async function advanceTeamTaskByQR({ teamId, participantId, participantName, scannedCode }) {
  const cleanCode = (scannedCode || '').trim();

  return updateStore((store) => {
    const team = findTeam(store, teamId);
    if (!team) throw new HttpError(404, 'Team not found');

    const schedule = scheduleFor(team);
    const currentStep = team.current_step || 0;
    if (currentStep >= schedule.length) {
      return withTaskState(store, team, {
        finished: true,
        message: 'Your team has already conquered all tasks of KERALAM! Congratulations!'
      });
    }

    const currentGameName = schedule[currentStep];
    if (currentGameName === 'Boat Game') {
      return verifyBoatAnswerInStore(store, team, { code: cleanCode, participantName, participantId });
    }

    if (cleanCode === GAME_DETAILS[currentGameName]?.qrCode) {
      const result = completeTaskInStore(store, team, {
        participantId,
        participantName,
        method: 'QR',
        scannedCode: cleanCode
      });
      return withTaskState(store, team, result);
    }

    // Check if belonging to past or future without revealing the game title
    if (schedule.slice(0, currentStep).some((g) => GAME_DETAILS[g]?.qrCode === cleanCode)) {
      throw new HttpError(400, 'Your team has already conquered this station! Ponder your current riddle to find the next location.');
    }
    if (schedule.slice(currentStep + 1).some((g) => GAME_DETAILS[g]?.qrCode === cleanCode)) {
      throw new HttpError(400, 'Station discovered out of sequence! This station belongs to a different riddle. Solve your current clue first!');
    }
    throw new HttpError(400, 'Invalid station QR code. Please scan the official station code for your current challenge.');
  });
}

// BOAT GAME: Step 1 - Claim and unlock a Question Boat by entering its 6-character code.
// First team to enter the code claims that question. Runs under the store lock, so two teams
// can never claim the same boat at once.
export async function unlockBoatQuestion({ teamId, questionCode }) {
  const clean = (questionCode || '').trim().toUpperCase();
  if (!clean) throw new HttpError(400, 'Please enter the 6-character Question Boat code.');

  return updateStore((store) => {
    const team = findTeam(store, teamId);
    if (!team) throw new HttpError(404, 'Team not found');
    if (currentGameOf(team) !== 'Boat Game') {
      throw new HttpError(400, 'Your team is not currently on the Boat Challenge.');
    }

    const questions = store.boatQuestions;
    const matchedQ = questions.find((q) => (q.questionCode || '').toUpperCase() === clean);

    if (!matchedQ) {
      if (questions.some((q) => (q.answerCode || q.code || '').toUpperCase() === clean)) {
        throw new HttpError(400, 'That is an Answer Boat code! First, locate any available Question Boat (Boats 1 to 10) and enter its code to claim your question.');
      }
      throw new HttpError(400, 'Invalid Question Boat code. Locate any unoccupied Question Boat (Boats 1 to 10) along the waterside.');
    }

    const boatQuestion = {
      questionBoatNumber: matchedQ.questionBoatNumber,
      questionCode: matchedQ.questionCode,
      question: matchedQ.question,
      isQuestionUnlocked: true
    };

    if (team.claimed_boat_question) {
      if (team.claimed_boat_question === matchedQ.questionBoatNumber) {
        return {
          success: true,
          message: `✓ Question Boat #${matchedQ.questionBoatNumber} is unlocked for your team!`,
          boatQuestion
        };
      }
      throw new HttpError(400, `Your team has already claimed Question Boat #${team.claimed_boat_question}! You must solve that question.`);
    }

    const claimingTeam = store.teams.find(
      (t) => t.id !== team.id && t.claimed_boat_question === matchedQ.questionBoatNumber
    );
    if (claimingTeam) {
      throw new HttpError(400, `⚠️ Question Boat #${matchedQ.questionBoatNumber} has already been claimed by ${claimingTeam.name}! Please locate another available Question Boat.`);
    }

    team.claimed_boat_question = matchedQ.questionBoatNumber;
    team.boat_question_unlocked = true;

    return {
      success: true,
      message: `🎉 Question Boat #${matchedQ.questionBoatNumber} claimed and unlocked! Now find the matching Answer Boat.`,
      boatQuestion
    };
  });
}

function verifyBoatAnswerInStore(store, team, { code, participantName, participantId }) {
  const clean = (code || '').trim().toUpperCase();
  if (!clean) throw new HttpError(400, 'Please enter the 6-character alphanumeric boat answer code.');
  if (currentGameOf(team) !== 'Boat Game') {
    throw new HttpError(400, 'Your team is not currently on the Boat Challenge.');
  }

  const questions = store.boatQuestions;
  const claimedQ = team.claimed_boat_question
    ? questions.find((q) => q.questionBoatNumber === Number(team.claimed_boat_question))
    : null;
  const anyQuestionBoat = questions.find((q) => (q.questionCode || '').toUpperCase() === clean);

  if (!claimedQ) {
    if (anyQuestionBoat) {
      throw new HttpError(400, `That is the code for Question Boat #${anyQuestionBoat.questionBoatNumber}! Please unlock this question boat in Step 1 first.`);
    }
    throw new HttpError(400, 'First find a Question Boat and enter its code in Step 1 to claim your question.');
  }

  if (clean === (claimedQ.answerCode || claimedQ.code || '').toUpperCase()) {
    const result = completeTaskInStore(store, team, {
      participantId,
      participantName,
      method: 'BOAT_GAME_CODE',
      scannedCode: clean
    });
    return withTaskState(store, team, result);
  }

  if (clean === (claimedQ.questionCode || '').toUpperCase()) {
    throw new HttpError(400, 'You entered the Question Boat code again! Search the fleet for the vessel displaying the ANSWER to your question.');
  }
  if (anyQuestionBoat) {
    throw new HttpError(400, `That is the code for Question Boat #${anyQuestionBoat.questionBoatNumber}! You must search for the vessel displaying the ANSWER to your question.`);
  }
  if (questions.some((q) => (q.answerCode || q.code || '').toUpperCase() === clean)) {
    throw new HttpError(400, `Incorrect answer vessel! That vessel displays the answer to a different question. Find the vessel answering your Question Boat #${claimedQ.questionBoatNumber}.`);
  }
  throw new HttpError(400, 'Incorrect answer code! Search the boats across the campus harbors for the vessel displaying your correct answer.');
}

// BOAT GAME: Step 2 - Verify answer boat code against the team's claimed question
export async function verifyBoatCode({ teamId, code, participantName = 'Teammate', participantId = null }) {
  return updateStore((store) => {
    const team = findTeam(store, teamId);
    if (!team) throw new HttpError(404, 'Team not found');
    return verifyBoatAnswerInStore(store, team, { code, participantName, participantId });
  });
}

// PHOTO GAME: Submit a photo for a specific target index
export async function submitPhotoTarget({ teamId, targetIndex, imageUrl, participantName }) {
  if (typeof imageUrl !== 'string' || !imageUrl.startsWith('data:image/')) {
    throw new HttpError(400, 'Please upload a valid photo.');
  }
  if (imageUrl.length > MAX_PHOTO_DATA_URL_LENGTH) {
    throw new HttpError(400, 'Photo is too large. Please try again.');
  }

  const targetIdx = Number(targetIndex);
  const id = crypto.randomUUID();
  await savePhoto(id, imageUrl);

  let result;
  try {
    result = await updateStore((store) => {
      const team = findTeam(store, teamId);
      if (!team) throw new HttpError(404, 'Team not found');
      if (currentGameOf(team) !== 'Photo Game') {
        throw new HttpError(400, 'Your team is not currently on the Photo Challenge.');
      }

      const teamTargets = TEAM_PHOTO_TARGETS[team.team_number] || TEAM_PHOTO_TARGETS[1];
      const target = teamTargets[targetIdx] || PHOTO_GAME_TARGETS[targetIdx];
      if (!target) throw new HttpError(400, 'Invalid photo target index');

      const existing = store.photoSubmissions.filter(
        (s) => s.team_id === team.id && Number(s.target_index) === targetIdx
      );
      if (existing.some((s) => s.status === 'approved')) {
        throw new HttpError(400, 'This location photo is already approved. Move on to the next one!');
      }

      const now = new Date().toISOString();
      const submission = {
        id,
        team_id: team.id,
        team_number: team.team_number,
        team_name: team.name,
        target_index: targetIdx,
        target_title: target.title,
        location_name: target.locationName || target.title,
        clue_image: target.clueImage || null,
        has_image: true,
        participant_name: participantName || 'Teammate',
        status: 'pending', // pending, approved, rejected
        comment: '',
        submitted_at: now,
        reviewed_at: null
      };

      // Replace any existing submission for this team and target
      store.photoSubmissions = store.photoSubmissions.filter((s) => !existing.includes(s));
      store.photoSubmissions.push(submission);
      team.approved_photo_targets = approvedTargetIndices(store, team);

      return {
        replacedIds: existing.filter((s) => s.has_image).map((s) => s.id),
        submission: presentSubmission(submission),
        photoGameState: getTeamCurrentTask(team, store).photoGameState
      };
    });
  } catch (err) {
    await deletePhotos([id]);
    throw err;
  }

  await deletePhotos(result.replacedIds);
  return { submission: result.submission, photoGameState: result.photoGameState };
}

// PHOTO GAME: Skip an unsolved photo target to unlock the next one (max 2 skips)
export async function skipPhotoTarget({ teamId }) {
  return updateStore((store) => {
    const team = findTeam(store, teamId);
    if (!team) throw new HttpError(404, 'Team not found');

    const currentSkips = team.photo_skips_used || 0;
    if (currentSkips >= 2) {
      throw new HttpError(400, 'Maximum of 2 skips allowed for the Photo Challenge.');
    }
    team.photo_skips_used = currentSkips + 1;

    return {
      success: true,
      message: `Target skipped! New photo target #${3 + team.photo_skips_used} unlocked.`,
      photoGameState: getTeamCurrentTask(team, store).photoGameState
    };
  });
}

// ---------- Marshal / organizer actions ----------

// allowedGames: null for master organizers, otherwise the schedule names of the volunteer's station.
function assertTeamAtStation(team, allowedGames) {
  if (!allowedGames) return;
  const game = currentGameOf(team);
  if (!game || !allowedGames.includes(game)) {
    throw new HttpError(403, `${team.name} is not at your station right now.`);
  }
}

// Marshal one-click approval. expectedStep guards against double approvals (two volunteers
// tapping at once, or a retried request) advancing a team past a stage they never played.
export async function completeTeamTask({ teamId, participantName = 'Marshal', method = 'MARSHAL', expectedStep, allowedGames = null }) {
  return updateStore((store) => {
    const team = findTeam(store, teamId);
    if (!team) throw new HttpError(404, 'Team not found');

    if (typeof expectedStep === 'number' && (team.current_step || 0) !== expectedStep) {
      throw new HttpError(409, `${team.name} has already moved on (now on step ${team.current_step || 0}). Nothing was changed.`);
    }
    assertTeamAtStation(team, allowedGames);

    const result = completeTaskInStore(store, team, { participantName, method });
    return withTaskState(store, team, result);
  });
}

// Station Volunteer / Marshal: Deny team or request retry with custom feedback
export async function denyTeamTask({ teamId, marshalName = 'Station Volunteer', reason, allowedGames = null }) {
  return updateStore((store) => {
    const team = findTeam(store, teamId);
    if (!team) throw new HttpError(404, 'Team not found');
    assertTeamAtStation(team, allowedGames);

    team.marshal_feedback = {
      gameName: currentGameOf(team) || 'Current Station',
      reason: reason || 'Coordinator requested a retry. Please review the rules, correct your attempt, and show the coordinator again!',
      deniedAt: new Date().toISOString(),
      marshalName
    };

    return {
      success: true,
      message: `Team ${team.name} marked as Retry. Feedback sent to team screen.`,
      team: publicTeam(team),
      feedback: team.marshal_feedback
    };
  });
}

// PHOTO GAME: Marshal reviews and approves/rejects a submission
export async function reviewPhotoSubmission({ submissionId, status, comment, teamId, targetIndex }) {
  if (status !== 'approved' && status !== 'rejected') {
    throw new HttpError(400, 'Status must be "approved" or "rejected".');
  }

  return updateStore((store) => {
    let submission = store.photoSubmissions.find((s) => s.id === submissionId);
    if (!submission && teamId && targetIndex !== undefined) {
      submission = store.photoSubmissions.find(
        (s) => s.team_id === teamId && Number(s.target_index) === Number(targetIndex)
      );
    }
    if (!submission) {
      throw new HttpError(404, 'Photo submission not found. Ask the team to upload the photo again.');
    }

    const team = findTeam(store, submission.team_id);
    if (!team) throw new HttpError(404, 'Team not found');

    submission.status = status;
    submission.comment = comment || (status === 'rejected' ? 'Coordinator requested a retake. Please capture a clearer photo of the entire location.' : '');
    submission.reviewed_at = new Date().toISOString();
    team.approved_photo_targets = approvedTargetIndices(store, team);

    let taskCompleted = false;
    let completeResult = null;
    if (status === 'approved' && team.approved_photo_targets.length >= 3 && currentGameOf(team) === 'Photo Game') {
      completeResult = withTaskState(
        store,
        team,
        completeTaskInStore(store, team, {
          participantName: 'Photo Game Marshal',
          method: 'PHOTO_GAME_MARSHAL_APPROVAL'
        })
      );
      taskCompleted = true;
    }

    return { submission: presentSubmission(submission), taskCompleted, completeResult };
  });
}

// Admin: Release a team's claimed question boat (by boat number or team id)
export async function clearBoatClaim(teamIdOrBoatNumber) {
  return updateStore((store) => {
    const affectedTeam =
      typeof teamIdOrBoatNumber === 'number'
        ? store.teams.find((t) => t.claimed_boat_question === teamIdOrBoatNumber)
        : findTeam(store, teamIdOrBoatNumber);

    if (affectedTeam) {
      affectedTeam.claimed_boat_question = null;
      affectedTeam.boat_question_unlocked = false;
    }
    return publicTeam(affectedTeam) || null;
  });
}

export async function updateBoatQuestion(teamNumber, { question, answer, questionCode, answerCode, code }) {
  return updateStore((store) => {
    const bq = store.boatQuestions.find((q) => q.teamNumber === teamNumber);
    if (!bq) throw new HttpError(404, `Boat question for team ${teamNumber} not found`);
    if (question) bq.question = question;
    if (answer) bq.answer = answer;
    if (questionCode) bq.questionCode = questionCode.toUpperCase().trim();
    const ansCode = (answerCode || code || '').toUpperCase().trim();
    if (ansCode) {
      bq.answerCode = ansCode;
      bq.code = ansCode;
    }
    return bq;
  });
}

export async function updateTeamRoster(teamId, { name, passcode, members }) {
  return updateStore((store) => {
    const team = findTeam(store, teamId);
    if (!team) throw new HttpError(404, 'Team not found');
    if (name) team.name = name;
    if (passcode) team.passcode = passcode;
    if (Array.isArray(members)) team.members = members;
    return team;
  });
}

// Update starting station configuration (allowed teams, hint, qrCode)
export async function updateStartingStation(stationId, { allowedTeamNumbers, locationHint, qrCode }) {
  return updateStore((store) => {
    const st = store.startingStations.find((s) => s.stationId === stationId);
    if (!st) throw new HttpError(404, `Station ${stationId} not found`);

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
    return st;
  });
}

function resetTeamProgress(team, now) {
  team.current_step = 0;
  team.points = 0;
  team.completed_at = null;
  team.photo_skips_used = 0;
  team.boat_question_unlocked = false;
  team.claimed_boat_question = null;
  team.approved_photo_targets = [];
  team.marshal_feedback = null;
  team.reset_at = now;
  team.updated_at = now;
}

export async function resetTeam(teamId) {
  const photoIds = await updateStore((store) => {
    const team = store.teams.find((t) => t.id === teamId || t.team_number === Number(teamId));
    if (!team) throw new HttpError(404, 'Team not found');

    resetTeamProgress(team, new Date().toISOString());
    const removed = store.photoSubmissions.filter((s) => s.team_id === team.id);
    store.scans = store.scans.filter((s) => s.team_id !== team.id);
    store.photoSubmissions = store.photoSubmissions.filter((s) => s.team_id !== team.id);
    return removed.filter((s) => s.has_image).map((s) => s.id);
  });
  await deletePhotos(photoIds);
  return true;
}

// Resets progress only: team names, passcodes, rosters, stations and boat questions are kept.
export async function resetAllTeams() {
  const photoIds = await updateStore((store) => {
    const now = new Date().toISOString();
    store.teams.forEach((t) => resetTeamProgress(t, now));
    const removed = store.photoSubmissions;
    store.scans = [];
    store.photoSubmissions = [];
    store.last_global_reset = now;
    return removed.filter((s) => s.has_image).map((s) => s.id);
  });
  await deletePhotos(photoIds);
  return true;
}
