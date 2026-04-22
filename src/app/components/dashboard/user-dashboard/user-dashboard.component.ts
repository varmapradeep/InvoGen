import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../../../services/auth.service';
import { InvoiceService, InvoiceRecord } from '../../../services/invoice.service';
import { Icons } from '../../../utils/icons.util';
import { ToastService } from '../../../services/toast.service';
import { SearchService } from '../../../services/search.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-dashboard.component.html',
  styleUrl: './user-dashboard.component.scss'
})
export class UserDashboardComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private invoiceService = inject(InvoiceService);
  public router = inject(Router);
  private toast = inject(ToastService);
  private searchService = inject(SearchService);

  icons = Icons;
  invoices: InvoiceRecord[] = [];
  templates: any[] = [];
  viewMode: 'grid' | 'list' = 'grid';
  currentUser: User | null = null;
  loading = false;

  // Search and Pagination
  searchTerm: string = '';
  private searchSub?: Subscription;
  currentPage: number = 1;
  pageSize: number = 7; 

  sortField: keyof InvoiceRecord = 'dateCreated';
  sortOrder: 'asc' | 'desc' = 'desc';

  constructor() {
    this.searchSub = this.searchService.searchTerm$.subscribe({
      next: (term: string) => {
        this.searchTerm = term;
        this.currentPage = 1;
      }
    });
  }

  get totalRevenue() {
    // Only count finalized (non-draft) invoices for revenue display
    return this.invoices
      .filter((inv: InvoiceRecord) => !inv.isDraft)
      .reduce((sum: number, inv: InvoiceRecord) => sum + (inv.totalAmount || 0), 0);
  }
  
  get invoiceCount() {
    // Count finalized invoices only
    return this.invoices.filter((inv: InvoiceRecord) => !inv.isDraft).length;
  }

  ngOnInit() {
    this.auth.currentUser$.subscribe({
      next: (user: User | null) => {
        if (user) {
          this.currentUser = user;
          this.loadInvoices(user.id);
        }
      }
    });
  }

  ngOnDestroy() {
    this.searchSub?.unsubscribe();
  }

  async loadInvoices(userId: string) {
    this.loading = true;
    try {
      this.invoices = await this.invoiceService.getInvoices(userId);
      this.templates = await this.invoiceService.getTemplates(userId);
    } finally {
      this.loading = false;
    }
  }

  useTemplate(id?: string) {
    if (!id) return;
    this.router.navigate(['/editor'], { queryParams: { templateId: id } });
  }
}
