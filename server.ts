import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());

const dbPath = path.join(__dirname, 'data', 'db.json');

// Helper to load db
interface Video {
  id: string;
  title: string;
  url: string;
  type: 'youtube' | 'tiktok' | 'facebook' | 'instagram' | 'vimeo' | 'dailymotion' | 'twitter' | 'direct' | 'image' | 'external';
  date: string;
  uploader?: string;
  uploaderId?: string;
  createdAt?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  durationFormatted?: string;
}

interface AdSettings {
  topAdEnabled: boolean;
  topAdCode: string;
  feedAdEnabled: boolean;
  feedAdCode: string;
  popunderAdEnabled?: boolean;
  popunderAdCode?: string;
  socialBarAdEnabled?: boolean;
  socialBarAdCode?: string;
}

interface RewardSettings {
  pointsPerVideoUpload: number;
  pointsPerWebsiteVisit: number;
  watchDurationSeconds: number;
  pointsPerVideoWatch: number;
  pointsPerBdt?: number;
  minWithdrawBdt?: number;
}

interface Wallet {
  userId: string;
  userName: string;
  userEmail?: string;
  points: number;
  totalEarned: number;
  totalWithdrawn: number;
  videosWatchedCount: number;
  lastActive?: string;
}

interface Withdrawal {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  method: 'bkash' | 'nagad' | 'rocket' | 'recharge';
  accountNumber: string;
  points: number;
  amountBdt: number;
  status: 'pending' | 'approved' | 'rejected';
  date: string;
  createdAt: string;
  note?: string;
}

interface UserPresence {
  userId: string;
  userName: string;
  userEmail?: string;
  userPhone?: string;
  online: boolean;
  lastSeen: string;
  lastActive: number;
  points?: number;
  videosWatchedCount?: number;
  device?: string;
  joinedAt?: string;
}

interface DB {
  videos: Video[];
  adSettings: AdSettings;
  rewardSettings?: RewardSettings;
  apiSettings?: {
    youtubeApiKey?: string;
  };
  wallets?: Record<string, Wallet>;
  withdrawals?: Withdrawal[];
  users?: Record<string, UserPresence>;
}

let memoryCache: DB | null = null;

function readDB(): DB {
  try {
    if (!fs.existsSync(dbPath)) {
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const initial: DB = {
        videos: [
          {
            id: '1791342891154',
            title: 'Hin',
            url: 'https://youtu.be/39JcLiUzSrQ',
            type: 'youtube',
            date: '2026-10-07',
            uploader: 'RUHUL MIDIA'
          },
          {
            id: '1',
            title: 'Beautiful Nature & Scenic Video (প্রাকৃতিক দৃশ্য)',
            url: 'https://www.youtube.com/watch?v=LXb3EKWsInQ',
            type: 'youtube',
            date: '2026-10-01',
            uploader: 'RUHUL MIDIA'
          },
          {
            id: '2',
            title: 'সুন্দর সবুজ প্রকৃতি ও নদী (Natural Green Horizon)',
            url: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1200&auto=format&fit=crop&q=80',
            type: 'image',
            date: '2026-10-03',
            uploader: 'RUHUL MIDIA'
          },
          {
            id: '3',
            title: 'সূর্যাস্তের সোনালী আভা (Golden Sunset Landscape)',
            url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80',
            type: 'image',
            date: '2026-10-04',
            uploader: 'রুহুল আমিন'
          }
        ],
        adSettings: {
          topAdEnabled: false,
          topAdCode: '',
          feedAdEnabled: false,
          feedAdCode: '',
          popunderAdEnabled: false,
          popunderAdCode: '',
          socialBarAdEnabled: false,
          socialBarAdCode: ''
        }
      };
      fs.writeFileSync(dbPath, JSON.stringify(initial, null, 2), 'utf-8');
      memoryCache = initial;
      return initial;
    }
    const data = fs.readFileSync(dbPath, 'utf-8');
    const parsed = JSON.parse(data);
    if (parsed && Array.isArray(parsed.videos)) {
      memoryCache = parsed;
      return parsed;
    }
    if (memoryCache) return memoryCache;
    return parsed;
  } catch (err) {
    console.error('Error reading DB:', err);
    if (memoryCache) return memoryCache;
    return {
      videos: [],
      adSettings: {
        topAdEnabled: false,
        topAdCode: '',
        feedAdEnabled: false,
        feedAdCode: ''
      }
    };
  }
}

function writeDB(data: DB) {
  try {
    memoryCache = data;
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing DB:', err);
  }
}

// ==============================================================
// REAL-TIME FIREBASE FIRESTORE CROSS-PLATFORM SYNCHRONIZATION ENGINE
// ==============================================================
import { initializeApp as initFirebaseApp } from 'firebase/app';
import { 
  getFirestore as initFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs, 
  deleteDoc 
} from 'firebase/firestore';

const firebaseConfigFile = path.join(__dirname, 'firebase-applet-config.json');
let firestoreDb: any = null;

try {
  if (fs.existsSync(firebaseConfigFile)) {
    const rawConfig = fs.readFileSync(firebaseConfigFile, 'utf-8');
    const firebaseConfig = JSON.parse(rawConfig);
    const firebaseApp = initFirebaseApp(firebaseConfig, 'ruhul-midia-server-backend');
    firestoreDb = initFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
    console.log('✅ [Server] Connected to Firebase Firestore database:', firebaseConfig.firestoreDatabaseId);
  }
} catch (fbErr) {
  console.warn('⚠️ [Server] Firebase Firestore server init notice:', fbErr);
}

// 1. Sync Video to Firestore
async function syncVideoToFirestore(video: Video) {
  if (!firestoreDb) return;
  try {
    const validVideo = {
      id: String(video.id),
      title: String(video.title || '').substring(0, 300),
      url: String(video.url || '').substring(0, 2048),
      type: video.type || 'youtube',
      date: video.date || new Date().toISOString().split('T')[0],
      uploader: (video.uploader || 'RUHUL MIDIA').substring(0, 100),
      uploaderId: video.uploaderId ? String(video.uploaderId).substring(0, 128) : 'server_tg',
      createdAt: video.createdAt || new Date().toISOString(),
      thumbnailUrl: video.thumbnailUrl || undefined,
      durationSeconds: typeof video.durationSeconds === 'number' ? video.durationSeconds : undefined,
      durationFormatted: video.durationFormatted || undefined
    };
    await setDoc(doc(firestoreDb, 'videos', String(video.id)), validVideo, { merge: true });
    console.log(`[Firestore Sync] Video ${video.id} synced successfully`);
  } catch (err) {
    console.warn('[Firestore Sync] Video sync error:', err);
  }
}

// 2. Delete Video from Firestore
async function deleteVideoFromFirestore(videoId: string) {
  if (!firestoreDb || !videoId) return;
  try {
    await deleteDoc(doc(firestoreDb, 'videos', String(videoId)));
    console.log(`[Firestore Sync] Video ${videoId} deleted from Firestore`);
  } catch (err) {
    console.warn('[Firestore Sync] Video delete error:', err);
  }
}

// 3. Sync User Wallet & Presence to Firestore
async function syncWalletToFirestore(wallet: Wallet) {
  if (!firestoreDb || !wallet.userId) return;
  try {
    await setDoc(doc(firestoreDb, 'wallets', wallet.userId), {
      userId: wallet.userId,
      userName: wallet.userName || 'ইউজার',
      userEmail: wallet.userEmail || undefined,
      points: wallet.points ?? 0,
      totalEarned: wallet.totalEarned ?? wallet.points ?? 0,
      totalWithdrawn: wallet.totalWithdrawn ?? 0,
      videosWatchedCount: wallet.videosWatchedCount ?? 0,
      lastActive: wallet.lastActive || new Date().toISOString()
    }, { merge: true });

    // Also mirror to 'users' collection so presence and user list reflects activity
    await setDoc(doc(firestoreDb, 'users', wallet.userId), {
      userId: wallet.userId,
      userName: wallet.userName || 'ইউজার',
      userEmail: wallet.userEmail || undefined,
      online: true,
      lastActive: Date.now(),
      lastSeen: new Date().toLocaleTimeString('bn-BD')
    }, { merge: true });
    console.log(`[Firestore Sync] Wallet & User ${wallet.userId} synced to Firestore`);
  } catch (err) {
    console.warn('[Firestore Sync] Wallet sync error:', err);
  }
}

