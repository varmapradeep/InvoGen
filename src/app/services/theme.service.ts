import { Injectable, inject } from '@angular/core';
import { Firestore, doc, updateDoc, getDoc } from '@angular/fire/firestore';
import { BehaviorSubject } from 'rxjs';

export type Theme = 'dark' | 'light';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private firestore: Firestore = inject(Firestore);

  private _theme = new BehaviorSubject<Theme>(this.getStoredTheme());
  public theme$ = this._theme.asObservable();

  constructor() {
    this.applyTheme(this._theme.value);
  }

  get currentTheme(): Theme {
    return this._theme.value;
  }

  /** Toggle between dark and light */
  toggleTheme(userId?: string): void {
    const next: Theme = this._theme.value === 'dark' ? 'light' : 'dark';
    this.setTheme(next, userId);
  }

  /** Set a specific theme and persist it */
  setTheme(theme: Theme, userId?: string): void {
    this._theme.next(theme);
    localStorage.setItem('app-theme', theme);
    this.applyTheme(theme);

    if (userId) {
      this.persistThemeToFirestore(userId, theme);
    }
  }

  /** Load a user's saved theme from Firestore after login */
  async loadUserTheme(userId: string): Promise<void> {
    try {
      const userRef = doc(this.firestore, `users/${userId}`);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data['theme'] === 'light' || data['theme'] === 'dark') {
          this.setTheme(data['theme'] as Theme, undefined); // don't re-persist, already in Firestore
        }
      }
    } catch (e) {
      console.warn('Could not load theme from Firestore:', e);
    }
  }

  private async persistThemeToFirestore(userId: string, theme: Theme): Promise<void> {
    try {
      const userRef = doc(this.firestore, `users/${userId}`);
      await updateDoc(userRef, { theme });
    } catch (e) {
      console.warn('Could not persist theme to Firestore:', e);
    }
  }

  private getStoredTheme(): Theme {
    const stored = localStorage.getItem('app-theme');
    if (stored === 'light' || stored === 'dark') return stored;
    // Default: system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark';
  }

  private applyTheme(theme: Theme): void {
    const root = document.documentElement;
    const currentTheme = root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    
    // Only apply the transition class if the theme is actually changing and the page has loaded
    if (currentTheme !== theme && document.readyState === 'complete') {
      document.body.classList.add('theme-transitioning');
      setTimeout(() => {
        document.body.classList.remove('theme-transitioning');
      }, 400); // Wait for the 0.35s CSS transition to finish
    }

    if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
    } else {
      root.removeAttribute('data-theme');
    }
  }
}
