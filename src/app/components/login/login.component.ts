import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Icons } from '../../utils/icons.util';
import { ToastService } from '../../services/toast.service';
import { ToastComponent } from '../toast/toast.component';
import { ThemeService, Theme } from '../../services/theme.service';
import { ToasterMessages } from '../../utils/messages.util';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ToastComponent, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  icons = Icons;
  viewMode: 'login' | 'signup' | 'forgot' = 'login';
  email = '';
  password = '';
  showPassword = false;
  name = '';
  loading = false;
  currentTheme: Theme = 'dark';

  constructor(
    private authService: AuthService,
    private router: Router,
    private toast: ToastService,
    public themeService: ThemeService
  ) {
    if (this.authService.currentUserValue) {
      const dest = this.authService.currentUserValue.role === 'ADMIN' ? '/admin' : '/dashboard';
      this.router.navigate([dest], { replaceUrl: true });
    }
    this.themeService.theme$.subscribe(t => this.currentTheme = t);
  }

  setViewMode(mode: 'login' | 'signup' | 'forgot') {
    this.viewMode = mode;
  }

  onSubmit() {
    if (this.viewMode === 'login') {
      this.login();
    } else if (this.viewMode === 'signup') {
      this.signUp();
    } else if (this.viewMode === 'forgot') {
      this.resetPassword();
    }
  }

  async login() {
    if (!this.email || !this.password) {
      this.toast.warning(ToasterMessages.auth.enterCredentials);
      return;
    }
    this.loading = true;
    const success = await this.authService.login(this.email, this.password);
    this.loading = false;
    
    if (success) {
      const user = this.authService.currentUserValue;
      if (user) {
        if (user.status === 'PENDING') {
          this.toast.warning(ToasterMessages.auth.pendingApproval);
          return;
        }
        this.toast.success(ToasterMessages.auth.welcomeBack(user.name));
        const dest = user.role === 'ADMIN' ? '/admin' : '/dashboard';
        this.router.navigate([dest], { replaceUrl: true });
      }
    } else {
      this.toast.error(ToasterMessages.auth.loginFailed);
    }
  }

  async loginWithGoogle() {
    this.loading = true;
    const success = await this.authService.loginWithGoogle();
    
    // Note: for mobile redirect, the page will reload and constructor will handle it if still same URL
    // But for popup, we can handle it here
    if (success) {
      const user = this.authService.currentUserValue;
      if (user) {
         if (user.status === 'PENDING') {
          this.toast.warning(ToasterMessages.auth.pendingApproval);
          return;
        }
        this.toast.success(ToasterMessages.auth.welcomeBack(user.name));
        const dest = user.role === 'ADMIN' ? '/admin' : '/dashboard';
        this.router.navigate([dest]);
      }
    } else {
      this.loading = false;
      this.toast.error(ToasterMessages.auth.googleLoginFailed);
    }
  }

  async signUp() {
    if (!this.email || !this.password || !this.name) {
      this.toast.warning(ToasterMessages.auth.enterSignUpDetails);
      return;
    }
    this.loading = true;
    const success = await this.authService.signUp(this.email, this.password, this.name);
    this.loading = false;
    if (success) {
      // Stay on signup form, clear fields, show toast
      this.email = ''; this.password = ''; this.name = '';
      this.toast.info(ToasterMessages.auth.registrationSuccess);
    } else {
      this.toast.error(ToasterMessages.auth.registrationFailed);
    }
  }

  async resetPassword() {
    if (!this.email) {
      this.toast.warning(ToasterMessages.auth.enterResetEmail);
      return;
    }
    this.loading = true;
    const success = await this.authService.resetPassword(this.email);
    if (success) {
      this.toast.success(ToasterMessages.auth.resetEmailSent);
      this.setViewMode('login');
      this.loading = false; // Reset loading only after switching view
    } else {
      this.loading = false;
      this.toast.error(ToasterMessages.auth.resetEmailFailed);
    }
  }
}