// 4. Sync Withdrawal Request to Firestore
async function syncWithdrawalToFirestore(withdrawal: Withdrawal) {
  if (!firestoreDb || !withdrawal.id) return;
  try {
    await setDoc(doc(firestoreDb, 'withdrawals', withdrawal.id), withdrawal, { merge: true });
    console.log(`[Firestore Sync] Withdrawal ${withdrawal.id} synced to Firestore`);
  } catch (err) {
    console.warn('[Firestore Sync] Withdrawal sync error:', err);
  }
}

// 5. Sync Settings to Firestore
async function syncSettingsToFirestore(adSettings?: AdSettings, rewardSettings?: RewardSettings) {
  if (!firestoreDb) return;
  try {
    if (adSettings) {
      await setDoc(doc(firestoreDb, 'settings', 'adSettings'), adSettings, { merge: true });
    }
    if (rewardSettings) {
      await setDoc(doc(firestoreDb, 'settings', 'rewardSettings'), rewardSettings, { merge: true });
    }
  } catch (err) {
    console.warn('[Firestore Sync] Settings sync error:', err);
  }
}

// 6. Startup Bidirectional Reconciliation between Firestore and local DB
async function reconcileFirestoreStartup() {
  if (!firestoreDb) return;
  try {
    const db = readDB();
    // Fetch remote videos
    const videosSnap = await getDocs(collection(firestoreDb, 'videos'));
    if (!videosSnap.empty) {
      const firestoreVideos: Video[] = [];
      videosSnap.forEach(d => {
        const v = d.data() as Video;
        if (v && v.id && v.url) {
          firestoreVideos.push({ ...v, id: d.id });
        }
      });
      if (firestoreVideos.length > 0) {
        const map = new Map<string, Video>();
        firestoreVideos.forEach(v => map.set(v.id, v));
        db.videos.forEach(v => {
          if (!map.has(v.id)) {
            map.set(v.id, v);
            // Push missing local video to Firestore
            syncVideoToFirestore(v);
          }
        });
        db.videos = Array.from(map.values()).sort((a, b) => b.id.localeCompare(a.id));
        writeDB(db);
        console.log(`✅ [Firestore Sync] Reconciled ${db.videos.length} videos from Firestore`);
      }
    } else if (db.videos.length > 0) {
      // Seed Firestore with local db.videos
      for (const v of db.videos) {
        await syncVideoToFirestore(v);
      }
      console.log(`✅ [Firestore Sync] Seeded ${db.videos.length} videos into Firestore`);
    }

    // Settings sync
    const rewardDoc = await getDoc(doc(firestoreDb, 'settings', 'rewardSettings'));
    if (rewardDoc.exists()) {
      db.rewardSettings = rewardDoc.data() as RewardSettings;
      writeDB(db);
    } else if (db.rewardSettings) {
      await syncSettingsToFirestore(undefined, db.rewardSettings);
    }
  } catch (err) {
    console.warn('⚠️ [Firestore Sync] Initial reconciliation note:', err);
  }
}

// Strict Admin Auth Helper: Mandatory authentication & token validation
const ADMIN_TOKEN = 'RuhulMidiaAdminToken2026';

function verifyAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization || '';
  if (authHeader === `Bearer ${ADMIN_TOKEN}`) {
    return next();
  }
  return res.status(401).json({ error: 'অননুমোদিত অ্যাক্সেস: সঠিক এডমিন টোকেন আবশ্যক (Unauthorized Access: Valid Admin Token Required)' });
}

// Strict Admin Check for Bulk Import
function verifyBulkAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  return verifyAdmin(req, res, next);
}

// --- API ROUTES ---

// 1. Admin Login (Strict password validation against ruhulamin0)
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  // Strict admin password check: ruhulamin0
  if (password === 'ruhulamin0') {
    res.json({ token: ADMIN_TOKEN, success: true });
  } else {
    res.status(401).json({ success: false, error: 'ভুল পাসওয়ার্ড! সঠিক এডমিন পাসওয়ার্ড দিন।' });
  }
});

// 2. Videos List
app.get('/api/videos', (req, res) => {
  const db = readDB();
  res.json(db.videos);
});

// 3. Add Video or Photo
app.post('/api/videos', (req, res) => {
  const { title, url, uploader, mediaCategory } = req.body;
  if (!title || !url) {
    return res.status(400).json({ error: 'টাইটেল এবং মিডিয়া লিংক প্রয়োজন!' });
  }

  const lowerUrl = url.toLowerCase();

  // Parse universal video and media type
  let type: 'youtube' | 'tiktok' | 'facebook' | 'instagram' | 'vimeo' | 'dailymotion' | 'twitter' | 'direct' | 'image' | 'external' | null = null;

  if (
    mediaCategory === 'image' ||
    lowerUrl.endsWith('.jpg') ||
    lowerUrl.endsWith('.jpeg') ||
    lowerUrl.endsWith('.png') ||
    lowerUrl.endsWith('.webp') ||
    lowerUrl.endsWith('.gif') ||
    lowerUrl.endsWith('.svg') ||
    lowerUrl.endsWith('.avif') ||
    lowerUrl.includes('images.unsplash.com') ||
    lowerUrl.includes('imgur.com') ||
    lowerUrl.includes('photos.') ||
    (lowerUrl.includes('drive.google.com/file/d/') && lowerUrl.includes('view'))
  ) {
    type = 'image';
  } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
    type = 'youtube';
  } else if (url.includes('tiktok.com')) {
    type = 'tiktok';
  } else if (url.includes('facebook.com') || url.includes('fb.watch') || url.includes('fb.com')) {
    type = 'facebook';
  } else if (url.includes('instagram.com') || url.includes('instagr.am')) {
    type = 'instagram';
  } else if (url.includes('vimeo.com')) {
    type = 'vimeo';
  } else if (url.includes('dailymotion.com') || url.includes('dai.ly')) {
    type = 'dailymotion';
  } else if (url.includes('twitter.com') || url.includes('x.com')) {
    type = 'twitter';
  } else if (
    lowerUrl.endsWith('.mp4') ||
    lowerUrl.endsWith('.webm') ||
    lowerUrl.endsWith('.ogg') ||
    lowerUrl.endsWith('.mov') ||
    lowerUrl.endsWith('.m4v') ||
    lowerUrl.endsWith('.mp3') ||
    lowerUrl.endsWith('.wav') ||
    lowerUrl.endsWith('.m4a') ||
    lowerUrl.endsWith('.m3u8') ||
    lowerUrl.includes('stream') ||
    lowerUrl.includes('drive.google.com') ||
    lowerUrl.includes('video') ||
    lowerUrl.includes('audio')
  ) {
    type = 'direct';
  } else if (url.startsWith('http://') || url.startsWith('https://')) {
    type = mediaCategory === 'image' ? 'image' : 'external';
  }

  if (!type) {
    return res.status(400).json({ error: 'অনুগ্রহ করে সঠিক ভিডিও বা ফটো লিংক প্রদান করুন!' });
  }

  const db = readDB();
  const newVideo: Video = {
    id: Date.now().toString(),
    title,
    url,
    type,
    date: new Date().toISOString().split('T')[0],
    uploader: typeof uploader === 'string' && uploader.trim() ? uploader.trim() : 'পাবলিক ইউজার',
    uploaderId: typeof req.body.uploaderId === 'string' && req.body.uploaderId ? req.body.uploaderId : undefined,
    createdAt: new Date().toISOString()
  };

  db.videos.unshift(newVideo);
  writeDB(db);
  syncVideoToFirestore(newVideo);

  res.status(201).json(newVideo);
});

// 4. Delete Video (Admin protected)
app.delete('/api/videos/:id', verifyAdmin, (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const initialLength = db.videos.length;
  db.videos = db.videos.filter(v => v.id !== id);

  if (db.videos.length === initialLength) {
    return res.status(404).json({ error: 'ভিডিও পাওয়া যায়নি!' });
  }

  writeDB(db);
  deleteVideoFromFirestore(id);
  res.json({ success: true, message: 'ভিডিওটি সফলভাবে মুছে ফেলা হয়েছে!' });
});

// 5. Ad Settings (Get)
app.get('/api/ads', (req, res) => {
  const db = readDB();
  const ads = db.adSettings || ({} as AdSettings);
  res.json({
    topAdEnabled: !!ads.topAdEnabled,
    topAdCode: ads.topAdCode || '',
    feedAdEnabled: !!ads.feedAdEnabled,
    feedAdCode: ads.feedAdCode || '',
    popunderAdEnabled: !!ads.popunderAdEnabled,
    popunderAdCode: ads.popunderAdCode || '',
    socialBarAdEnabled: !!ads.socialBarAdEnabled,
    socialBarAdCode: ads.socialBarAdCode || ''
  });
});

