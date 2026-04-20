import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';
import { filter, map, take } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router, private toast: ToastService) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    return this.authService.initialAuthChecked$.pipe(
      filter(checked => checked), // Wait until the initial check is true
      take(1),
      map(() => {
        const user = this.authService.currentUserValue;

        if (!user) {
          // Store the attempted URL so we can redirect back after login? 
          // (Optional, but let's stick to user request of staying on page)
          this.router.navigate(['/login']);
          return false;
        }

        if (user.status === 'PENDING') {
          this.toast.warning('Your account is pending Admin approval. Please contact support.');
          this.authService.logout();
          return false;
        }

        const requiredRoles = route.data['roles'] as Array<string>;
        if (requiredRoles && !requiredRoles.includes(user.role)) {
          // If Admin tries to access User pages (or others not authorized), send to admin overview
          if (user.role === 'ADMIN') {
            this.router.navigate(['/admin/overview']);
          } else {
            this.router.navigate(['/401']);
          }
          return false;
        }

        return true;
      })
    );
  }
}
