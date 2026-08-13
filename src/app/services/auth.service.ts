import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Auth, authState, signInWithEmailAndPassword, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut, reauthenticateWithCredential, EmailAuthProvider } from '@angular/fire/auth';
import { Firestore, doc, getDoc, setDoc, collection, getDocs, updateDoc } from '@angular/fire/firestore';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updatePassword } from 'firebase/auth';
import { environment } from '../../environments/environment';
import { ToastService } from './toast.service';
import { ThemeService } from './theme.service';
import { ToasterMessages } from '../utils/messages.util';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'USER';
  status: 'ACTIVE' | 'PENDING';
  companyName?: string;
  companyAddress?: string;
  companyLogoUrl?: string;
  phone?: string;
  taxId?: string;
  website?: string;
  invoiceSettings?: {
    useCustomFormat: boolean;
    prefix: string;
    nextNumber: number;
    padding: number;
  };
  defaultCurrency?: {
    code: string;
    symbol: string;
  };
}

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const STORAGE_KEY_LAST_LOGIN = 'lastLoginTimestamp';
const STORAGE_KEY_REDIRECT_PENDING = 'googleRedirectPending';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth: Auth = inject(Auth);
  private firestore: Firestore = inject(Firestore);
  private storage: Storage = inject(Storage);

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$: Observable<User | null> = this.currentUserSubject.asObservable();
  private authSubscription: Subscription;
  private initialAuthChecked = new BehaviorSubject<boolean>(false);
  public initialAuthChecked$ = this.initialAuthChecked.asObservable();

  constructor(private router: Router, private toast: ToastService, private themeService: ThemeService) {
    // Handle the result of a signInWithRedirect() call (used on mobile browsers
    // and any browser that blocks popups). This must run on every page load
    // BEFORE the authState listener so the credential is captured after the
    // OAuth redirect returns the user to the app.
    getRedirectResult(this.auth).then(result => {
      if (result?.user) {
        // Mark the login timestamp so the session doesn't immediately expire
        localStorage.setItem(STORAGE_KEY_LAST_LOGIN, Date.now().toString());
      }
      // Clear the pending flag regardless of result
      localStorage.removeItem(STORAGE_KEY_REDIRECT_PENDING);
    }).catch(err => {
      console.error('Google Redirect Sign-In failed:', err);
      localStorage.removeItem(STORAGE_KEY_REDIRECT_PENDING);
      // Show a toast only if the user was actually expecting a redirect
      this.toast.error('Google Sign-In failed. Please try again.');
    });

    this.authSubscription = authState(this.auth).subscribe(async (firebaseUser) => {
      const isInitial = !this.initialAuthChecked.value;

      if (firebaseUser) {
        // --- Session Timeout Check ---
        const lastLogin = localStorage.getItem(STORAGE_KEY_LAST_LOGIN);
        const now = Date.now();

        if (lastLogin) {
          const lastLoginMs = parseInt(lastLogin, 10);
          if (now - lastLoginMs > SESSION_DURATION_MS) {
            this.toast.warning(ToasterMessages.auth.sessionExpired);
            await this.logout();
            return;
          }
        } else {
          // First time this feature is active: set timestamp to now so a fresh
          // session gets the full 24-hour window before expiring.
          localStorage.setItem(STORAGE_KEY_LAST_LOGIN, now.toString());
        }
        // -----------------------------

        const userDocRef = doc(this.firestore, `users/${firebaseUser.uid}`);
        const userDoc = await getDoc(userDocRef);

        let appUser: User;

        if (userDoc.exists()) {
          appUser = { id: firebaseUser.uid, ...userDoc.data() } as User;
        } else {
          // New Google Sign-In user — create as ACTIVE
          appUser = {
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || 'Unknown User',
            role: 'USER',
            status: 'ACTIVE'
          };
          await setDoc(userDocRef, {
            email: appUser.email,
            name: appUser.name,
            role: appUser.role,
            status: appUser.status
          });
        }

        this.currentUserSubject.next(appUser);

        // Load user's persisted theme from Firestore
        await this.themeService.loadUserTheme(appUser.id);
      } else {
        this.currentUserSubject.next(null);
      }

      this.initialAuthChecked.next(true);
    });
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  public async login(email: string, pass: string): Promise<boolean> {
    try {
      await signInWithEmailAndPassword(this.auth, email, pass);
      localStorage.setItem(STORAGE_KEY_LAST_LOGIN, Date.now().toString());
      return true;
    } catch (e) {
      console.error('Email Login failed', e);
      return false;
    }
  }

  public async loginWithGoogle(): Promise<boolean> {
    const provider = new GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      await signInWithPopup(this.auth, provider);
      localStorage.setItem(STORAGE_KEY_LAST_LOGIN, Date.now().toString());
      return true;
    } catch (e: any) {
      // Popups are frequently blocked (mobile / in-app browsers). Fall back to a
      // full-page redirect so Google login still works everywhere.
      if (e && (e.code === 'auth/popup-blocked'
        || e.code === 'auth/popup-closed-by-user'
        || e.code === 'auth/cancelled-popup-request')) {
        localStorage.setItem(STORAGE_KEY_REDIRECT_PENDING, '1');
        try {
          await signInWithRedirect(this.auth, provider);
          return true; // Resolves after the redirect round-trip
        } catch (err) {
          console.error('Google Redirect Sign-In failed', err);
        }
      }
      console.error('Google Login failed', e);
      return false;
    }
  }

  public async signUp(email: string, pass: string, name: string): Promise<boolean> {
    try {
      const cred = await createUserWithEmailAndPassword(this.auth, email, pass);
      localStorage.setItem(STORAGE_KEY_LAST_LOGIN, Date.now().toString());
      const userDocRef = doc(this.firestore, `users/${cred.user.uid}`);
      await setDoc(userDocRef, {
        email: email,
        name: name,
        role: 'USER',
        status: 'ACTIVE'
      });
      return true;
    } catch (e) {
      console.error('Signup failed', e);
      return false;
    }
  }

  public async resetPassword(email: string): Promise<boolean> {
    const { sendPasswordResetEmail } = await import('@angular/fire/auth');
    try {
      await sendPasswordResetEmail(this.auth, email);
      return true;
    } catch (e) {
      console.error('Password reset failed', e);
      return false;
    }
  }

  public async logout(): Promise<void> {
    await signOut(this.auth);
    this.currentUserSubject.next(null);
    localStorage.removeItem(STORAGE_KEY_LAST_LOGIN);
    this.router.navigate(['/login']);
  }

  // Admin creating a user manually makes them ACTIVE immediately
  public async saveUser(user: User, pass: string): Promise<void> {
    // Use a uniquely-named secondary app to avoid signing out the primary session.
    const secondaryAppName = `SecondaryApp_${Date.now()}`;
    const secondaryApp = initializeApp(environment.firebaseConfig, secondaryAppName);
    const secondaryAuth = getAuth(secondaryApp);

    try {
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, user.email, pass);
      const newUid = userCredential.user.uid;

      const userDocRef = doc(this.firestore, `users/${newUid}`);
      await setDoc(userDocRef, {
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status || 'ACTIVE',
        companyName: user.companyName || '',
        companyAddress: user.companyAddress || '',
        companyLogoUrl: user.companyLogoUrl || '',
        phone: user.phone || '',
        taxId: user.taxId || '',
        website: user.website || ''
      });
    } catch (error) {
      throw error;
    } finally {
      // Always sign out and clean up the secondary session
      await secondaryAuth.signOut();
    }
  }

  public async getAllUsers(): Promise<User[]> {
    const usersCol = collection(this.firestore, 'users');
    const userSnapshot = await getDocs(usersCol);
    return userSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as User));
  }

  public async approveUser(userId: string): Promise<void> {
    const userDocRef = doc(this.firestore, `users/${userId}`);
    await updateDoc(userDocRef, { status: 'ACTIVE' });
  }

  public async unapproveUser(userId: string): Promise<void> {
    const userDocRef = doc(this.firestore, `users/${userId}`);
    await updateDoc(userDocRef, { status: 'PENDING' });
  }

  /**
   * Deletes the user's Firestore document.
   * NOTE: This does NOT remove the Firebase Auth account (requires a Cloud Function).
   * The user will be unable to access protected routes since their Firestore doc is gone.
   */
  public async deleteUserFromFirestore(userId: string): Promise<void> {
    const { deleteDoc } = await import('@angular/fire/firestore');
    const userDocRef = doc(this.firestore, `users/${userId}`);
    await deleteDoc(userDocRef);
  }

  // --- Profile Updates & Logo Upload ---

  async updateProfile(userId: string, data: Partial<User>) {
    const userDocRef = doc(this.firestore, `users/${userId}`);
    await updateDoc(userDocRef, data);

    // update local state if it's the current user
    const currentUser = this.currentUserSubject.value;
    if (currentUser && currentUser.id === userId) {
      this.currentUserSubject.next({ ...currentUser, ...data });
    }
  }

  async uploadLogo(file: File, userId: string): Promise<string> {
    return this.uploadImage(file, `logos/${userId}`);
  }

  /** Generic image upload to Firebase Storage */
  async uploadImage(file: Blob, pathPrefix: string): Promise<string> {
    const fileName = (file as File).name || `img_${Date.now()}.png`;
    const filePath = `${pathPrefix}/${Date.now()}_${fileName}`;
    const storageRef = ref(this.storage, filePath);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  }

  async changeUserPassword(newPassword: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('No authenticated user found');
    await updatePassword(user, newPassword);
  }

  async reauthenticate(password: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user || !user.email) throw new Error('No authenticated user found');
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);
  }
}

