import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { Icons } from '../../utils/icons.util';
import { ToasterMessages } from '../../utils/messages.util';
import { ImageCropperModalComponent } from '../shared/image-cropper/image-cropper.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, ImageCropperModalComponent],
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
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  showPasswordModal = false;

  loading = false;
  uploading = false;
  passwordLoading = false;

  // Cropper state
  showCropper = false;
  imageChangedEvent: any = '';

  constructor(
    private authService: AuthService, 
    private toast: ToastService
  ) { }

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

  onFileSelected(event: any) {
    if (event.target.files && event.target.files.length > 0) {
      this.imageChangedEvent = event;
      this.showCropper = true;
    }
  }

  async onImageCropped(blob: Blob) {
    if (!this.currentUser) return;
    this.showCropper = false;
    this.uploading = true;
    
    try {
      const file = new File([blob], 'logo.png', { type: 'image/png' });
      const url = await this.authService.uploadLogo(file, this.currentUser.id);
      this.profileForm.companyLogoUrl = url;
      this.toast.success(ToasterMessages.profile.logoSuccess);
    } catch (error) {
      console.error(error);
      this.toast.error(ToasterMessages.profile.logoFailed);
    } finally {
      this.uploading = false;
      this.imageChangedEvent = '';
    }
  }

  async saveProfile() {
    if (!this.currentUser) return;
    if (!this.profileForm.name.trim()) {
      this.toast.error(ToasterMessages.profile.nameRequired);
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
      this.toast.success(ToasterMessages.profile.updateSuccess);
    } catch (error) {
      console.error(error);
      this.toast.error(ToasterMessages.profile.updateFailed);
    } finally {
      this.loading = false;
    }
  }

  openPasswordModal() {
    this.passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
    this.showPasswordModal = true;
  }

  closePasswordModal() {
    this.showPasswordModal = false;
  }

  async changePassword() {
    if (!this.passwordForm.currentPassword) {
      this.toast.error(ToasterMessages.profile.passwordRequired);
      return;
    }
    if (!this.passwordForm.newPassword) {
      this.toast.error(ToasterMessages.profile.newPasswordRequired);
      return;
    }
    if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      this.toast.error(ToasterMessages.profile.passwordsMismatch);
      return;
    }
    if (this.passwordForm.newPassword.length < 6) {
      this.toast.error(ToasterMessages.profile.passwordTooShort);
      return;
    }

    this.passwordLoading = true;
    try {
      await this.authService.reauthenticate(this.passwordForm.currentPassword);
      await this.authService.changeUserPassword(this.passwordForm.newPassword);
      this.toast.success(ToasterMessages.profile.passwordUpdateSuccess);
      this.closePasswordModal();
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        this.toast.error(ToasterMessages.profile.wrongCurrentPassword);
      } else if (error.code === 'auth/requires-recent-login') {
        this.toast.error(ToasterMessages.profile.requiresRecentLogin);
      } else {
        this.toast.error(ToasterMessages.profile.genericPasswordError);
      }
    } finally {
      this.passwordLoading = false;
    }
  }
}
