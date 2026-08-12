import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  addDoc,
  deleteDoc,
  updateDoc,
  getDocs,
  query,
  orderBy,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { Team, Round, ResultItem, SettingsConfig, CalculatedTeamScore, RoundBreakdown } from '../types';
import { DEFAULT_TEAMS, DEFAULT_ROUNDS, DEFAULT_SETTINGS } from './defaultData';

// Collection References
const teamsRef = collection(db, 'teams');
const roundsRef = collection(db, 'rounds');
const resultsRef = collection(db, 'results');
const settingsDocRef = doc(db, 'settings', 'config');

// ====== REALTIME LISTENERS ======

export function subscribeTeams(callback: (teams: Team[]) => void) {
  return onSnapshot(teamsRef, (snapshot) => {
    const list: Team[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        id: docSnap.id,
        name: data.name || 'Unnamed Team',
        logoUrl: data.logoUrl || '',
        order: data.order ?? 999,
        createdAt: data.createdAt || ''
      } as Team);
    });
    list.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    console.log('[Firestore] Teams updated:', list.length, 'teams');
    callback(list);
  }, (err) => {
    console.error('[Firestore] Teams snapshot error:', err);
    callback([]);
  });
}

export function subscribeRounds(callback: (rounds: Round[]) => void) {
  return onSnapshot(roundsRef, (snapshot) => {
    const list: Round[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        id: docSnap.id,
        label: data.label || 'Round',
        order: data.order ?? 999,
        createdAt: data.createdAt || ''
      } as Round);
    });
    list.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    console.log('[Firestore] Rounds updated:', list.length, 'rounds');
    callback(list);
  }, (err) => {
    console.error('[Firestore] Rounds snapshot error:', err);
    callback([]);
  });
}

export function subscribeResults(callback: (results: ResultItem[]) => void) {
  return onSnapshot(resultsRef, (snapshot) => {
    const list: ResultItem[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as ResultItem);
    });
    console.log('[Firestore] Results updated:', list.length, 'results');
    callback(list);
  }, (err) => {
    console.error('[Firestore] Results snapshot error:', err);
    callback([]);
  });
}

export function subscribeSettings(callback: (settings: SettingsConfig) => void) {
  return onSnapshot(settingsDocRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      const merged: SettingsConfig = {
        pointPerKill: data.pointPerKill ?? DEFAULT_SETTINGS.pointPerKill,
        booyahBonus: data.booyahBonus ?? DEFAULT_SETTINGS.booyahBonus,
        placementPoints: data.placementPoints || DEFAULT_SETTINGS.placementPoints,
        tournamentName: data.tournamentName || DEFAULT_SETTINGS.tournamentName,
        bannerUrl: data.bannerUrl || DEFAULT_SETTINGS.bannerUrl,
        currentRoundId: data.currentRoundId || '',
        currentRoundLabel: data.currentRoundLabel || '',
        status: data.status || 'waiting',
        isBroadcasting: data.isBroadcasting ?? false,
      };
      console.log('[Firestore] Settings updated');
      callback(merged);
    } else {
      console.log('[Firestore] No settings doc yet, using defaults');
      callback(DEFAULT_SETTINGS);
    }
  }, (err) => {
    console.error('[Firestore] Settings snapshot error:', err);
    callback(DEFAULT_SETTINGS);
  });
}

// ====== SEED FUNCTION (only for initial setup) ======

export async function seedInitialDataIfNeeded() {
  try {
    const teamsSnap = await getDocs(teamsRef);
    if (teamsSnap.empty) {
      console.log('[Seed] Creating default teams...');
      const batch = writeBatch(db);
      DEFAULT_TEAMS.forEach((team) => {
        const newRef = doc(teamsRef);
        batch.set(newRef, team);
      });
      await batch.commit();
      console.log('[Seed] Teams created successfully');
    }

    const roundsSnap = await getDocs(roundsRef);
    if (roundsSnap.empty) {
      console.log('[Seed] Creating default rounds...');
      const batch = writeBatch(db);
      DEFAULT_ROUNDS.forEach((round) => {
        const newRef = doc(roundsRef);
        batch.set(newRef, round);
      });
      await batch.commit();
      console.log('[Seed] Rounds created successfully');
    }

    const settingsSnap = await getDocs(collection(db, 'settings'));
    if (settingsSnap.empty) {
      console.log('[Seed] Creating default settings...');
      await setDoc(settingsDocRef, DEFAULT_SETTINGS);
      console.log('[Seed] Settings created successfully');
    }

    const resultsSnap = await getDocs(resultsRef);
    if (resultsSnap.empty) {
      await seedSampleResults();
    }
  } catch (err) {
    console.error('[Seed] Error seeding initial data:', err);
  }
}