// 6. Ad Settings (Update - Admin protected)
app.post('/api/ads', verifyAdmin, (req, res) => {
  const { 
    topAdEnabled, 
    topAdCode, 
    feedAdEnabled, 
    feedAdCode,
    popunderAdEnabled,
    popunderAdCode,
    socialBarAdEnabled,
    socialBarAdCode
  } = req.body;
  const db = readDB();

  db.adSettings = {
    topAdEnabled: !!topAdEnabled,
    topAdCode: topAdCode || '',
    feedAdEnabled: !!feedAdEnabled,
    feedAdCode: feedAdCode || '',
    popunderAdEnabled: !!popunderAdEnabled,
    popunderAdCode: popunderAdCode || '',
    socialBarAdEnabled: !!socialBarAdEnabled,
    socialBarAdCode: socialBarAdCode || ''
  };

  writeDB(db);
  syncSettingsToFirestore(db.adSettings, undefined);
  res.json({ success: true, adSettings: db.adSettings });
});

// 6.1 Reward & Earning Settings (Get)
app.get('/api/reward-settings', (req, res) => {
  const db = readDB();
  const defaults: RewardSettings = {
    pointsPerVideoUpload: 10,
    pointsPerWebsiteVisit: 15,
    watchDurationSeconds: 15,
    pointsPerVideoWatch: 50,
    pointsPerBdt: 100,
    minWithdrawBdt: 20
  };
  res.json({
    ...defaults,
    ...(db.rewardSettings || {})
  });
});

// 6.2 Reward & Earning Settings (Update - Admin protected)
app.post('/api/reward-settings', verifyAdmin, (req, res) => {
  const { 
    pointsPerVideoUpload, 
    pointsPerWebsiteVisit, 
    watchDurationSeconds, 
    pointsPerVideoWatch,
    pointsPerBdt,
    minWithdrawBdt
  } = req.body;
  const db = readDB();

  db.rewardSettings = {
    pointsPerVideoUpload: typeof pointsPerVideoUpload === 'number' && pointsPerVideoUpload >= 0 ? pointsPerVideoUpload : 10,
    pointsPerWebsiteVisit: typeof pointsPerWebsiteVisit === 'number' && pointsPerWebsiteVisit >= 0 ? pointsPerWebsiteVisit : 15,
    watchDurationSeconds: typeof watchDurationSeconds === 'number' && watchDurationSeconds >= 5 ? watchDurationSeconds : 15,
    pointsPerVideoWatch: typeof pointsPerVideoWatch === 'number' && pointsPerVideoWatch >= 0 ? pointsPerVideoWatch : 50,
    pointsPerBdt: typeof pointsPerBdt === 'number' && pointsPerBdt > 0 ? pointsPerBdt : 100,
    minWithdrawBdt: typeof minWithdrawBdt === 'number' && minWithdrawBdt > 0 ? minWithdrawBdt : 20
  };

  writeDB(db);
  syncSettingsToFirestore(undefined, db.rewardSettings);
  res.json({ success: true, rewardSettings: db.rewardSettings });
});

// 7. Get User Wallet
app.get('/api/wallet/:userId', (req, res) => {
  const { userId } = req.params;
  const db = readDB();
  db.wallets = db.wallets || {};
  const wallet = db.wallets[userId];
  if (!wallet) {
    return res.status(404).json({ exists: false, error: 'Wallet not found' });
  }
  res.json(wallet);
});

// 8. Update / Sync User Wallet
app.post('/api/wallet/:userId', (req, res) => {
  const { userId } = req.params;
  const { userName, userEmail, points, totalEarned, totalWithdrawn, videosWatchedCount } = req.body;
  const db = readDB();
  db.wallets = db.wallets || {};

  const current = db.wallets[userId] || {
    userId,
    userName: userName || 'User',
    points: 0,
    totalEarned: 0,
    totalWithdrawn: 0,
    videosWatchedCount: 0
  };

  const newPoints = typeof points === 'number' ? Math.max(0, points) : current.points;
  const newEarned = Math.max(
    current.totalEarned || 0,
    typeof totalEarned === 'number' ? totalEarned : 0,
    newPoints
  );
  const newWatched = Math.max(
    current.videosWatchedCount || 0,
    typeof videosWatchedCount === 'number' ? videosWatchedCount : 0
  );
  const newWithdrawn = typeof totalWithdrawn === 'number' ? Math.max(0, totalWithdrawn) : (current.totalWithdrawn || 0);

  db.wallets[userId] = {
    userId,
    userName: typeof userName === 'string' && userName ? userName : current.userName,
    userEmail: typeof userEmail === 'string' && userEmail ? userEmail : current.userEmail,
    points: newPoints,
    totalEarned: newEarned,
    totalWithdrawn: newWithdrawn,
    videosWatchedCount: newWatched,
    lastActive: new Date().toISOString()
  };

  writeDB(db);
  syncWalletToFirestore(db.wallets[userId]);
  res.json(db.wallets[userId]);
});

// 9. Get Withdrawals (All for admin, or filtered by ?userId=...)
app.get('/api/withdrawals', (req, res) => {
  const { userId } = req.query;
  const db = readDB();
  db.withdrawals = db.withdrawals || [];

  if (userId && typeof userId === 'string') {
    const userList = db.withdrawals.filter(w => w.userId === userId);
    return res.json(userList);
  }

  res.json(db.withdrawals);
});

// 10. Submit Withdrawal Request
app.post('/api/withdrawals', (req, res) => {
  const { userId, userName, userEmail, method, accountNumber, points, amountBdt } = req.body;

  if (!userId || !accountNumber || !points || !amountBdt) {
    return res.status(400).json({ error: 'প্রয়োজনীয় তথ্য সম্পূর্ণ করুন!' });
  }

  const db = readDB();
  db.withdrawals = db.withdrawals || [];
  db.wallets = db.wallets || {};

  const newWithdrawal: Withdrawal = {
    id: Date.now().toString(),
    userId,
    userName: userName || 'User',
    userEmail: userEmail || '',
    method: method || 'bkash',
    accountNumber: accountNumber.trim(),
    points: Number(points),
    amountBdt: Number(amountBdt),
    status: 'pending',
    date: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString()
  };

  // Deduct points from user's server wallet
  if (db.wallets[userId]) {
    db.wallets[userId].points = Math.max(0, (db.wallets[userId].points || 0) - Number(points));
    db.wallets[userId].totalWithdrawn = (db.wallets[userId].totalWithdrawn || 0) + Number(amountBdt);
    syncWalletToFirestore(db.wallets[userId]);
  }

  db.withdrawals.unshift(newWithdrawal);
  writeDB(db);
  syncWithdrawalToFirestore(newWithdrawal);

  res.status(201).json(newWithdrawal);
});

// 11. Update Withdrawal Status (Admin protected: approve / reject)
app.patch('/api/withdrawals/:id', verifyAdmin, (req, res) => {
  const { id } = req.params;
  const { status, note } = req.body;

  const db = readDB();
  db.withdrawals = db.withdrawals || [];
  db.wallets = db.wallets || {};

  const itemIndex = db.withdrawals.findIndex(w => w.id === id);
  if (itemIndex === -1) {
    return res.status(404).json({ error: 'উইথড্র রিকোয়েস্ট পাওয়া যায়নি!' });
  }

  const item = db.withdrawals[itemIndex];
  const oldStatus = item.status;

  item.status = status;
  if (note) item.note = note;

  // If rejected from pending, refund points to user wallet
  if (oldStatus === 'pending' && status === 'rejected') {
    if (db.wallets[item.userId]) {
      db.wallets[item.userId].points = (db.wallets[item.userId].points || 0) + item.points;
      db.wallets[item.userId].totalWithdrawn = Math.max(0, (db.wallets[item.userId].totalWithdrawn || 0) - item.amountBdt);
      syncWalletToFirestore(db.wallets[item.userId]);
    }
  }

  writeDB(db);
  syncWithdrawalToFirestore(item);
  res.json({ success: true, withdrawal: item });
});

