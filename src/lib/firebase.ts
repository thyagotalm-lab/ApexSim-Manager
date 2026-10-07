import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(
  app,
  firebaseConfig.firestoreDatabaseId || '(default)'
);

// Quota circuit-breaker to gracefully fall back when Firestore free write quota is reached
let firestoreQuotaExceededFlag = false;

try {
  if (typeof window !== 'undefined' && sessionStorage.getItem('firestore_quota_exceeded') === 'true') {
    firestoreQuotaExceededFlag = true;
  }
} catch (_) {}

export const isFirestoreQuotaExceeded = (): boolean => {
  return firestoreQuotaExceededFlag;
};

export const markFirestoreQuotaExceeded = () => {
  if (!firestoreQuotaExceededFlag) {
    firestoreQuotaExceededFlag = true;
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('firestore_quota_exceeded', 'true');
      }
    } catch (_) {}
    console.warn(
      '[ApexSim] Limite da cota gratuita diária de gravações do Firestore atingido. O sistema ativou o modo de contingência resiliente utilizando o banco local e a API do servidor sem interrupções.'
    );
  }
};

export const handleFirestoreError = (error: any): boolean => {
  if (!error) return false;
  const msg = error?.message || String(error);
  const code = error?.code || '';
  if (
    code === 'resource-exhausted' ||
    msg.includes('Quota limit exceeded') ||
    msg.includes('resource-exhausted') ||
    msg.includes('Free daily write units')
  ) {
    markFirestoreQuotaExceeded();
    return true;
  }
  return false;
};

// Validate connection on boot as requested by skill
async function testConnection() {
  if (isFirestoreQuotaExceeded()) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (handleFirestoreError(error)) return;
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or initializing.');
    }
  }
}

testConnection();

export default app;