// ====== SAMPLE DATA ======

export async function seedSampleResults() {
  try {
    const teamsSnap = await getDocs(query(teamsRef, orderBy('order', 'asc')));
    const roundsSnap = await getDocs(query(roundsRef, orderBy('order', 'asc')));

    if (teamsSnap.empty || roundsSnap.empty) {
      console.log('[Seed] No teams or rounds, skipping sample results');
      return;
    }

    const teamDocs = teamsSnap.docs;
    const roundDocs = roundsSnap.docs;

    const sampleMatchData: { [roundIndex: number]: { [teamIndex: number]: { kill: number; placement: number; booyah: boolean } } } = {
      0: {
        0: { kill: 12, placement: 1, booyah: true },
        1: { kill: 8, placement: 2, booyah: false },
        2: { kill: 5, placement: 3, booyah: false },
        3: { kill: 6, placement: 4, booyah: false },
        4: { kill: 4, placement: 5, booyah: false },
        5: { kill: 3, placement: 6, booyah: false },
        6: { kill: 2, placement: 7, booyah: false },
      },
      1: {
        1: { kill: 14, placement: 1, booyah: true },
        2: { kill: 9, placement: 2, booyah: false },
        0: { kill: 7, placement: 3, booyah: false },
        5: { kill: 6, placement: 4, booyah: false },
        3: { kill: 4, placement: 5, booyah: false },
        4: { kill: 2, placement: 6, booyah: false },
        6: { kill: 3, placement: 7, booyah: false },
      },
      2: {
        2: { kill: 11, placement: 1, booyah: true },
        0: { kill: 10, placement: 2, booyah: false },
        3: { kill: 7, placement: 3, booyah: false },
        1: { kill: 6, placement: 4, booyah: false },
        6: { kill: 5, placement: 5, booyah: false },
        4: { kill: 3, placement: 6, booyah: false },
        5: { kill: 2, placement: 7, booyah: false },
      },
      3: {
        3: { kill: 13, placement: 1, booyah: true },
        0: { kill: 9, placement: 2, booyah: false },
        1: { kill: 8, placement: 3, booyah: false },
        5: { kill: 7, placement: 4, booyah: false },
        2: { kill: 4, placement: 5, booyah: false },
        6: { kill: 3, placement: 6, booyah: false },
        4: { kill: 2, placement: 7, booyah: false },
      },
      4: {
        0: { kill: 15, placement: 1, booyah: true },
        1: { kill: 11, placement: 2, booyah: false },
        2: { kill: 8, placement: 3, booyah: false },
        4: { kill: 6, placement: 4, booyah: false },
        3: { kill: 5, placement: 5, booyah: false },
        5: { kill: 4, placement: 6, booyah: false },
        6: { kill: 2, placement: 7, booyah: false },
      }
    };

    const batch = writeBatch(db);
    roundDocs.forEach((rDoc, rIdx) => {
      teamDocs.forEach((tDoc, tIdx) => {
        const roundId = rDoc.id;
        const teamId = tDoc.id;
        const resId = `${roundId}_${teamId}`;
        const resRef = doc(db, 'results', resId);

        const matchR = sampleMatchData[rIdx];
        const teamRes = (matchR && matchR[tIdx]) ? matchR[tIdx] : { kill: 3, placement: tIdx + 1, booyah: tIdx === 0 };

        batch.set(resRef, {
          id: resId,
          roundId,
          teamId,
          kill: teamRes.kill,
          placement: teamRes.placement,
          booyah: teamRes.booyah,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      });
    });

    await batch.commit();
    console.log('[Seed] Sample results created successfully!');
  } catch (err) {
    console.error('[Seed] Error seeding sample results:', err);
  }
}

// ====== RESET DATABASE ======

export async function forceReseedDatabase() {
  const teamsSnap = await getDocs(teamsRef);
  const roundsSnap = await getDocs(roundsRef);
  const resultsSnap = await getDocs(resultsRef);

  const batch = writeBatch(db);
  teamsSnap.forEach((docSnap) => batch.delete(docSnap.ref));
  roundsSnap.forEach((docSnap) => batch.delete(docSnap.ref));
  resultsSnap.forEach((docSnap) => batch.delete(docSnap.ref));
  await batch.commit();

  const batch2 = writeBatch(db);
  DEFAULT_TEAMS.forEach((team) => {
    const newRef = doc(teamsRef);
    batch2.set(newRef, team);
  });
  DEFAULT_ROUNDS.forEach((round) => {
    const newRef = doc(roundsRef);
    batch2.set(newRef, round);
  });
  batch2.set(settingsDocRef, DEFAULT_SETTINGS);
  await batch2.commit();

  await seedSampleResults();
  console.log('[Seed] Database fully reseeded!');
}

// ====== LEADERBOARD CALCULATION ======

export function calculateLeaderboard(
  teams: Team[],
  rounds: Round[],
  results: ResultItem[],
  settings: SettingsConfig
): CalculatedTeamScore[] {
  const settingsConfig = settings || DEFAULT_SETTINGS;
  const pointPerKill = settingsConfig.pointPerKill ?? 1;
  const booyahBonus = settingsConfig.booyahBonus ?? 0;
  const placementMap = settingsConfig.placementPoints || {};

  const resultMap = new Map<string, ResultItem>();
  results.forEach((res) => {
    resultMap.set(`${res.roundId}_${res.teamId}`, res);
  });

  const scores: CalculatedTeamScore[] = teams.map((team) => {
    let totalPoints = 0;
    let totalKill = 0;
    let totalBooyah = 0;
    let totalPlacementPoints = 0;

    const roundBreakdown: RoundBreakdown[] = rounds.map((r) => {
      const resKey = `${r.id}_${team.id}`;
      const res = resultMap.get(resKey);

      const kill = res ? Math.max(0, res.kill || 0) : 0;
      const placement = res ? res.placement : null;
      const booyah = res ? Boolean(res.booyah) : false;

      const killPoints = kill * pointPerKill;
      const placementPoints = placement !== null ? (placementMap[String(placement)] ?? 0) : 0;
      const booyahPoints = booyah ? booyahBonus : 0;
      const roundTotalPoints = killPoints + placementPoints + booyahPoints;

      totalKill += kill;
      if (booyah) totalBooyah += 1;
      totalPlacementPoints += placementPoints;
      totalPoints += roundTotalPoints;

      return {
        roundId: r.id,
        roundLabel: r.label,
        kill,
        placement,
        booyah,
        killPoints,
        placementPoints,
        booyahPoints,
        roundTotalPoints
      };
    });

    return {
      team,
      totalPoints,
      totalKill,
      totalBooyah,
      totalPlacementPoints,
      rank: 0,
      roundBreakdown
    };
  });

  scores.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.totalKill !== a.totalKill) return b.totalKill - a.totalKill;
    return b.totalBooyah - a.totalBooyah;
  });

  scores.forEach((sc, idx) => {
    sc.rank = idx + 1;
  });

  return scores;
}