// 12. Delete Withdrawal (Admin protected)
app.delete('/api/withdrawals/:id', verifyAdmin, (req, res) => {
  const { id } = req.params;
  const db = readDB();
  db.withdrawals = db.withdrawals || [];

  const initialLen = db.withdrawals.length;
  db.withdrawals = db.withdrawals.filter(w => w.id !== id);

  if (db.withdrawals.length === initialLen) {
    return res.status(404).json({ error: 'রিকোয়েস্ট পাওয়া যায়নি!' });
  }

  writeDB(db);
  res.json({ success: true });
});

// 13. Get All Registered Users and Real-Time Presence Analytics
app.get('/api/users', (req, res) => {
  const db = readDB();
  db.users = db.users || {};
  db.wallets = db.wallets || {};

  const now = Date.now();
  // Threshold: active within 60 seconds is considered strictly online
  const ONLINE_THRESHOLD_MS = 60 * 1000;

  // Merge registered users from wallets and users presence map
  const userMap = new Map<string, UserPresence>();

  // Add all wallet users as base registered users
  Object.values(db.wallets).forEach(w => {
    if (w.userId) {
      userMap.set(w.userId, {
        userId: w.userId,
        userName: w.userName || 'ইউজার',
        userEmail: w.userEmail,
        online: false,
        lastSeen: w.lastActive || new Date().toISOString(),
        lastActive: w.lastActive ? new Date(w.lastActive).getTime() : 0,
        points: w.points || 0,
        videosWatchedCount: w.videosWatchedCount || 0
      });
    }
  });

  // Merge users presence
  Object.values(db.users).forEach(u => {
    const existing = userMap.get(u.userId);
    const isOnline = !!u.online && (now - (u.lastActive || 0) < ONLINE_THRESHOLD_MS);

    userMap.set(u.userId, {
      userId: u.userId,
      userName: u.userName || existing?.userName || 'ইউজার',
      userEmail: u.userEmail || existing?.userEmail,
      userPhone: u.userPhone || existing?.userPhone,
      online: isOnline,
      lastSeen: u.lastSeen || existing?.lastSeen || new Date().toISOString(),
      lastActive: u.lastActive || existing?.lastActive || now,
      points: typeof u.points === 'number' ? u.points : existing?.points || 0,
      videosWatchedCount: typeof u.videosWatchedCount === 'number' ? u.videosWatchedCount : existing?.videosWatchedCount || 0,
      device: u.device || existing?.device,
      joinedAt: u.joinedAt || existing?.joinedAt
    });
  });

  const userList = Array.from(userMap.values()).sort((a, b) => {
    if (a.online !== b.online) {
      return a.online ? -1 : 1;
    }
    return (b.lastActive || 0) - (a.lastActive || 0);
  });

  const onlineCount = userList.filter(u => u.online).length;
  const totalCount = userList.length;

  res.json({
    users: userList,
    totalCount,
    onlineCount
  });
});

// 14. Update User Presence (Heartbeat, Connect, Disconnect)
app.post('/api/users/presence', (req, res) => {
  const { 
    userId, 
    userName, 
    userEmail, 
    userPhone, 
    online, 
    points, 
    videosWatchedCount, 
    device 
  } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  const db = readDB();
  db.users = db.users || {};

  const now = Date.now();
  const current = db.users[userId];

  const updatedPresence: UserPresence = {
    userId,
    userName: userName || current?.userName || 'ইউজার',
    userEmail: userEmail || current?.userEmail,
    userPhone: userPhone || current?.userPhone,
    online: Boolean(online),
    lastSeen: new Date().toISOString(),
    lastActive: now,
    points: typeof points === 'number' ? points : current?.points || 0,
    videosWatchedCount: typeof videosWatchedCount === 'number' ? videosWatchedCount : current?.videosWatchedCount || 0,
    device: device || current?.device || 'Web Browser',
    joinedAt: current?.joinedAt || new Date().toISOString()
  };

  db.users[userId] = updatedPresence;
  writeDB(db);

  res.json({ success: true, presence: updatedPresence });
});

// --- YOUTUBE DATA API V3 & OEMBED HELPERS ---
function parseIso8601Duration(duration: string): number {
  if (!duration || typeof duration !== 'string') return 0;
  const match = duration.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
  if (!match) return 0;
  const days = parseInt(match[1] || '0', 10);
  const hours = parseInt(match[2] || '0', 10);
  const minutes = parseInt(match[3] || '0', 10);
  const seconds = parseInt(match[4] || '0', 10);
  return days * 86400 + hours * 3600 + minutes * 60 + seconds;
}

function formatDurationSeconds(seconds: number): string {
  if (!seconds || seconds <= 0 || isNaN(seconds)) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function extractYouTubeId(url: string): string {
  try {
    const trimmed = url.trim();
    if (trimmed.includes('youtu.be/')) {
      return trimmed.split('youtu.be/')[1]?.split('?')[0]?.split('&')[0] || '';
    } else if (trimmed.includes('youtube.com/watch')) {
      const urlObj = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
      return urlObj.searchParams.get('v') || '';
    } else if (trimmed.includes('youtube.com/shorts/')) {
      return trimmed.split('youtube.com/shorts/')[1]?.split('?')[0]?.split('&')[0] || '';
    } else if (trimmed.includes('youtube.com/embed/')) {
      return trimmed.split('youtube.com/embed/')[1]?.split('?')[0]?.split('&')[0] || '';
    } else if (trimmed.includes('youtube.com/v/')) {
      return trimmed.split('youtube.com/v/')[1]?.split('?')[0]?.split('&')[0] || '';
    } else if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }
  } catch {}
  return '';
}

// 15. Fetch YouTube Video Metadata (API v3 with oEmbed fallback)
app.get('/api/youtube/metadata', async (req, res) => {
  const rawInput = (req.query.url || req.query.videoId || '') as string;
  if (!rawInput) {
    return res.status(400).json({ error: 'URL or videoId is required' });
  }

  const videoId = extractYouTubeId(rawInput);
  if (!videoId) {
    return res.status(400).json({ error: 'সঠিক YouTube লিংক বা আইডি দেওয়া হয়নি' });
  }

  const db = readDB();
  const apiKey = (db.apiSettings?.youtubeApiKey || process.env.YOUTUBE_API_KEY || '').trim();

  // 1. Try YouTube Data API v3 if API key is configured
  if (apiKey) {
    try {
      const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${apiKey}`;
      const apiRes = await fetch(apiUrl);
      if (apiRes.ok) {
        const data = await apiRes.json();
        if (data && Array.isArray(data.items) && data.items.length > 0) {
          const item = data.items[0];
          const snippet = item.snippet || {};
          const contentDetails = item.contentDetails || {};
          const thumbnails = snippet.thumbnails || {};

          // High quality thumbnails: maxres > standard > high > medium > default
          const highResThumb = 
            thumbnails.maxres?.url || 
            thumbnails.standard?.url || 
            thumbnails.high?.url || 
            thumbnails.medium?.url || 
            thumbnails.default?.url || 
            `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

          const durationSeconds = parseIso8601Duration(contentDetails.duration || '');
          const durationFormatted = formatDurationSeconds(durationSeconds);

          return res.json({
            success: true,
            source: 'youtube_data_api_v3',
            videoId,
            title: snippet.title || 'YouTube Video',
            uploader: snippet.channelTitle || '',
            thumbnailUrl: highResThumb,
            durationSeconds,
            durationFormatted
          });
        }
      } else {
        console.warn('YouTube Data API responded with status:', apiRes.status);
      }
    } catch (apiErr) {
      console.warn('YouTube Data API call failed, falling back to oEmbed:', apiErr);
    }
  }

  // 2. Fallback to standard YouTube oEmbed (Free, public, zero quota limit)
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const oembedRes = await fetch(oembedUrl);
    if (oembedRes.ok) {
      const oembedData = await oembedRes.json();
      const highResThumb = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      return res.json({
        success: true,
        source: 'oembed_fallback',
        videoId,
        title: oembedData.title || 'YouTube Video',
        uploader: oembedData.author_name || '',
        thumbnailUrl: oembedData.thumbnail_url || highResThumb,
        durationSeconds: null,
        durationFormatted: null
      });
    }
  } catch (oembedErr) {
    console.warn('oEmbed fallback request error:', oembedErr);
  }

  // 3. Guaranteed Standard Fallback (so feed NEVER breaks)
  return res.json({
    success: true,
    source: 'standard_fallback',
    videoId,
    title: 'YouTube Video',
    uploader: 'YouTube Creator',
    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    durationSeconds: null,
    durationFormatted: null
  });
});

