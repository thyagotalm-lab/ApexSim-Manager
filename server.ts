import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '15mb' }));

const DATA_DIR = path.resolve(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const CHAMPIONSHIPS_FILE = path.join(DATA_DIR, 'championships.json');
const DELETED_CHAMPIONSHIPS_FILE = path.join(DATA_DIR, 'deleted_championships.json');
const DELETED_USERS_FILE = path.join(DATA_DIR, 'deleted_users.json');
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json');

const readNotificationsFromFile = (): any[] => {
  try {
    if (fs.existsSync(NOTIFICATIONS_FILE)) {
      const data = fs.readFileSync(NOTIFICATIONS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Error reading notifications file:', err);
  }
  return [];
};

const writeNotificationsToFile = (list: any[]) => {
  try {
    fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(list.slice(0, 100), null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing notifications file:', err);
  }
};

const readDeletedUserIdsAndEmails = (): Set<string> => {
  try {
    if (fs.existsSync(DELETED_USERS_FILE)) {
      const data = fs.readFileSync(DELETED_USERS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return new Set(parsed.map((item: string) => item.toLowerCase().trim()));
      }
    }
  } catch (err) {
    console.error('Error reading deleted users file:', err);
  }
  return new Set();
};

const addDeletedUserIdentifier = (identifier: string) => {
  try {
    const set = readDeletedUserIdsAndEmails();
    set.add(identifier.toLowerCase().trim());
    fs.writeFileSync(DELETED_USERS_FILE, JSON.stringify(Array.from(set), null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing deleted users file:', err);
  }
};

const removeDeletedUserIdentifier = (identifier: string) => {
  try {
    const set = readDeletedUserIdsAndEmails();
    set.delete(identifier.toLowerCase().trim());
    fs.writeFileSync(DELETED_USERS_FILE, JSON.stringify(Array.from(set), null, 2), 'utf-8');
  } catch (err) {
    console.error('Error removing deleted user identifier:', err);
  }
};

const readDeletedChampionshipIds = (): string[] => {
  try {
    if (fs.existsSync(DELETED_CHAMPIONSHIPS_FILE)) {
      const data = fs.readFileSync(DELETED_CHAMPIONSHIPS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Error reading deleted championships:', err);
  }
  return [];
};

const addDeletedChampionshipId = (id: string) => {
  try {
    const list = readDeletedChampionshipIds();
    if (!list.includes(id)) {
      list.push(id);
      fs.writeFileSync(DELETED_CHAMPIONSHIPS_FILE, JSON.stringify(list, null, 2), 'utf-8');
    }
  } catch (err) {
    console.error('Error writing deleted championships:', err);
  }
};

const removeDeletedChampionshipId = (id: string) => {
  try {
    const list = readDeletedChampionshipIds().filter((d) => d !== id);
    fs.writeFileSync(DELETED_CHAMPIONSHIPS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error removing deleted championship:', err);
  }
};

const readChampionshipsFromFile = (): any[] => {
  try {
    if (fs.existsSync(CHAMPIONSHIPS_FILE)) {
      const data = fs.readFileSync(CHAMPIONSHIPS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading championships file:', err);
  }
  return [];
};

const writeChampionshipsToFile = (champs: any[]) => {
  try {
    fs.writeFileSync(CHAMPIONSHIPS_FILE, JSON.stringify(champs, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing championships file:', err);
  }
};

const THYAGO_ADMIN_USER = {
  id: 'user_thyago_talm',
  name: 'Thyago Talm',
  email: 'thyago.talm@gmail.com',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=250',
  role: 'admin',
  steamId: '',
  discordTag: '',
  country: 'Brasil 🇧🇷',
  racingNumber: 1,
  driverCategory: 'Pro',
  teamName: 'RDX Racing',
  teamTag: 'RDX',
  administeredLeagueIds: [],
  stats: {
    races: 0,
    wins: 0,
    podiums: 0,
    poles: 0,
    fastestLaps: 0,
    points: 0,
    dnfs: 0,
    safetyRating: 'B 3.50',
    simRating: 3000,
  },
};

// Filter out any fictitious mock test accounts or permanently deleted users
const filterRealUsersOnly = (usersList: any[]) => {
  const deletedIdentifiers = readDeletedUserIdsAndEmails();

  return usersList.filter((u) => {
    if (!u || !u.id || !u.email) return false;
    const id = u.id.toLowerCase().trim();
    const email = u.email.toLowerCase().trim();
    const name = (u.name || '').toLowerCase().trim();

    // Check if permanently deleted
    if (
      deletedIdentifiers.has(id) ||
      deletedIdentifiers.has(email) ||
      name === 'tyko moura' ||
      name === 'piloto de testes'
    ) {
      return false;
    }

    // Remove old test accounts
    if (u.id.startsWith('user_pilot_') || u.id.startsWith('user_admin_')) return false;
    if (
      email.includes('@motorsport.com') ||
      email.includes('@simracing.br') ||
      email.includes('@redline.com') ||
      email.includes('@scuderia.br') ||
      email.includes('@williams.sim')
    ) {
      return false;
    }
    return true;
  });
};

const readUsersFromFile = (): any[] => {
  let cleaned: any[] = [];
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        cleaned = filterRealUsersOnly(parsed);
      }
    }
  } catch (err) {
    console.error('Error reading users file:', err);
  }

  // Ensure Thyago is present
  const hasThyago = cleaned.some((u) => u.email.toLowerCase() === 'thyago.talm@gmail.com');
  if (!hasThyago) {
    cleaned.unshift(THYAGO_ADMIN_USER);
  }

  // Auto-sync any pilots registered in championships who don't have a user record yet
  try {
    const deletedIdentifiers = readDeletedUserIdsAndEmails();
    const champs = readChampionshipsFromFile();
    let addedAny = false;
    const existingIds = new Set(cleaned.map((u) => (u.id || '').toLowerCase().trim()));
    const existingEmails = new Set(cleaned.map((u) => (u.email || '').toLowerCase().trim()));

    champs.forEach((champ) => {
      (champ.registrations || []).forEach((reg: any) => {
        const email = (reg.userEmail || '').toLowerCase().trim();
        const id = (reg.userId || '').toLowerCase().trim();
        if (!email && !id) return;
        if ((id && deletedIdentifiers.has(id)) || (email && deletedIdentifiers.has(email))) return;

        const alreadyExists = (id && existingIds.has(id)) || (email && existingEmails.has(email));
        if (!alreadyExists) {
          const newUserId = reg.userId || `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const newUser = {
            id: newUserId,
            name: reg.userName || (email ? email.split('@')[0] : 'Piloto'),
            email: reg.userEmail || `${reg.steamGuid || newUserId}@apexsim.pilot`,
            avatar: reg.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
            role: 'pilot',
            gamingPlatform: reg.platform || 'Steam (PC)',
            gamingId: reg.steamGuid || reg.gamingId || '',
            steamId: reg.steamGuid || reg.steamId || '',
            discordTag: reg.discord || '',
            country: reg.country || 'Brasil 🇧🇷',
            racingNumber: reg.carNumber || Math.floor(Math.random() * 98) + 1,
            driverCategory: 'Pro',
            // User profile teamName and teamTag must come exclusively from profile editing, not championship teams
            teamName: '',
            teamTag: '',
            administeredLeagueIds: [],
            stats: {
              races: 0,
              wins: 0,
              podiums: 0,
              poles: 0,
              fastestLaps: 0,
              points: 0,
              dnfs: 0,
              safetyRating: 'B 3.50',
              simRating: 3000,
            },
            updatedAt: new Date().toISOString(),
          };
          cleaned.push(newUser);
          if (newUser.id) existingIds.add(newUser.id.toLowerCase());
          if (newUser.email) existingEmails.add(newUser.email.toLowerCase());
          addedAny = true;
        }
      });
    });

    if (addedAny) {
      writeUsersToFile(cleaned);
    }
  } catch (err) {
    console.error('Error auto-syncing championship pilots to users:', err);
  }

  return cleaned;
};

const writeUsersToFile = (usersList: any[]) => {
  try {
    const cleaned = filterRealUsersOnly(usersList);
    const hasThyago = cleaned.some((u) => u.email.toLowerCase() === 'thyago.talm@gmail.com');
    if (!hasThyago) {
      cleaned.unshift(THYAGO_ADMIN_USER);
    }
    fs.writeFileSync(USERS_FILE, JSON.stringify(cleaned, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing users file:', err);
  }
};

// API: Get all real registered users
app.get('/api/users', (req, res) => {
  const users = readUsersFromFile();
  res.json({ success: true, users });
});

// API: Register or update a user in the persistent database
const handleUserRegister = (req: any, res: any) => {
  const data = req.body;
  if (!data || !data.email) {
    return res.status(400).json({ success: false, error: 'E-mail é obrigatório' });
  }

  // If this email was previously marked in deleted list, unlock it for fresh registration
  removeDeletedUserIdentifier(data.email);

  const isThyago = data.email.toLowerCase().trim() === 'thyago.talm@gmail.com';
  const effectiveRole = isThyago ? 'admin' : (data.role || 'pilot');

  const users = readUsersFromFile();
  const existingIndex = users.findIndex((u) => u.email.toLowerCase().trim() === data.email.toLowerCase().trim());

  let savedUser: any;

  if (existingIndex >= 0) {
    savedUser = {
      ...users[existingIndex],
      ...data,
      role: isThyago ? 'admin' : (data.role || users[existingIndex].role || 'pilot'),
      id: isThyago ? 'user_thyago_talm' : users[existingIndex].id,
      administeredLeagueIds: data.administeredLeagueIds || users[existingIndex].administeredLeagueIds || [],
    };
    users[existingIndex] = savedUser;
  } else {
    savedUser = {
      id: isThyago ? 'user_thyago_talm' : (data.id || `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`),
      name: data.name || data.email.split('@')[0],
      email: data.email,
      avatar: data.avatar || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=250`,
      role: effectiveRole,
      country: data.country || 'Brasil 🇧🇷',
      gamingPlatform: data.gamingPlatform || 'Steam (PC)',
      gamingId: data.gamingId || '',
      steamId: data.gamingId || data.steamId || '',
      discordTag: data.discordTag || '',
      racingNumber: data.racingNumber || (isThyago ? 1 : Math.floor(Math.random() * 98) + 1),
      driverCategory: 'Pro',
      administeredLeagueIds: isThyago ? ['champ_gt3_sprint_2026', 'champ_f1_brasil_2026', 'champ_porsche_cup_2026'] : (data.administeredLeagueIds || []),
      stats: data.stats || {
        races: 0,
        wins: 0,
        podiums: 0,
        poles: 0,
        fastestLaps: 0,
        points: 0,
        dnfs: 0,
        safetyRating: 'B 3.50',
        simRating: 3000,
      },
    };
    users.push(savedUser);
  }

  writeUsersToFile(users);
  res.json({ success: true, user: savedUser, users });
};

app.post('/api/users/register', handleUserRegister);
app.post('/api/users', handleUserRegister);

// API: Batch sync users (merging any existing user accounts)
app.post('/api/users/sync', (req, res) => {
  const { users: incomingUsers } = req.body;
  const currentUsers = readUsersFromFile();
  const map = new Map<string, any>();

  currentUsers.forEach((u) => map.set(u.email.toLowerCase().trim(), u));

  if (Array.isArray(incomingUsers)) {
    const cleanedIncoming = filterRealUsersOnly(incomingUsers);
    cleanedIncoming.forEach((u) => {
      const email = u.email?.toLowerCase()?.trim();
      if (email && !map.has(email)) {
        map.set(email, u);
      }
    });
  }

  const merged = Array.from(map.values());
  writeUsersToFile(merged);
  res.json({ success: true, users: merged });
});

// API: Update user
app.put('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};
  const users = readUsersFromFile();
  const idx = users.findIndex((u) => u.id === id);

  if (idx < 0) {
    return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
  }

  const oldUser = users[idx];
  const oldName = oldUser.name;
  const targetEmail = (oldUser.email || '').toLowerCase().trim();
  const newName = updates.name && updates.name.trim() ? updates.name.trim() : oldName;

  const isThyago = oldUser.email.toLowerCase().trim() === 'thyago.talm@gmail.com';

  // Security: Email and Password cannot be modified through master profile updates
  delete updates.email;
  delete updates.password;

  const targetNewId = (updates.newId || updates.id || id).toString().trim();

  // If changing ID:
  if (targetNewId !== id) {
    if (isThyago) {
      return res.status(403).json({ success: false, error: 'O ID do Admin Master Root é protegido e não pode ser alterado.' });
    }
    // Check collision
    const collision = users.some((u) => u.id === targetNewId && u.id !== id);
    if (collision) {
      return res.status(400).json({ success: false, error: `O ID "${targetNewId}" já está em uso por outro usuário.` });
    }
  }

  const updatedId = (!isThyago && targetNewId) ? targetNewId : id;

  const updatedUser = {
    ...users[idx],
    ...updates,
    id: updatedId,
    name: newName,
    role: isThyago ? 'admin' : (updates.role || users[idx].role || 'pilot'),
    administeredLeagueIds: updates.administeredLeagueIds !== undefined ? updates.administeredLeagueIds : (users[idx].administeredLeagueIds || []),
    stats: updates.stats ? { ...users[idx].stats, ...updates.stats } : users[idx].stats,
  };

  users[idx] = updatedUser;
  writeUsersToFile(users);

  // If ID or name changed, propagate across ALL championships data: registrations, stage results, awards, protests
  if (updatedId !== id || updates.name) {
    try {
      const champs = readChampionshipsFromFile();
      let champModified = false;

      champs.forEach((champ: any) => {
        // 1. Update pilot registrations
        if (Array.isArray(champ.registrations)) {
          champ.registrations.forEach((reg: any) => {
            const regEmail = (reg.userEmail || '').toLowerCase().trim();
            const matchesUser =
              reg.userId === id ||
              reg.userId === updatedId ||
              (targetEmail && regEmail === targetEmail) ||
              (oldName && reg.userName === oldName);

            if (matchesUser) {
              reg.userId = updatedId;
              if (newName) {
                reg.userName = newName;
              }
              champModified = true;
            }
          });
        }

        // 2. Update league admin lists
        if (Array.isArray(champ.adminIds)) {
          const aIdx = champ.adminIds.indexOf(id);
          if (aIdx >= 0) {
            champ.adminIds[aIdx] = updatedId;
            champModified = true;
          }
        }

        // 3. Update stage rounds, race results, awards, and protests
        if (Array.isArray(champ.stages)) {
          champ.stages.forEach((stage: any) => {
            // 3a. Race Results in each stage
            if (Array.isArray(stage.results)) {
              stage.results.forEach((res: any) => {
                if (
                  res.driverId === id ||
                  res.driverId === updatedId ||
                  (oldName && res.driverName === oldName)
                ) {
                  res.driverId = updatedId;
                  if (newName) {
                    res.driverName = newName;
                  }
                  champModified = true;
                }
              });
            }

            // 3a-2. Sprint Race Results in each stage
            if (Array.isArray(stage.sprintResults)) {
              stage.sprintResults.forEach((res: any) => {
                if (
                  res.driverId === id ||
                  res.driverId === updatedId ||
                  (oldName && res.driverName === oldName)
                ) {
                  res.driverId = updatedId;
                  if (newName) {
                    res.driverName = newName;
                  }
                  champModified = true;
                }
              });
            }

            // 3b. Pole Position & Fastest Lap driver IDs
            if (stage.poleDriverId === id) {
              stage.poleDriverId = updatedId;
              champModified = true;
            }
            if (stage.fastestLapDriverId === id) {
              stage.fastestLapDriverId = updatedId;
              champModified = true;
            }
            if (stage.sprintPoleDriverId === id) {
              stage.sprintPoleDriverId = updatedId;
              champModified = true;
            }
            if (stage.sprintFastestLapDriverId === id) {
              stage.sprintFastestLapDriverId = updatedId;
              champModified = true;
            }

            // 3c. Driver of the day awards
            if (stage.driverOfTheDay) {
              if (
                stage.driverOfTheDay.winnerDriverId === id ||
                (oldName && stage.driverOfTheDay.winnerDriverName === oldName)
              ) {
                stage.driverOfTheDay.winnerDriverId = updatedId;
                if (newName) {
                  stage.driverOfTheDay.winnerDriverName = newName;
                }
                champModified = true;
              }
            }

            // 3d. Protests & Stewards
            if (Array.isArray(stage.protests)) {
              stage.protests.forEach((protest: any) => {
                if (protest.claimantId === id || (oldName && protest.claimantName === oldName)) {
                  protest.claimantId = updatedId;
                  if (newName) protest.claimantName = newName;
                  champModified = true;
                }
                if (protest.accusedId === id || (oldName && protest.accusedName === oldName)) {
                  protest.accusedId = updatedId;
                  if (newName) protest.accusedName = newName;
                  champModified = true;
                }
                if (Array.isArray(protest.stewards)) {
                  protest.stewards.forEach((stew: any) => {
                    if (stew.stewardId === id || (oldName && stew.stewardName === oldName)) {
                      stew.stewardId = updatedId;
                      if (newName) stew.stewardName = newName;
                      champModified = true;
                    }
                  });
                }
              });
            }
          });
        }

        // 4. Update root championship protests (RaceProtest[])
        if (Array.isArray(champ.protests)) {
          champ.protests.forEach((protest: any) => {
            if (
              protest.plaintiffId === id ||
              protest.plaintiffId === updatedId ||
              (oldName && protest.plaintiffName === oldName)
            ) {
              protest.plaintiffId = updatedId;
              if (newName) protest.plaintiffName = newName;
              champModified = true;
            }
            if (
              protest.defendantId === id ||
              protest.defendantId === updatedId ||
              (oldName && protest.defendantName === oldName)
            ) {
              protest.defendantId = updatedId;
              if (newName) protest.defendantName = newName;
              champModified = true;
            }
          });
        }
      });

      if (champModified) {
        writeChampionshipsToFile(champs);
      }
    } catch (champErr) {
      console.error('Error updating championships references for user:', champErr);
    }
  }

  res.json({ success: true, user: updatedUser, users });
});

// API: Delete user permanently across all server records
app.delete('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const users = readUsersFromFile();
  const target = users.find((u) => u.id === id);

  if (target && target.email.toLowerCase().trim() === 'thyago.talm@gmail.com') {
    return res.status(403).json({ success: false, error: 'Não é permitido excluir o usuário principal' });
  }

  // Blacklist the old user ID so existing sessions are invalidated
  addDeletedUserIdentifier(id);

  // If email was previously in deleted list, remove it so the person is free to register fresh if desired
  if (target?.email) {
    removeDeletedUserIdentifier(target.email);
  }

  // 1. Remove from users.json
  const remaining = users.filter((u) => u.id !== id);
  writeUsersToFile(remaining);

  // 2. Clean from championships.json (remove registrations and admin memberships)
  try {
    const champs = readChampionshipsFromFile();
    let champModified = false;
    champs.forEach((champ) => {
      const origLen = (champ.registrations || []).length;
      champ.registrations = (champ.registrations || []).filter(
        (r: any) => r.userId !== id && (!target?.email || r.userEmail?.toLowerCase().trim() !== target.email.toLowerCase().trim())
      );
      if (champ.registrations.length !== origLen) {
        champModified = true;
      }
      if (champ.adminIds && champ.adminIds.includes(id)) {
        champ.adminIds = champ.adminIds.filter((aid: string) => aid !== id);
        champModified = true;
      }
    });
    if (champModified) {
      writeChampionshipsToFile(champs);
    }
  } catch (err) {
    console.error('Error cleaning championships for deleted user:', err);
  }

  // 3. Clean from notifications.json
  try {
    const notifs = readNotificationsFromFile();
    const cleanedNotifs = notifs.filter(
      (n: any) => n.userId !== id && n.targetUserId !== id
    );
    if (cleanedNotifs.length !== notifs.length) {
      writeNotificationsToFile(cleanedNotifs);
    }
  } catch (err) {
    console.error('Error cleaning notifications for deleted user:', err);
  }

  res.json({ success: true, message: 'Usuário excluído permanentemente de todos os bancos de dados', users: remaining });
});

// API: Get all championships
app.get('/api/championships', (req, res) => {
  const deletedSet = new Set(readDeletedChampionshipIds());
  const champs = readChampionshipsFromFile().filter((c) => !deletedSet.has(c.id));
  res.json({ success: true, championships: champs, deletedIds: Array.from(deletedSet) });
});

// API: Create or update a championship
app.post('/api/championships', (req, res) => {
  const champ = req.body;
  if (!champ || !champ.id) {
    return res.status(400).json({ success: false, error: 'Championship ID is required' });
  }

  // Remove from deleted list if re-creating
  removeDeletedChampionshipId(champ.id);

  const champs = readChampionshipsFromFile();
  const existingIdx = champs.findIndex((c) => c.id === champ.id);

  if (existingIdx >= 0) {
    champs[existingIdx] = { ...champs[existingIdx], ...champ };
  } else {
    champs.unshift(champ);
  }

  writeChampionshipsToFile(champs);
  res.json({ success: true, championship: champ, championships: champs });
});

// API: Sync championships batch
app.post('/api/championships/sync', (req, res) => {
  const { championships: incoming } = req.body;
  const deletedSet = new Set(readDeletedChampionshipIds());
  const current = readChampionshipsFromFile().filter((c) => !deletedSet.has(c.id));
  const map = new Map<string, any>();

  current.forEach((c) => map.set(c.id, c));
  if (Array.isArray(incoming)) {
    incoming.forEach((c) => {
      if (c && c.id && !deletedSet.has(c.id)) {
        const existing = map.get(c.id);
        map.set(c.id, { ...existing, ...c });
      }
    });
  }

  const merged = Array.from(map.values());
  writeChampionshipsToFile(merged);
  res.json({ success: true, championships: merged });
});

// API: Delete a championship
app.delete('/api/championships/:id', (req, res) => {
  const { id } = req.params;
  addDeletedChampionshipId(id);
  const current = readChampionshipsFromFile();
  const filtered = current.filter((c) => c.id !== id);
  writeChampionshipsToFile(filtered);
  res.json({ success: true, championships: filtered, deletedId: id });
});

// API: Get all notifications
app.get('/api/notifications', (req, res) => {
  const list = readNotificationsFromFile();
  res.json({ success: true, notifications: list });
});

// API: Sync notifications batch
app.post('/api/notifications/sync', (req, res) => {
  const { notifications: incoming } = req.body;
  if (Array.isArray(incoming)) {
    const current = readNotificationsFromFile();
    const map = new Map<string, any>();
    current.forEach((n) => map.set(n.id, n));
    incoming.forEach((n) => {
      if (n && n.id) {
        map.set(n.id, { ...(map.get(n.id) || {}), ...n });
      }
    });
    const merged = Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    writeNotificationsToFile(merged);
    return res.json({ success: true, notifications: merged });
  }
  res.json({ success: true, notifications: readNotificationsFromFile() });
});

// API: Mark notification as read
app.post('/api/notifications/:id/read', (req, res) => {
  const { id } = req.params;
  const current = readNotificationsFromFile();
  const updated = current.map((n) => (n.id === id ? { ...n, read: true } : n));
  writeNotificationsToFile(updated);
  res.json({ success: true });
});

// API: Mark all notifications as read
app.post('/api/notifications/read-all', (req, res) => {
  const { userId } = req.body || {};
  const current = readNotificationsFromFile();
  const updated = current.map((n) => {
    if (!userId || n.userId === userId || n.userId === 'all') {
      return { ...n, read: true };
    }
    return n;
  });
  writeNotificationsToFile(updated);
  res.json({ success: true });
});

// API: Clear notifications
app.post('/api/notifications/clear', (req, res) => {
  const { userId } = req.body || {};
  const current = readNotificationsFromFile();
  const remaining = userId
    ? current.filter((n) => n.userId !== userId && n.userId !== 'all')
    : [];
  writeNotificationsToFile(remaining);
  res.json({ success: true });
});

// Serve frontend with Vite middlewares in dev, or static files in production
async function startServer() {
  if (fs.existsSync(path.resolve(__dirname, 'public'))) {
    app.use(express.static(path.resolve(__dirname, 'public')));
  }
  const isProduction = process.env.NODE_ENV === 'production' || fs.existsSync(path.resolve(__dirname, 'dist', 'index.html'));
  if (isProduction && fs.existsSync(path.resolve(__dirname, 'dist'))) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    app.use('*', async (req, res, next) => {
      // Don't intercept API routes
      if (req.originalUrl.startsWith('/api')) {
        return next();
      }
      try {
        const url = req.originalUrl;
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        next(e);
      }
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`ApexSim server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
