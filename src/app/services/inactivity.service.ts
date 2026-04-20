import { Injectable, NgZone } from '@angular/core';
import { AuthService } from './auth.service';
import { fromEvent, merge, Subscription, timer } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root'
})
export class InactivityService {
  private inactivityDuration = 5 * 60 * 1000; // 5 minutes in ms
  private activitySubscription?: Subscription;

  constructor(
    private authService: AuthService,
    private ngZone: NgZone,
    private toast: ToastService
  ) {}

  startMonitoring() {
    this.stopMonitoring();

    // Run outside of Angular zone to avoid triggering change detection on every mouse move
    this.ngZone.runOutsideAngular(() => {
      const activityEvents$ = merge(
        fromEvent(window, 'mousemove'),
        fromEvent(window, 'mousedown'),
        fromEvent(window, 'keypress'),
        fromEvent(window, 'touchstart'),
        fromEvent(window, 'scroll')
      );

      this.activitySubscription = activityEvents$
        .pipe(
          switchMap(() => timer(this.inactivityDuration))
        )
        .subscribe(() => {
          this.ngZone.run(async () => {
            this.toast.info('Logged out due to inactivity');
            await this.authService.logout();
            this.stopMonitoring();
          });
        });
    });
  }

  stopMonitoring() {
    if (this.activitySubscription) {
      this.activitySubscription.unsubscribe();
      this.activitySubscription = undefined;
    }
  }
}