// 16. Get YouTube API Settings
app.get('/api/youtube/settings', (req, res) => {
  const db = readDB();
  const apiKey = db.apiSettings?.youtubeApiKey || process.env.YOUTUBE_API_KEY || '';
  res.json({
    hasApiKey: !!apiKey.trim(),
    youtubeApiKey: apiKey.trim()
  });
});

// 17. Update YouTube API Settings (Admin Protected)
app.post('/api/youtube/settings', verifyAdmin, (req, res) => {
  const { youtubeApiKey } = req.body;
  const db = readDB();
  db.apiSettings = db.apiSettings || {};
  db.apiSettings.youtubeApiKey = typeof youtubeApiKey === 'string' ? youtubeApiKey.trim() : '';
  writeDB(db);

  res.json({
    success: true,
    hasApiKey: !!db.apiSettings.youtubeApiKey,
    youtubeApiKey: db.apiSettings.youtubeApiKey
  });
});

// ==============================================================
// TELEGRAM BOT & CROSS-PLATFORM REAL-TIME SYNC API
// ==============================================================

// 1. Telegram Bot Integration Status & Launch Info
app.get('/api/telegram/info', (req, res) => {
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.protocol || 'https';
  const appUrl = `${protocol}://${host}`;

  res.json({
    appName: 'RUHUL MIDIA',
    status: 'active',
    webhookEndpoint: `${appUrl}/api/telegram/webhook`,
    syncEndpoint: `${appUrl}/api/telegram/sync-action`,
    webAppUrl: appUrl,
    description: 'Cross-platform real-time sync for Telegram Bot, Android WebView APK, and Web.',
    supportedCommands: [
      { command: '/start', description: 'Start bot, claim welcome bonus, and open WebApp' },
      { command: '/balance', description: 'Check real-time coin balance and BDT value' },
      { command: '/watch', description: 'Get latest videos with reward coins' },
      { command: '/addvideo', description: 'Add video: /addvideo Title | URL' },
      { command: '/withdraw', description: 'Submit withdrawal: /withdraw method account points' },
      { command: '/admin', description: 'Admin statistics (requires admin password)' }
    ]
  });
});

// 2. Telegram Bot Webhook Handler (Incoming updates from Telegram)
app.post('/api/telegram/webhook', (req, res) => {
  try {
    const update = req.body || {};
    const message = update.message || update.edited_message;
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol || 'https';
    const appUrl = `${protocol}://${host}`;

    if (!message || !message.text) {
      return res.json({ ok: true, note: 'No message text to process' });
    }

    const chatId = message.chat.id;
    const text = message.text.trim();
    const from = message.from || {};
    const telegramId = from.id ? String(from.id) : '';
    const userId = telegramId ? `tg_${telegramId}` : `tg_anon_${Date.now()}`;
    const userName = from.first_name 
      ? `${from.first_name}${from.last_name ? ' ' + from.last_name : ''}` 
      : (from.username || 'Telegram User');

    const db = readDB();
    db.wallets = db.wallets || {};

    // Ensure user wallet exists
    if (!db.wallets[userId]) {
      db.wallets[userId] = {
        userId,
        userName,
        userEmail: from.username ? `${from.username}@telegram.org` : undefined,
        points: 50, // 50 Welcome bonus points
        totalEarned: 50,
        totalWithdrawn: 0,
        videosWatchedCount: 0,
        lastActive: new Date().toISOString()
      };
      writeDB(db);
      syncWalletToFirestore(db.wallets[userId]);
    }

    const wallet = db.wallets[userId];
    const pointsPerBdt = db.rewardSettings?.pointsPerBdt || 100;
    const bdtValue = ((wallet.points || 0) / pointsPerBdt).toFixed(2);

    // Command: /start
    if (text.startsWith('/start')) {
      syncWalletToFirestore(wallet);
      const responsePayload = {
        method: 'sendMessage',
        chat_id: chatId,
        text: `🎬 *RUHUL MIDIA তে স্বাগতম!*\n\nনমস্কার *${userName}*! আপনি ভিডিও দেখে রিয়েল-টাইমে কয়েন ও বিকাশ/নগদে টাকা উপার্জন করতে পারবেন।\n\n🎁 *স্বাগতম বোনাস:* +৫০ কয়েন যুক্ত হয়েছে!\n💰 *আপনার বর্তমান ব্যালেন্স:* ${wallet.points} কয়েন (৳${bdtValue})\n\nনিচের বাটনে চাপ দিয়ে সরাসরি ফুল-স্ক্রিন অ্যাপটি চালু করুন:`,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '🚀 RUHUL MIDIA অ্যাপ খুলুন (Open WebApp)',
                web_app: { url: appUrl }
              }
            ],
            [
              { text: '💰 ব্যালেন্স চেক', callback_data: 'check_balance' },
              { text: '📺 ভিডিও দেখুন', callback_data: 'watch_videos' }
            ]
          ]
        }
      };
      return res.json(responsePayload);
    }

    // Command: /balance or /points or ব্যালেন্স
    if (text.startsWith('/balance') || text.startsWith('/points') || text.includes('ব্যালেন্স')) {
      syncWalletToFirestore(wallet);
      const responsePayload = {
        method: 'sendMessage',
        chat_id: chatId,
        text: `💰 *ব্যালেন্স বিবরণী (RUHUL MIDIA)*\n\n👤 ইউজার: *${userName}*\n💎 মোট কয়েন: *${wallet.points}*\n💵 আনুমানিক মূল্য: *৳${bdtValue}*\n📺 মোট ভিডিও দেখেছেন: *${wallet.videosWatchedCount} টি*\n\nউইথড্র করতে অ্যাপটি ওপেন করুন অথবা টাইপ করুন:\n\`/withdraw bkash <number> <points>\``,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '💳 ওয়ালেট ও উইথড্র অপশন',
                web_app: { url: `${appUrl}?view=wallet` }
              }
            ]
          ]
        }
      };
      return res.json(responsePayload);
    }

    // Command: /watch or /videos or ভিডিও
    if (text.startsWith('/watch') || text.startsWith('/videos') || text.includes('ভিডিও')) {
      const latestVideos = db.videos.slice(0, 4);
      let listText = `📺 *সর্বশেষ আপলোড করা ভিডিওসমূহ:*\n\n`;
      latestVideos.forEach((v, idx) => {
        listText += `${idx + 1}. *${v.title}*\n   🔗 লিংক: ${v.url}\n\n`;
      });
      listText += `প্রতিটি ভিডিও দেখে +${db.rewardSettings?.pointsPerVideoWatch || 50} কয়েন অর্জন করুন!`;

      const responsePayload = {
        method: 'sendMessage',
        chat_id: chatId,
        text: listText,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '▶️ সরাসরি ভিডিও দেখুন ও কয়েন পান',
                web_app: { url: appUrl }
              }
            ]
          ]
        }
      };
      return res.json(responsePayload);
    }

    // Command: /addvideo Title | URL
    if (text.startsWith('/addvideo')) {
      const raw = text.replace('/addvideo', '').trim();
      const parts = raw.split('|').map((s: string) => s.trim());
      const title = parts[0] || 'Telegram Video';
      const url = parts[1] || parts[0];

      if (!url || !url.startsWith('http')) {
        return res.json({
          method: 'sendMessage',
          chat_id: chatId,
          text: `⚠️ অনুগ্রহ করে সঠিক ফরম্যাটে ভিডিও লিংক দিন:\n\`/addvideo টাইটেল | ভিডিও লিংক\`\n\nযেমন: \`/addvideo প্রাকৃতিক দৃশ্য | https://youtu.be/xxxx\``,
          parse_mode: 'Markdown'
        });
      }

      const newVideo = {
        id: String(Date.now()),
        title,
        url,
        type: (url.includes('tiktok') ? 'tiktok' : (url.includes('youtu') ? 'youtube' : 'external')) as any,
        date: new Date().toISOString().split('T')[0],
        uploader: userName,
        uploaderId: userId,
        createdAt: new Date().toISOString()
      };

      db.videos.unshift(newVideo);
      const bonus = db.rewardSettings?.pointsPerVideoUpload || 10;
      wallet.points += bonus;
      wallet.totalEarned += bonus;
      writeDB(db);

      // Real-time synchronization to Firebase Firestore
      syncVideoToFirestore(newVideo);
      syncWalletToFirestore(wallet);

      return res.json({
        method: 'sendMessage',
        chat_id: chatId,
        text: `✅ *ভিডিও সফলভাবে ক্লাউড ও অ্যাপে যুক্ত হয়েছে!*\n\n📌 টাইটেল: *${title}*\n🎁 আপলোড রিওয়ার্ড: *+${bonus} কয়েন*\n💰 আপনার নতুন ব্যালেন্স: *${wallet.points} কয়েন*\n\nভিডিওটি এখন ওয়েব, APK এবং সকল ইউজারের স্ক্রিনে রিয়েল-টাইমে দেখা যাবে।`,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🎬 অ্যাপে ভিডিওটি দেখুন', web_app: { url: appUrl } }]
          ]
        }
      });
    }

    // Command: /withdraw <method> <account> <points>
    if (text.startsWith('/withdraw')) {
      const parts = text.split(' ').filter(Boolean);
      if (parts.length < 4) {
        return res.json({
          method: 'sendMessage',
          chat_id: chatId,
          text: `⚠️ উইথড্র রিকোয়েস্ট পাঠাতে সঠিক ফরম্যাট ব্যবহার করুন:\n\`/withdraw <মেথড> <নাম্বার> <পয়েন্ট>\`\n\nযেমন:\n\`/withdraw bkash 01712345678 500\``,
          parse_mode: 'Markdown'
        });
      }

      const method = parts[1].toLowerCase();
      const accountNumber = parts[2];
      const pointsToWithdraw = parseInt(parts[3], 10);

      if (isNaN(pointsToWithdraw) || pointsToWithdraw < 100) {
        return res.json({
          method: 'sendMessage',
          chat_id: chatId,
          text: `⚠️ সর্বনিম্ন উইথড্র ১০০ point আবশ্যক। আপনার ব্যালেন্স: ${wallet.points} point।`
        });
      }

      if (wallet.points < pointsToWithdraw) {
        return res.json({
          method: 'sendMessage',
          chat_id: chatId,
          text: `❌ পর্যাপ্ত ব্যালেন্স নেই! আপনার বর্তমান ব্যালেন্স ${wallet.points} পয়েন্ট।`
        });
      }

      const amountBdt = Math.floor(pointsToWithdraw / pointsPerBdt);
      db.withdrawals = db.withdrawals || [];
      const newWithdrawal = {
        id: `wd-${Date.now()}`,
        userId,
        userName,
        method: (['bkash', 'nagad', 'rocket', 'recharge'].includes(method) ? method : 'bkash') as any,
        accountNumber,
        points: pointsToWithdraw,
        amountBdt,
        status: 'pending' as const,
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      };

      db.withdrawals.unshift(newWithdrawal);
      wallet.points -= pointsToWithdraw;
      wallet.totalWithdrawn = (wallet.totalWithdrawn || 0) + amountBdt;
      writeDB(db);

      // Real-time synchronization to Firebase Firestore
      syncWithdrawalToFirestore(newWithdrawal);
      syncWalletToFirestore(wallet);

      return res.json({
        method: 'sendMessage',
        chat_id: chatId,
        text: `✅ *উইথড্র রিকোয়েস্ট জমা হয়েছে!*\n\n💳 মেথড: *${method.toUpperCase()}*\n📱 একাউন্ট: *${accountNumber}*\n💎 পয়েন্ট: *${pointsToWithdraw}* (৳${amountBdt})\n⏳ স্ট্যাটাস: *অপেক্ষমান (Pending)*\n\nএডমিন প্যানেল থেকে যাচাই করে দ্রুত পেমেন্ট পরিশোধ করা হবে।`,
        parse_mode: 'Markdown'
      });
    }

    // Default reply for any other message
    return res.json({
      method: 'sendMessage',
      chat_id: chatId,
      text: `নমস্কার *${userName}*! RUHUL MIDIA এর অপশনগুলো দেখতে নিচের বাটনে ক্লিক করুন:`,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎬 RUHUL MIDIA অ্যাপ খুলুন', web_app: { url: appUrl } }]
        ]
      }
    });

  } catch (error) {
    console.error('Telegram webhook error:', error);
    return res.status(200).json({ ok: false, error: String(error) });
  }
});

