import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Icons } from '../../utils/icons.util';
import { ToastService } from '../../services/toast.service';
import { ToastComponent } from '../toast/toast.component';
import { ThemeService, Theme } from '../../services/theme.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ToastComponent],
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
      this.router.navigate(['/dashboard']);
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
      this.toast.warning('Please enter both email and password.');
      return;
    }
    this.loading = true;
    const success = await this.authService.login(this.email, this.password);
    this.loading = false;
    if (!success) {
      this.toast.error('Invalid credentials. Please check your email and password.');
    }
    // Navigation is handled by AuthService
  }

  async loginWithGoogle() {
    this.loading = true;
    const success = await this.authService.loginWithGoogle();
    this.loading = false;
    if (!success) {
      this.toast.error('Google Sign-In failed. Please try again.');
    }
    // Navigation is handled by AuthService
  }

  async signUp() {
    if (!this.email || !this.password || !this.name) {
      this.toast.warning('Please enter name, email, and password.');
      return;
    }
    this.loading = true;
    const success = await this.authService.signUp(this.email, this.password, this.name);
    this.loading = false;
    if (success) {
      // Stay on signup form, clear fields, show toast
      this.email = ''; this.password = ''; this.name = '';
      this.toast.info('Registration successful! Your account is pending admin approval.');
    } else {
      this.toast.error('Registration failed. Email might already be in use.');
    }
  }

  async resetPassword() {
    if (!this.email) {
      this.toast.warning('Please enter your email to reset password.');
      return;
    }
    this.loading = true;
    const success = await this.authService.resetPassword(this.email);
    if (success) {
      this.toast.success('Password reset email sent! Check your inbox.');
      this.setViewMode('login');
      this.loading = false; // Reset loading only after switching view
    } else {
      this.loading = false;
      this.toast.error('Failed to send reset email. Ensure the email is correct.');
    }
  }
}
