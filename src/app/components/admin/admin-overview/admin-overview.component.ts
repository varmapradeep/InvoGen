import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService, User } from '../../../services/auth.service';
import { InvoiceService, InvoiceTemplate } from '../../../services/invoice.service';
import { Icons } from '../../../utils/icons.util';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin-overview',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-overview.component.html',
  styleUrl: './admin-overview.component.scss'
})
export class AdminOverviewComponent implements OnInit {
  icons = Icons;
  users: User[] = [];
  templates: InvoiceTemplate[] = [];
  loading = false;

  constructor(
    private authService: AuthService,
    private invoiceService: InvoiceService
  ) {}

  async ngOnInit() {
    this.loading = true;
    try {
      this.users = await this.authService.getAllUsers();
      const all = await this.invoiceService.getTemplates(this.authService.currentUserValue?.id || '');
      this.templates = all.filter(t => t.isPredefined);
    } finally {
      this.loading = false;
    }
  }

  get totalUsers() { return this.users.length; }
  get pendingUsersCount() { return this.users.filter(u => u.status === 'PENDING').length; }
  get activeUsersCount() { return this.users.filter(u => u.status === 'ACTIVE').length; }
  get templateCount() { return this.templates.length; }
}