// 3. Cross-Platform Real-Time Sync Dispatcher
app.post('/api/telegram/sync-action', (req, res) => {
  const { action, payload } = req.body || {};
  if (!action) {
    return res.status(400).json({ error: 'Action type is required' });
  }

  const db = readDB();

  switch (action) {
    case 'update_balance': {
      const { userId, pointsDelta, reason } = payload || {};
      if (!userId || typeof pointsDelta !== 'number') {
        return res.status(400).json({ error: 'userId and pointsDelta required' });
      }
      db.wallets = db.wallets || {};
      if (!db.wallets[userId]) {
        db.wallets[userId] = {
          userId,
          userName: payload?.userName || 'User',
          points: 0,
          totalEarned: 0,
          totalWithdrawn: 0,
          videosWatchedCount: 0,
          lastActive: new Date().toISOString()
        };
      }
      db.wallets[userId].points = Math.max(0, (db.wallets[userId].points || 0) + pointsDelta);
      if (pointsDelta > 0) {
        db.wallets[userId].totalEarned = (db.wallets[userId].totalEarned || 0) + pointsDelta;
      }
      db.wallets[userId].lastActive = new Date().toISOString();
      writeDB(db);
      syncWalletToFirestore(db.wallets[userId]);
      return res.json({ success: true, wallet: db.wallets[userId], action, reason });
    }

    case 'add_video': {
      const { video } = payload || {};
      if (!video || !video.title || !video.url) {
        return res.status(400).json({ error: 'Valid video payload required' });
      }
      db.videos.unshift(video);
      writeDB(db);
      syncVideoToFirestore(video);
      return res.json({ success: true, video, action });
    }

    case 'get_wallet': {
      const { userId } = payload || {};
      const wallet = db.wallets?.[userId] || null;
      return res.json({ success: true, wallet });
    }

    default:
      return res.status(400).json({ error: `Unknown action: ${action}` });
  }
});

// 4. Fetch User Sync Profile for Telegram Bot
app.get('/api/telegram/user/:id', (req, res) => {
  const id = req.params.id;
  const db = readDB();
  const userId = id.startsWith('tg_') ? id : `tg_${id}`;
  const wallet = db.wallets?.[userId] || db.wallets?.[id] || null;

  if (!wallet) {
    return res.status(404).json({ error: 'User not found in sync database' });
  }

  res.json({
    success: true,
    userId: wallet.userId,
    userName: wallet.userName,
    points: wallet.points,
    totalEarned: wallet.totalEarned,
    totalWithdrawn: wallet.totalWithdrawn,
    videosWatchedCount: wallet.videosWatchedCount,
    lastActive: wallet.lastActive
  });
});

// Helper: Extract YouTube Playlist or Channel Identifier
function extractYouTubePlaylistOrChannel(input: string): { type: 'playlist' | 'channel' | 'handle' | 'user' | 'video' | null; id: string } {
  const trimmed = input.trim();
  try {
    // 1. Direct Playlist ID
    if (/^(PL|UU|LL|FL|RD|OLAK5uy_)[a-zA-Z0-9_-]+$/.test(trimmed)) {
      return { type: 'playlist', id: trimmed };
    }

    // 2. Playlist URL containing list=
    if (trimmed.includes('list=')) {
      const urlObj = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
      const listId = urlObj.searchParams.get('list');
      if (listId) {
        return { type: 'playlist', id: listId };
      }
    }

    // 3. Channel URL with /channel/UCxxxx
    const channelMatch = trimmed.match(/youtube\.com\/channel\/(UC[a-zA-Z0-9_-]+)/);
    if (channelMatch && channelMatch[1]) {
      return { type: 'channel', id: channelMatch[1] };
    }

    // 4. Handle URL with /@channelName
    const handleMatch = trimmed.match(/youtube\.com\/@([a-zA-Z0-9_.-]+)/);
    if (handleMatch && handleMatch[1]) {
      return { type: 'handle', id: handleMatch[1] };
    }
    if (trimmed.startsWith('@')) {
      return { type: 'handle', id: trimmed.substring(1) };
    }

    // 5. Custom /c/ or /user/
    const customMatch = trimmed.match(/youtube\.com\/(?:c|user)\/([a-zA-Z0-9_.-]+)/);
    if (customMatch && customMatch[1]) {
      return { type: 'user', id: customMatch[1] };
    }

    // 6. Direct UC channel id
    if (/^UC[a-zA-Z0-9_-]{22}$/.test(trimmed)) {
      return { type: 'channel', id: trimmed };
    }

    // 7. Single video URL
    const singleVid = extractYouTubeId(trimmed);
    if (singleVid) {
      return { type: 'video', id: singleVid };
    }

    // 8. Bare handle / channel name
    if (!trimmed.includes('/') && /^[a-zA-Z0-9_.-]{3,30}$/.test(trimmed)) {
      return { type: 'handle', id: trimmed };
    }
  } catch (err) {
    console.warn('Error parsing YouTube playlist/channel identifier:', err);
  }
  return { type: null, id: '' };
}