// ====== GET ROUND WINNER ======

export function getRoundWinner(
  roundId: string,
  teams: Team[],
  results: ResultItem[]
): { team: Team | null; result: ResultItem | null } {
  const roundResults = results.filter(r => r.roundId === roundId);
  if (roundResults.length === 0) return { team: null, result: null };

  const booyahResult = roundResults.find(r => r.booyah);
  if (booyahResult) {
    const team = teams.find(t => t.id === booyahResult.teamId);
    if (team) return { team, result: booyahResult };
  }

  const sorted = [...roundResults].sort((a, b) => {
    if (a.placement === null && b.placement === null) return 0;
    if (a.placement === null) return 1;
    if (b.placement === null) return -1;
    return a.placement - b.placement;
  });

  if (sorted.length > 0 && sorted[0].placement !== null) {
    const team = teams.find(t => t.id === sorted[0].teamId);
    return { team: team || null, result: sorted[0] };
  }

  return { team: null, result: null };
}

// ====== GET ROUND KILL LEADER ======

export function getRoundKillLeader(
  roundId: string,
  teams: Team[],
  results: ResultItem[]
): { team: Team | null; result: ResultItem | null } {
  const roundResults = results.filter(r => r.roundId === roundId);
  if (roundResults.length === 0) return { team: null, result: null };

  const sorted = [...roundResults].sort((a, b) => (b.kill || 0) - (a.kill || 0));
  if (sorted.length > 0 && sorted[0].kill > 0) {
    const team = teams.find(t => t.id === sorted[0].teamId);
    return { team: team || null, result: sorted[0] };
  }

  return { team: null, result: null };
}

