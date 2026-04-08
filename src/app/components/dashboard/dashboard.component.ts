import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../../services/auth.service';
import { InvoiceService, InvoiceRecord } from '../../services/invoice.service';
import { Icons } from '../../utils/icons.util';
import { ToastService } from '../../services/toast.service';
import { SearchService } from '../../services/search.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
  icons = Icons;
  invoices: InvoiceRecord[] = [];
  viewMode: 'grid' | 'list' = 'grid'; // Grid is now default
  activeTab: 'documents' | 'profile' = 'documents'; // Initialized here for type, but reset in ngOnInit

  // Profile Data
  currentUser: User | null = null;
  profileForm = { name: '', companyName: '', companyAddress: '', companyLogoUrl: '' };
  loading = false;
  uploading = false;
 
  // Stats
  get totalRevenue() {
    return this.invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
  }
  get averageValue() {
    return this.invoices.length ? this.totalRevenue / this.invoices.length : 0;
  }
  get invoiceCount() {
    return this.invoices.length;
  }

  // Search and Pagination
  searchTerm: string = '';
  private searchSub?: Subscription;

  currentPage: number = 1;
  pageSize: number = 7; // 1 + 6 (1 for Create Card in grid)

  sortField: keyof InvoiceRecord = 'dateCreated';
  sortOrder: 'asc' | 'desc' = 'desc';

  constructor(
    private auth: AuthService, 
    private invoiceService: InvoiceService,
    private router: Router,
    private toast: ToastService,
    private searchService: SearchService
  ) {
    this.searchSub = this.searchService.searchTerm$.subscribe(term => {
      this.searchTerm = term;
      this.currentPage = 1;
    });
  }

  ngOnInit() {
    this.auth.currentUser$.subscribe(user => {
      if (user) {
        this.currentUser = user;
        this.profileForm = {
          name: user.name || '',
          companyName: user.companyName || '',
          companyAddress: user.companyAddress || '',
          companyLogoUrl: user.companyLogoUrl || ''
        };
        // Initial tab placement: standard users go to profile
        if (user.role !== 'ADMIN') {
          this.activeTab = 'profile';
        } else {
          this.loadInvoices(user.id);
        }
      }
    });
  }

  ngOnDestroy() {
    this.searchSub?.unsubscribe();
  }

  async loadInvoices(userId: string) {
    this.invoices = await this.invoiceService.getInvoices(userId);
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
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  onSearch() {
    this.currentPage = 1; // Reset to page 1 on search
  }

  setSort(field: keyof InvoiceRecord) {
    if (this.sortField === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortOrder = 'asc';
    }
  }

  createNew() {
    this.router.navigate(['/editor']);
  }

  openInvoice(id?: string) {
    if (!id) return;
    this.router.navigate(['/viewer', id]);
  }

  onEdit(id?: string, event?: Event) {
    if (event) event.stopPropagation(); // Don't trigger card click
    if (!id) return;
    this.router.navigate(['/editor', id]);
  }

  async onDelete(id?: string, event?: Event) {
    if (event) event.stopPropagation();
    if (!id) return;
    
    if (confirm('Are you sure you want to delete this invoice?')) {
      try {
        await this.invoiceService.deleteInvoice(id);
        this.toast.success('Invoice deleted successfully');
        this.invoices = this.invoices.filter(i => i.id !== id);
      } catch (err) {
        this.toast.error('Failed to delete invoice');
      }
    }
  }

  // Profile Actions (Requested integration)
  async onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (!file || !this.currentUser) return;

    this.uploading = true;
    try {
      const url = await this.auth.uploadLogo(file, this.currentUser.id);
      this.profileForm.companyLogoUrl = url;
      this.toast.success('Logo uploaded successfully!');
    } catch (error) {
      console.error(error);
      this.toast.error('Failed to upload logo.');
    } finally {
      this.uploading = false;
    }
  }

  async saveProfile() {
    if (!this.currentUser) return;

    this.loading = true;
    try {
      await this.auth.updateProfile(this.currentUser.id, {
        name: this.profileForm.name,
        companyName: this.profileForm.companyName,
        companyAddress: this.profileForm.companyAddress,
        companyLogoUrl: this.profileForm.companyLogoUrl
      });
      this.toast.success('Profile updated successfully!');
    } catch (error) {
      console.error(error);
      this.toast.error('Failed to update profile.');
    } finally {
      this.loading = false;
    }
  }
}
