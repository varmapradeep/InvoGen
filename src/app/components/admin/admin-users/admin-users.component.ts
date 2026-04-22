import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { Icons } from '../../../utils/icons.util';
import { Router } from '@angular/router';
import { ToasterMessages } from '../../../utils/messages.util';
import { ConfirmModalComponent } from '../../shared/confirm-modal/confirm-modal.component';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmModalComponent],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.scss'
})
export class AdminUserManagementComponent implements OnInit {
  icons = Icons;
  users: User[] = [];
  
  searchQuery: string = '';
  statusFilter: 'ALL' | 'ACTIVE' | 'PENDING' = 'ALL';
  sortField: keyof User = 'name';
  sortOrder: 'asc' | 'desc' = 'asc';
  pageSize = 10;
  currentPage = 1;

  editingUser: User | null = null;
  editForm = { name: '', email: '', role: 'USER' as 'ADMIN' | 'USER', status: 'ACTIVE' as 'ACTIVE' | 'PENDING' };

  // Confirm modal state
  showConfirmModal = false;
  confirmTitle = '';
  confirmMessage = '';
  pendingConfirmAction: (() => Promise<void>) | null = null;

  constructor(
    private authService: AuthService,
    private toast: ToastService,
    private router: Router
  ) {}

  ngOnInit() {
    this.refreshUsers();
  }

  async refreshUsers() {
    this.users = await this.authService.getAllUsers();
  }

  get pagedUsers(): User[] {
    let filtered = [...this.users];

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(u => 
        u.name.toLowerCase().includes(q) || 
        u.email.toLowerCase().includes(q)
      );
    }

    if (this.statusFilter !== 'ALL') {
      filtered = filtered.filter(u => u.status === this.statusFilter);
    }

    const sorted = filtered.sort((a, b) => {
      const valA = (a[this.sortField] || '').toString().toLowerCase();
      const valB = (b[this.sortField] || '').toString().toLowerCase();
      if (valA < valB) return this.sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    // Store filtered length for totalPages calculation
    this._filteredCount = sorted.length;

    const start = (this.currentPage - 1) * this.pageSize;
    return sorted.slice(start, start + this.pageSize);
  }

  private _filteredCount = 0;

  get totalPages(): number {
    return Math.ceil(this._filteredCount / this.pageSize) || 1;
  }

  get filteredPages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  setSort(field: keyof User) {
    if (this.sortField === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortOrder = 'asc';
    }
  }

  async approveUser(userId: string) {
    const user = this.users.find(u => u.id === userId);
    if (user?.role === 'ADMIN') return;
    
    await this.authService.approveUser(userId);
    this.toast.success(ToasterMessages.admin.userApproved);
    this.refreshUsers();
  }

  async unapproveUser(userId: string) {
    const user = this.users.find(u => u.id === userId);
    if (user?.role === 'ADMIN') return;

    await this.authService.unapproveUser(userId);
    this.toast.warning(ToasterMessages.admin.userRevoked);
    this.refreshUsers();
  }

  deleteUser(user: User) {
    if (user.role === 'ADMIN') return;
    this.confirmTitle = 'Delete User';
    this.confirmMessage = `Delete "${user.name}"? Their Firestore record will be removed. Note: Firebase Auth account requires a Cloud Function to fully delete.`;
    this.pendingConfirmAction = async () => {
      await this.authService.deleteUserFromFirestore(user.id);
      this.toast.success(ToasterMessages.admin.userDeleted);
      this.refreshUsers();
    };
    this.showConfirmModal = true;
  }

  async onConfirmAction() {
    if (this.pendingConfirmAction) {
      try {
        await this.pendingConfirmAction();
      } catch (err) {
        this.toast.error('Operation failed.');
      } finally {
        this.closeConfirm();
      }
    }
  }

  closeConfirm() {
    this.showConfirmModal = false;
    this.pendingConfirmAction = null;
  }

  openEdit(user: User) {
    this.editingUser = user;
    this.editForm = { name: user.name, email: user.email, role: user.role, status: user.status };
  }

  closeEdit() {
    this.editingUser = null;
  }

  async saveEdit() {
    if (!this.editingUser) return;
    try {
      await this.authService.updateProfile(this.editingUser.id, {
        name: this.editForm.name,
        role: this.editForm.role,
        status: this.editForm.status
      });
      this.toast.success('Account updated successfully!');
      this.closeEdit();
      this.refreshUsers();
    } catch (err) {
      this.toast.error('Failed to update');
    }
  }
}
