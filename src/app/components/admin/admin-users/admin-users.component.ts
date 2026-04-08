import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { Firestore, doc, updateDoc, deleteDoc } from '@angular/fire/firestore';
import { Icons } from '../../../utils/icons.util';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  constructor(
    private authService: AuthService,
    private toast: ToastService,
    private firestore: Firestore,
    private router: Router
  ) {}

  ngOnInit() {
    this.refreshUsers();
  }

  async refreshUsers() {
    this.users = await this.authService.getAllUsers();
  }

  get pagedUsers(): User[] {
    let filtered = [...this.users]; // Cloned to avoid direct mutation of source during sorting/filtering

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

    const start = (this.currentPage - 1) * this.pageSize;
    return sorted.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.users.length / this.pageSize) || 1;
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
    this.toast.success('Approved');
    this.refreshUsers();
  }

  async unapproveUser(userId: string) {
    const user = this.users.find(u => u.id === userId);
    if (user?.role === 'ADMIN') return;

    const userDocRef = doc(this.firestore, `users/${userId}`);
    await updateDoc(userDocRef, { status: 'PENDING' });
    this.toast.warning('Access revoked');
    this.refreshUsers();
  }

  async deleteUser(user: User) {
    if (user.role === 'ADMIN') return;
    if (!confirm(`Delete ${user.name}?`)) return;
    
    try {
      const userDocRef = doc(this.firestore, `users/${user.id}`);
      await deleteDoc(userDocRef);
      this.toast.success('Deleted');
      this.refreshUsers();
    } catch (err) {
      this.toast.error('Failed to delete');
    }
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
      const userDocRef = doc(this.firestore, `users/${this.editingUser.id}`);
      await updateDoc(userDocRef, {
        name: this.editForm.name,
        role: this.editForm.role,
        status: this.editForm.status
      });
      this.toast.success('Updated');
      this.closeEdit();
      this.refreshUsers();
    } catch (err) {
      this.toast.error('Failed to update');
    }
  }
}
