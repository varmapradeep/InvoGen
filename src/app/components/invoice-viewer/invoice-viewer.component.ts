import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { InvoiceService, InvoiceRecord, InvoiceSession } from '../../services/invoice.service';

@Component({
  selector: 'app-invoice-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './invoice-viewer.component.html',
  styleUrl: './invoice-viewer.component.scss'
})
export class InvoiceViewerComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);
  private invoiceService = inject(InvoiceService);

  invoice: InvoiceRecord | null = null;
  sessions: InvoiceSession[] = [];
  theme: any = { primaryColor: '#7c3aed' };
  
  currentUser: User | null = null;
  loading = true;

  async ngOnInit() {
    this.auth.currentUser$.subscribe(user => {
      this.currentUser = user;
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.invoice = await this.invoiceService.getInvoiceById(id);
      if (this.invoice && this.invoice.fullData) {
        this.sessions = this.invoice.fullData.sessions;
        this.theme = this.invoice.fullData.theme;
      }
    }
    this.loading = false;
  }

  get grandTotal() {
    return this.invoice?.totalAmount || 0;
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  printInvoice() {
    window.print();
  }
}
