import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

import { ToastService } from '../services/toast.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router, private toast: ToastService) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const user = this.authService.currentUserValue;
    
    // No user or PENDING user should not be allowed into the apps routing
    if (!user) {
      this.router.navigate(['/login']);
      return false;
    }

    if (user.status === 'PENDING') {
      // Keep them stuck on a specific page or log them out
      this.toast.warning('Your account is pending Admin approval. Please contact support.');
      this.authService.logout();
      return false;
    }

    // Role check logic
    const requiredRoles = route.data['roles'] as Array<string>;
    if (requiredRoles && !requiredRoles.includes(user.role)) {
      this.router.navigate(['/401']);
      return false;
    }
    
    return true;
  }
}
