import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideFirebaseApp, initializeApp, getApp } from '@angular/fire/app';
import { provideAuth, initializeAuth, browserLocalPersistence, indexedDBLocalPersistence, browserPopupRedirectResolver } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideStorage, getStorage } from '@angular/fire/storage';
import { environment } from '../environments/environment';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
    // Use indexedDB persistence first (mobile-safe, survives iOS Safari ITP),
    // fall back to localStorage. Set an explicit popup/redirect resolver so
    // both signInWithPopup (desktop) and signInWithRedirect (mobile) work on
    // every device and browser without popup-blocking issues.
    provideAuth(() =>
      initializeAuth(getApp(), {
        persistence: [indexedDBLocalPersistence, browserLocalPersistence],
        popupRedirectResolver: browserPopupRedirectResolver,
      })
    ),
    provideFirestore(() => getFirestore()),
    provideStorage(() => getStorage())
  ]
};