// ====== CRUD OPERATIONS (all auto-sync via onSnapshot) ======

export async function addTeam(name: string, logoUrl?: string) {
  const snapshot = await getDocs(teamsRef);
  const order = snapshot.size + 1;
  const docRef = await addDoc(teamsRef, {
    name,
    order,
    logoUrl: logoUrl || '',
    createdAt: new Date().toISOString()
  });
  console.log('[Firestore] Team added:', name, '-> doc ID:', docRef.id);
  return docRef.id;
}

export async function updateTeam(id: string, name: string, logoUrl?: string) {
  const docRef = doc(db, 'teams', id);
  await updateDoc(docRef, { name, logoUrl: logoUrl || '' });
  console.log('[Firestore] Team updated:', name);
}

export async function deleteTeam(id: string) {
  const resultsSnap = await getDocs(resultsRef);
  const batch = writeBatch(db);
  resultsSnap.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.teamId === id) {
      batch.delete(docSnap.ref);
    }
  });
  batch.delete(doc(db, 'teams', id));
  await batch.commit();
  console.log('[Firestore] Team deleted:', id);
}

export async function addRound(label: string) {
  const snapshot = await getDocs(roundsRef);
  const order = snapshot.size + 1;
  const docRef = await addDoc(roundsRef, {
    label,
    order,
    createdAt: new Date().toISOString()
  });
  console.log('[Firestore] Round added:', label, '-> doc ID:', docRef.id);
  return docRef.id;
}

export async function updateRound(id: string, label: string) {
  const docRef = doc(db, 'rounds', id);
  await updateDoc(docRef, { label });
  console.log('[Firestore] Round updated:', label);
}

export async function deleteRound(id: string) {
  const resultsSnap = await getDocs(resultsRef);
  const batch = writeBatch(db);
  resultsSnap.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.roundId === id) {
      batch.delete(docSnap.ref);
    }
  });
  batch.delete(doc(db, 'rounds', id));
  await batch.commit();
  console.log('[Firestore] Round deleted:', id);
}

export async function saveResultItem(
  roundId: string,
  teamId: string,
  kill: number,
  placement: number | null,
  booyah: boolean
) {
  const resultId = `${roundId}_${teamId}`;
  const resDocRef = doc(db, 'results', resultId);
  await setDoc(resDocRef, {
    id: resultId,
    roundId,
    teamId,
    kill: Math.max(0, kill),
    placement,
    booyah,
    updatedAt: new Date().toISOString()
  }, { merge: true });
}

export async function resetRoundResults(roundId: string) {
  const snapshot = await getDocs(resultsRef);
  const batch = writeBatch(db);
  let count = 0;
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.roundId === roundId) {
      batch.delete(docSnap.ref);
      count++;
    }
  });
  if (count > 0) {
    await batch.commit();
  }
  console.log('[Firestore] Round results reset:', roundId, '(' + count + ' docs deleted)');
}

export async function updateSettings(settings: SettingsConfig) {
  await setDoc(settingsDocRef, settings);
  console.log('[Firestore] Settings updated');
}