// Helper: Resolve Uploads Playlist ID from Channel or Playlist
async function resolveUploadsPlaylistId(identifier: { type: 'playlist' | 'channel' | 'handle' | 'user' | 'video'; id: string }, apiKey: string): Promise<{ playlistId: string; title: string; type: string }> {
  if (identifier.type === 'playlist') {
    return { playlistId: identifier.id, title: 'YouTube Playlist', type: 'playlist' };
  }

  let channelUrl = '';
  if (identifier.type === 'channel') {
    channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&id=${encodeURIComponent(identifier.id)}&key=${apiKey}`;
  } else if (identifier.type === 'handle') {
    const handleParam = identifier.id.startsWith('@') ? identifier.id : `@${identifier.id}`;
    channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&forHandle=${encodeURIComponent(handleParam)}&key=${apiKey}`;
  } else if (identifier.type === 'user') {
    channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&forUsername=${encodeURIComponent(identifier.id)}&key=${apiKey}`;
  } else if (identifier.type === 'video') {
    const vUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${encodeURIComponent(identifier.id)}&key=${apiKey}`;
    const vRes = await fetch(vUrl);
    if (vRes.ok) {
      const vData = await vRes.json();
      const channelId = vData.items?.[0]?.snippet?.channelId;
      if (channelId) {
        channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&id=${encodeURIComponent(channelId)}&key=${apiKey}`;
      }
    }
  }

  const res = await fetch(channelUrl);
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`YouTube Channel API ত্রুটি (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  if (!data.items || data.items.length === 0) {
    throw new Error('চ্যানেল খুঁজে পাওয়া যায়নি! সঠিক চ্যানেল লিংক বা আইডি প্রদান করুন।');
  }

  const channel = data.items[0];
  const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;
  const channelTitle = channel.snippet?.title || 'YouTube Channel';

  if (!uploadsPlaylistId) {
    throw new Error('এই চ্যানেলের আপলোড প্লেলিস্ট পাওয়া যায়নি।');
  }

  return { playlistId: uploadsPlaylistId, title: channelTitle, type: 'channel' };
}

// Helper: Fetch videos from a YouTube Playlist using Data API v3
async function fetchPlaylistVideos(playlistId: string, apiKey: string, maxLimit = 50) {
  const playlistItemsUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${encodeURIComponent(playlistId)}&maxResults=${Math.min(50, maxLimit)}&key=${apiKey}`;
  
  const res = await fetch(playlistItemsUrl);
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`YouTube PlaylistItems ত্রুটি (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const items = Array.isArray(data.items) ? data.items : [];
  if (items.length === 0) {
    return [];
  }

  const videoIds = items
    .map((item: any) => item.contentDetails?.videoId || item.snippet?.resourceId?.videoId)
    .filter(Boolean);

  // Batch query to get duration for all videos
  const durationMap = new Map<string, { durationSeconds: number; durationFormatted: string }>();
  if (videoIds.length > 0) {
    try {
      const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds.join(',')}&key=${apiKey}`;
      const vRes = await fetch(videosUrl);
      if (vRes.ok) {
        const vData = await vRes.json();
        if (Array.isArray(vData.items)) {
          vData.items.forEach((vi: any) => {
            const sec = parseIso8601Duration(vi.contentDetails?.duration || '');
            durationMap.set(vi.id, {
              durationSeconds: sec,
              durationFormatted: formatDurationSeconds(sec)
            });
          });
        }
      }
    } catch (vErr) {
      console.warn('Batch duration fetch error:', vErr);
    }
  }

  return items.map((item: any) => {
    const vid = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId || '';
    const snippet = item.snippet || {};
    const thumbnails = snippet.thumbnails || {};
    const highResThumb =
      thumbnails.maxres?.url ||
      thumbnails.standard?.url ||
      thumbnails.high?.url ||
      thumbnails.medium?.url ||
      thumbnails.default?.url ||
      `https://img.youtube.com/vi/${vid}/hqdefault.jpg`;

    const dur = durationMap.get(vid);

    return {
      videoId: vid,
      title: snippet.title || 'YouTube Video',
      url: `https://www.youtube.com/watch?v=${vid}`,
      uploader: snippet.channelTitle || snippet.videoOwnerChannelTitle || 'YouTube Creator',
      thumbnailUrl: highResThumb,
      durationSeconds: dur?.durationSeconds || 180,
      durationFormatted: dur?.durationFormatted || '03:00',
      publishedAt: snippet.publishedAt?.split('T')[0] || new Date().toISOString().split('T')[0]
    };
  }).filter((v: any) => v.videoId && v.title !== 'Private video' && v.title !== 'Deleted video');
}

// Helper: Fallback video fetcher (uses YouTube RSS feed and oEmbed when API Key is missing or exhausted)
async function fetchVideosFallback(identifier: { type: string; id: string }): Promise<{ title: string; videos: any[] }> {
  try {
    // 1. Channel or Handle
    if (identifier.type === 'channel' || identifier.type === 'handle' || identifier.type === 'user') {
      let channelId = identifier.id;
      let channelTitle = 'YouTube Channel';

      // If handle or user, resolve channelId from YouTube page
      if (identifier.type === 'handle' || identifier.type === 'user' || !channelId.startsWith('UC')) {
        const cleanHandle = identifier.id.replace(/^@/, '');
        try {
          const pageRes = await fetch(`https://www.youtube.com/@${cleanHandle}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
          });
          if (pageRes.ok) {
            const html = await pageRes.text();
            const idMatch = html.match(/externalId\":\"(UC[a-zA-Z0-9_-]+)\"/) || html.match(/channel_id=(UC[a-zA-Z0-9_-]+)/);
            if (idMatch && idMatch[1]) {
              channelId = idMatch[1];
            }
            const tMatch = html.match(/<meta property=\"og:title\" content=\"([^\"]+)\"/);
            if (tMatch && tMatch[1]) channelTitle = tMatch[1];
          }
        } catch (hErr) {
          console.warn('Handle page scrape notice:', hErr);
        }
      }

      if (channelId && channelId.startsWith('UC')) {
        const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
        const rssRes = await fetch(rssUrl);
        if (rssRes.ok) {
          const xml = await rssRes.text();
          const entries = xml.split('<entry>');
          const videos: any[] = [];
          for (let i = 1; i < entries.length; i++) {
            const chunk = entries[i];
            const vidMatch = chunk.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
            const titleMatch = chunk.match(/<title>([^<]+)<\/title>/);
            const authorMatch = chunk.match(/<author>\s*<name>([^<]+)<\/name>/);
            const pubMatch = chunk.match(/<published>([^<]+)<\/published>/);
            if (vidMatch) {
              const vid = vidMatch[1];
              videos.push({
                videoId: vid,
                title: titleMatch ? titleMatch[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&') : 'YouTube Video',
                url: `https://www.youtube.com/watch?v=${vid}`,
                uploader: authorMatch ? authorMatch[1] : channelTitle,
                thumbnailUrl: `https://img.youtube.com/vi/${vid}/hqdefault.jpg`,
                durationSeconds: 180,
                durationFormatted: '03:00',
                publishedAt: pubMatch ? pubMatch[1].split('T')[0] : new Date().toISOString().split('T')[0]
              });
            }
          }
          if (videos.length > 0) {
            return { title: channelTitle, videos };
          }
        }
      }
    }

    // 2. Playlist
    if (identifier.type === 'playlist') {
      const listUrl = `https://www.youtube.com/playlist?list=${identifier.id}`;
      const pRes = await fetch(listUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      if (pRes.ok) {
        const html = await pRes.text();
        const tMatch = html.match(/<meta property=\"og:title\" content=\"([^\"]+)\"/);
        const pTitle = tMatch ? tMatch[1] : 'YouTube Playlist';

        const vids = new Set<string>();
        const m = html.match(/\"videoId\":\"([a-zA-Z0-9_-]{11})\"/g);
        if (m) {
          m.forEach(str => {
            const id = str.replace(/\"videoId\":\"|\"/g, '');
            vids.add(id);
          });
        }

        const vidList = Array.from(vids).slice(0, 30);
        const videos: any[] = [];
        for (const vid of vidList) {
          try {
            const oRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${vid}&format=json`);
            if (oRes.ok) {
              const oData = await oRes.json();
              videos.push({
                videoId: vid,
                title: oData.title || 'YouTube Video',
                url: `https://www.youtube.com/watch?v=${vid}`,
                uploader: oData.author_name || 'YouTube Creator',
                thumbnailUrl: oData.thumbnail_url || `https://img.youtube.com/vi/${vid}/hqdefault.jpg`,
                durationSeconds: 180,
                durationFormatted: '03:00',
                publishedAt: new Date().toISOString().split('T')[0]
              });
            } else {
              videos.push({
                videoId: vid,
                title: 'YouTube Video',
                url: `https://www.youtube.com/watch?v=${vid}`,
                uploader: 'YouTube Creator',
                thumbnailUrl: `https://img.youtube.com/vi/${vid}/hqdefault.jpg`,
                durationSeconds: 180,
                durationFormatted: '03:00',
                publishedAt: new Date().toISOString().split('T')[0]
              });
            }
          } catch {
            videos.push({
              videoId: vid,
              title: 'YouTube Video',
              url: `https://www.youtube.com/watch?v=${vid}`,
              uploader: 'YouTube Creator',
              thumbnailUrl: `https://img.youtube.com/vi/${vid}/hqdefault.jpg`,
              durationSeconds: 180,
              durationFormatted: '03:00',
              publishedAt: new Date().toISOString().split('T')[0]
            });
          }
        }
        if (videos.length > 0) {
          return { title: pTitle, videos };
        }
      }
    }

    // 3. Single Video
    if (identifier.type === 'video') {
      const vid = identifier.id;
      try {
        const oRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${vid}&format=json`);
        if (oRes.ok) {
          const oData = await oRes.json();
          return {
            title: oData.title || 'YouTube Video',
            videos: [{
              videoId: vid,
              title: oData.title || 'YouTube Video',
              url: `https://www.youtube.com/watch?v=${vid}`,
              uploader: oData.author_name || 'YouTube Creator',
              thumbnailUrl: oData.thumbnail_url || `https://img.youtube.com/vi/${vid}/hqdefault.jpg`,
              durationSeconds: 180,
              durationFormatted: '03:00',
              publishedAt: new Date().toISOString().split('T')[0]
            }]
          };
        }
      } catch {}
      return {
        title: 'YouTube Video',
        videos: [{
          videoId: vid,
          title: 'YouTube Video',
          url: `https://www.youtube.com/watch?v=${vid}`,
          uploader: 'YouTube Creator',
          thumbnailUrl: `https://img.youtube.com/vi/${vid}/hqdefault.jpg`,
          durationSeconds: 180,
          durationFormatted: '03:00',
          publishedAt: new Date().toISOString().split('T')[0]
        }]
      };
    }
  } catch (err) {
    console.error('Fallback video fetch error:', err);
  }

  return { title: 'YouTube Content', videos: [] };
}

