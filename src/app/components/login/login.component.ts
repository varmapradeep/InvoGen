import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Icons } from '../../utils/icons.util';
import { ToastService } from '../../services/toast.service';
import { ToastComponent } from '../toast/toast.component';
import { ThemeService, Theme } from '../../services/theme.service';
import { ToasterMessages } from '../../utils/messages.util';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ToastComponent, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit, OnDestroy {
  icons = Icons;
  viewMode: 'login' | 'signup' | 'forgot' = 'login';
  email = '';
  password = '';
  showPassword = false;
  name = '';
  loading = false;
  currentTheme: Theme = 'dark';
  private userSub?: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router,
    private toast: ToastService,
    public themeService: ThemeService
  ) {
    this.themeService.theme$.subscribe(t => this.currentTheme = t);
  }

  ngOnInit() {
    // Handles navigation for: cached sessions, popup sign-in, and redirect sign-in after page reload
    this.userSub = this.authService.currentUser$.subscribe(user => {
      if (user) {
        if (user.status === 'PENDING') {
          this.toast.warning(ToasterMessages.auth.pendingApproval);
          return;
        }
        this.toast.success(ToasterMessages.auth.welcomeBack(user.name));
        const dest = user.role === 'ADMIN' ? '/admin' : '/dashboard';
        this.router.navigate([dest], { replaceUrl: true });
      }
    });
  }

  ngOnDestroy() {
    this.userSub?.unsubscribe();
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
    if (!success) {
      this.loading = false;
      this.toast.error(ToasterMessages.auth.loginFailed);
    }
    // Navigation handled by currentUser$ subscription
  }

  async loginWithGoogle() {
    this.loading = true;
    const success = await this.authService.loginWithGoogle();
    if (!success) {
      this.loading = false;
      this.toast.error(ToasterMessages.auth.googleLoginFailed);
    }
    // Navigation handled by currentUser$ subscription
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

