import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Auth, authState, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut } from '@angular/fire/auth';
import { Firestore, doc, getDoc, setDoc, collection, getDocs, updateDoc } from '@angular/fire/firestore';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updatePassword } from 'firebase/auth';
import { environment } from '../../environments/environment';
import { ToastService } from './toast.service';
import { ThemeService } from './theme.service';

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
}

const SESSION_DURATION_MS = 6 * 24 * 60 * 60 * 1000; // 6 days
const STORAGE_KEY_LAST_LOGIN = 'lastLoginTimestamp';

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
    this.authSubscription = authState(this.auth).subscribe(async (firebaseUser) => {
      const isInitial = !this.initialAuthChecked.value;

      if (firebaseUser) {
        // --- Session Timeout Check ---
        const lastLogin = localStorage.getItem(STORAGE_KEY_LAST_LOGIN);
        const now = Date.now();

        if (lastLogin) {
          const lastLoginMs = parseInt(lastLogin, 10);
          if (now - lastLoginMs > SESSION_DURATION_MS) {
            this.toast.warning('Your session has expired. Please log in again.');
            await this.logout();
            return;
          }
        } else {
          // First time this feature is active: set timestamp to now to give them 6 days
          localStorage.setItem(STORAGE_KEY_LAST_LOGIN, now.toString());
        }
        // -----------------------------

        const userDocRef = doc(this.firestore, `users/${firebaseUser.uid}`);
        const userDoc = await getDoc(userDocRef);

        let appUser: User;

        if (userDoc.exists()) {
          appUser = { id: firebaseUser.uid, ...userDoc.data() } as User;
        } else {
          // New Google Sign-In user — create as PENDING
          appUser = {
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || 'Unknown User',
            role: 'USER',
            status: 'PENDING'
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

        // Only auto-navigate and toast if we just came from login or it's NOT a refresh load
        const currentUrl = this.router.url;

        // If it's a manual login (coming from /login or / registration), show toast and navigate
        if (currentUrl === '/login' || currentUrl === '/') {
          if (appUser.status === 'PENDING') {
            this.toast.warning('Your account is pending Admin approval. Please contact support.');
            await signOut(this.auth);
            this.initialAuthChecked.next(true);
            return;
          }

          const dest = appUser.role === 'ADMIN' ? '/admin' : '/dashboard';

          // Only show toast if we are visibly on the login page (manual login)
          if (!isInitial) {
            this.toast.success(`Welcome back, ${appUser.name}! 👋`);
          }

          this.router.navigate([dest]);
        }
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
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(this.auth, provider);
      localStorage.setItem(STORAGE_KEY_LAST_LOGIN, Date.now().toString());
      return true;
    } catch (e) {
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
        status: 'PENDING'
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
    // Use window.location for a clean redirect that clears all state
    window.location.href = '/login';
  }

  // Admin creating a user manually makes them ACTIVE immediately
  public async saveUser(user: User, pass: string): Promise<void> {
    const secondaryApp = initializeApp(environment.firebaseConfig, 'SecondaryApp');
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

      await secondaryAuth.signOut();
    } catch (error) {
      throw error;
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
    const filePath = `logos/${userId}_${Date.now()}_${file.name}`;
    const storageRef = ref(this.storage, filePath);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  }

  async changeUserPassword(newPassword: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('No authenticated user found');
    await updatePassword(user, newPassword);
  }
}