// 18. Admin-Only: Bulk Preview Channel or Playlist Videos
app.post('/api/youtube/bulk-preview', verifyBulkAdmin, async (req, res) => {
  const { url, apiKey: clientApiKey } = req.body;
  if (!url || typeof url !== 'string' || !url.trim()) {
    return res.status(400).json({ error: 'YouTube প্লেলিস্ট বা চ্যানেল লিংক প্রদান করুন!' });
  }

  const db = readDB();
  const apiKey = (clientApiKey || db.apiSettings?.youtubeApiKey || process.env.YOUTUBE_API_KEY || '').trim();

  // If client provided a key, save it to database
  if (clientApiKey && typeof clientApiKey === 'string' && clientApiKey.trim()) {
    db.apiSettings = db.apiSettings || {};
    db.apiSettings.youtubeApiKey = clientApiKey.trim();
    writeDB(db);
  }

  const identifier = extractYouTubePlaylistOrChannel(url);
  if (!identifier.type || !identifier.id) {
    return res.status(400).json({ 
      error: 'সঠিক YouTube প্লেলিস্ট বা চ্যানেল লিংক সনাক্ত করা যায়নি। লিংকটি পুনরায় পরীক্ষা করুন।' 
    });
  }

  try {
    let videos: any[] = [];
    let title = 'YouTube Channel / Playlist';
    let type: string = identifier.type || 'playlist';
    let playlistId = identifier.id;

    if (apiKey) {
      try {
        const resolved = await resolveUploadsPlaylistId(identifier as any, apiKey);
        title = resolved.title;
        type = resolved.type;
        playlistId = resolved.playlistId;
        videos = await fetchPlaylistVideos(resolved.playlistId, apiKey, 50);
      } catch (apiErr: any) {
        console.warn('YouTube Data API v3 notice, attempting high-speed fallback:', apiErr.message);
        const fallback = await fetchVideosFallback(identifier as { type: string; id: string });
        videos = fallback.videos;
        if (fallback.title) title = fallback.title;
      }
    } else {
      const fallback = await fetchVideosFallback(identifier as { type: string; id: string });
      videos = fallback.videos;
      if (fallback.title) title = fallback.title;
    }

    if (!Array.isArray(videos) || videos.length === 0) {
      return res.status(404).json({
        error: 'কোনো ভিডিও পাওয়া যায়নি। চ্যানেল বা প্লেলিস্টে কোনো পাবলিক ভিডিও আছে কিনা নিশ্চিত করুন।'
      });
    }

    res.json({
      success: true,
      title,
      type,
      playlistId,
      totalFound: videos.length,
      videos
    });
  } catch (err: any) {
    console.error('Bulk preview error:', err);
    res.status(500).json({ error: err.message || 'ইউটিউব ডাটা লোড করতে সমস্যা হয়েছে!' });
  }
});

// 19. Admin-Only: Bulk Import Videos into Database
app.post('/api/youtube/bulk-import', verifyBulkAdmin, async (req, res) => {
  const { videos } = req.body;
  if (!Array.isArray(videos) || videos.length === 0) {
    return res.status(400).json({ error: 'ইমপোর্ট করার জন্য অন্তত একটি ভিডিও প্রয়োজন!' });
  }

  const db = readDB();
  db.videos = db.videos || [];

  // Build quick duplicate lookup
  const existingUrls = new Set<string>();
  const existingIds = new Set<string>();
  db.videos.forEach(v => {
    existingUrls.add(v.url.trim().toLowerCase());
    const id = extractYouTubeId(v.url);
    if (id) existingIds.add(id);
  });

  const newlyImported: Video[] = [];
  const now = new Date();

  videos.forEach((item: any, idx: number) => {
    const rawUrl = item.url || `https://www.youtube.com/watch?v=${item.videoId}`;
    const vidId = item.videoId || extractYouTubeId(rawUrl);

    if (existingUrls.has(rawUrl.toLowerCase()) || (vidId && existingIds.has(vidId))) {
      return; // Skip duplicate
    }

    const uniqueId = (Date.now() + idx).toString();
    const newVideo: Video = {
      id: uniqueId,
      title: item.title || 'YouTube Video',
      url: rawUrl,
      type: 'youtube',
      date: item.publishedAt || now.toISOString().split('T')[0],
      uploader: item.uploader || 'YouTube Creator',
      createdAt: new Date(now.getTime() + idx * 10).toISOString(),
      thumbnailUrl: item.thumbnailUrl,
      durationSeconds: item.durationSeconds,
      durationFormatted: item.durationFormatted
    };

    newlyImported.push(newVideo);
    if (vidId) existingIds.add(vidId);
    existingUrls.add(rawUrl.toLowerCase());
  });

  // Prepend newly imported videos so they appear at top of feed
  db.videos = [...newlyImported, ...db.videos];
  writeDB(db);

  res.json({
    success: true,
    count: newlyImported.length,
    totalVideos: db.videos.length,
    importedVideos: newlyImported
  });
});

// --- VITE MIDDLEWARE OR STATIC SERVER ---


if (process.env.NODE_ENV !== 'production') {
  // Development mode: load Vite Dev Server
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa'
  });
  
  app.use(vite.middlewares);
} else {
  // Production mode: serve static files
  const distPath = path.join(__dirname, 'dist');
  app.use(express.static(distPath));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running at http://localhost:${port}`);
  reconcileFirestoreStartup().catch(err => {
    console.warn('[Firestore Startup] Reconciliation error:', err);
  });
});
