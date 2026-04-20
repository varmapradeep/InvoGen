import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../../../services/auth.service';
import { InvoiceService, InvoiceRecord } from '../../../services/invoice.service';
import { Icons } from '../../../utils/icons.util';
import { ToastService } from '../../../services/toast.service';
import { SearchService } from '../../../services/search.service';
import { ToasterMessages } from '../../../utils/messages.util';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-user-documents',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './user-documents.component.html',
  styleUrl: './user-documents.component.scss'
})
export class UserDocumentsComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private invoiceService = inject(InvoiceService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private searchService = inject(SearchService);

  icons = Icons;
  invoices: InvoiceRecord[] = [];
  viewMode: 'grid' | 'list' = 'grid';
  currentUser: User | null = null;
  loading = false;

  // Search and Pagination
  searchTerm: string = '';
  private searchSub?: Subscription;
  currentPage: number = 1;
  pageSize: number = 8; 

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
    } finally {
      this.loading = false;
    }
  }

  get filteredInvoices() {
    const sorted = [...this.invoices].sort((a: any, b: any) => {
      const valA = (a[this.sortField] || '').toString().toLowerCase();
      const valB = (b[this.sortField] || '').toString().toLowerCase();
      
      if (this.sortField === 'dateCreated') {
         const dA = new Date(valA).getTime();
         const dB = new Date(valB).getTime();
         if (!isNaN(dA) && !isNaN(dB)) {
           return this.sortOrder === 'asc' ? dA - dB : dB - dA;
         }
      }

      if (valA < valB) return this.sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    if (!this.searchTerm.trim()) return sorted;

    const term = this.searchTerm.toLowerCase();
    return sorted.filter(inv => 
      inv.customerName?.toLowerCase().includes(term) || 
      inv.invoiceNo?.toLowerCase().includes(term)
    );
  }

  get pagedInvoices() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredInvoices.slice(start, start + this.pageSize);
  }

  get totalPages() {
    return Math.ceil(this.filteredInvoices.length / this.pageSize);
  }

  setPage(page: number) {
    if (page >= 1 && page <= this.totalPages) this.currentPage = page;
  }

  setSort(field: keyof InvoiceRecord) {
    if (this.sortField === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortOrder = 'asc';
    }
  }

  onEdit(id?: string, event?: Event) {
    if (event) event.stopPropagation();
    if (!id) return;
    this.router.navigate(['/editor', id]);
  }

  async onDelete(id?: string, event?: Event) {
    if (event) event.stopPropagation();
    if (!id || !confirm('Are you sure you want to delete this invoice?')) return;
    
    try {
      await this.invoiceService.deleteInvoice(id);
      this.toast.success(ToasterMessages.invoices.deleteSuccess);
      this.invoices = this.invoices.filter(i => i.id !== id);
    } catch (err) {
      this.toast.error(ToasterMessages.invoices.deleteFailed);
    }
  }

  openInvoice(id?: string) {
    if (!id) return;
    this.router.navigate(['/viewer', id]);
  }
}
