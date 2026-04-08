import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, User } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { Icons } from '../../../utils/icons.util';

@Component({
  selector: 'app-user-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-create.component.html',
  styleUrl: './user-create.component.scss'
})
export class UserCreateComponent {
  icons = Icons;
  showPassword = false;
  
  newUser = {
    name: '',
    email: '',
    password: '',
    role: 'USER' as 'ADMIN' | 'USER',
    companyName: '',
    companyAddress: '',
    companyLogoUrl: ''
  };

  uploading = false;
  loading = false;

  constructor(
    private authService: AuthService,
    private toast: ToastService,
    private router: Router
  ) {}

  async onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (!file) return;

    this.uploading = true;
    try {
      // We need a temporary or unique ID for the user's logo before they are created
      // Or we can just use the email as a prefix for now
      const tempId = this.newUser.email || 'temp_' + Date.now();
      const url = await this.authService.uploadLogo(file, tempId);
      this.newUser.companyLogoUrl = url;
      this.toast.success('Logo uploaded successfully!');
    } catch (error) {
      this.toast.error('Failed to upload logo.');
    } finally {
      this.uploading = false;
    }
  }

  async createUser() {
    const { email, password, name, role } = this.newUser;
    if (!email || !password || !name) {
      this.toast.warning('Please fill all required fields (Name, Email, Password).');
      return;
    }

    this.loading = true;
    try {
      const userObj: User = {
        id: '', // Will be set by Firebase Auth UID in the service
        name,
        email,
        role,
        status: 'ACTIVE',
        companyName: this.newUser.companyName,
        companyAddress: this.newUser.companyAddress,
        companyLogoUrl: this.newUser.companyLogoUrl
      };
      
      await this.authService.saveUser(userObj, password);
      this.toast.success(`Account for ${name} created successfully!`);
      this.router.navigate(['/admin']);
    } catch (err: any) {
      this.toast.error(err?.message || 'Failed to create user.');
    } finally {
      this.loading = false;
    }
  }

  goBack() {
    this.router.navigate(['/admin']);
  }
}
