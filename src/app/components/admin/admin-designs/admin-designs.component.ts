import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { InvoiceService, InvoiceTemplate } from '../../../services/invoice.service';
import { ToastService } from '../../../services/toast.service';
import { Icons } from '../../../utils/icons.util';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-designs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-designs.component.html',
  styleUrl: './admin-designs.component.scss'
})
export class AdminDesignCenterComponent implements OnInit {
  icons = Icons;
  templates: InvoiceTemplate[] = [];
  loading = false;

  constructor(
    private authService: AuthService,
    private invoiceService: InvoiceService,
    private toast: ToastService,
    private router: Router
  ) {}

  ngOnInit() {
    this.refreshTemplates();
  }

  async refreshTemplates() {
    this.loading = true;
    try {
      const all = await this.invoiceService.getTemplates(this.authService.currentUserValue?.id || '');
      this.templates = all.filter(t => t.isPredefined);
    } finally {
      this.loading = false;
    }
  }

  createTemplate() {
    this.router.navigate(['/editor'], { queryParams: { mode: 'template', isPredefined: 'true' } });
  }

  editTemplate(template: InvoiceTemplate) {
    this.router.navigate(['/editor'], { queryParams: { mode: 'template', id: template.id } });
  }

  async deleteTemplate(id?: string) {
    if (!id || !confirm('Delete this design template?')) return;
    try {
      await this.invoiceService.deleteTemplate(id);
      this.toast.success('Template deleted');
      this.refreshTemplates();
    } catch (err) {
      this.toast.error('Failed to delete');
    }
  }
}
