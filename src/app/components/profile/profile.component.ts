import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { Icons } from '../../utils/icons.util';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  icons = Icons;
  currentUser: User | null = null;
  
  profileForm = {
    name: '',
    companyName: '',
    companyAddress: '',
    companyLogoUrl: '',
    phone: '',
    taxId: '',
    website: ''
  };

  passwordForm = {
    newPassword: '',
    confirmPassword: ''
  };
  
  loading = false;
  uploading = false;
  passwordLoading = false;

  constructor(private authService: AuthService, private toast: ToastService) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.currentUser = user;
        this.profileForm = {
          name: user.name || '',
          companyName: user.companyName || '',
          companyAddress: user.companyAddress || '',
          companyLogoUrl: user.companyLogoUrl || '',
          phone: user.phone || '',
          taxId: user.taxId || '',
          website: user.website || ''
        };
      }
    });
  }

  async onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (!file || !this.currentUser) return;

    this.uploading = true;
    try {
      const url = await this.authService.uploadLogo(file, this.currentUser.id);
      this.profileForm.companyLogoUrl = url;
      this.toast.success('Professional logo uploaded!');
    } catch (error) {
      console.error(error);
      this.toast.error('Logo upload failed.');
    } finally {
      this.uploading = false;
    }
  }

  async saveProfile() {
    if (!this.currentUser) return;
    if (!this.profileForm.name.trim()) {
      this.toast.error('Name cannot be empty.');
      return;
    }

    this.loading = true;
    try {
      await this.authService.updateProfile(this.currentUser.id, {
        name: this.profileForm.name,
        companyName: this.profileForm.companyName,
        companyAddress: this.profileForm.companyAddress,
        companyLogoUrl: this.profileForm.companyLogoUrl,
        phone: this.profileForm.phone,
        taxId: this.profileForm.taxId,
        website: this.profileForm.website
      });
      this.toast.success('Account info updated successfully!');
    } catch (error) {
      console.error(error);
      this.toast.error('Failed to update account.');
    } finally {
      this.loading = false;
    }
  }

  async changePassword() {
    if (!this.passwordForm.newPassword) {
      this.toast.error('Please enter a new password.');
      return;
    }
    if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      this.toast.error('Passwords do not match.');
      return;
    }
    if (this.passwordForm.newPassword.length < 6) {
      this.toast.error('Password must be at least 6 characters.');
      return;
    }

    this.passwordLoading = true;
    try {
      await this.authService.changeUserPassword(this.passwordForm.newPassword);
      this.toast.success('Password updated successfully!');
      this.passwordForm = { newPassword: '', confirmPassword: '' };
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/requires-recent-login') {
        this.toast.error('For security, please log out and log back in before changing your password.');
      } else {
        this.toast.error('Failed to update password. Please try again.');
      }
    } finally {
      this.passwordLoading = false;
    }
  }
}
