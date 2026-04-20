import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { InvoiceService, InvoiceTemplate, InvoiceRecord } from '../../../services/invoice.service';
import { ToastService } from '../../../services/toast.service';
import { Icons } from '../../../utils/icons.util';
import { Router } from '@angular/router';
import { ToasterMessages } from '../../../utils/messages.util';

import { InvoiceThumbnailComponent } from '../../shared/invoice-thumbnail/invoice-thumbnail.component';
import { ConfirmModalComponent } from '../../shared/confirm-modal/confirm-modal.component';

@Component({
  selector: 'app-admin-designs',
  standalone: true,
  imports: [CommonModule, FormsModule, InvoiceThumbnailComponent, ConfirmModalComponent],
  templateUrl: './admin-designs.component.html',
  styleUrl: './admin-designs.component.scss'
})
export class AdminDesignCenterComponent implements OnInit {
  icons = Icons;
  templates: InvoiceTemplate[] = [];
  drafts: InvoiceRecord[] = []; // NEW: User's own WIP designs
  loading = false;
  activeSection: 'templates' | 'drafts' = 'templates';
  
  // Confirm Modal State
  showConfirmModal = false;
  confirmTitle = '';
  confirmMessage = '';
  pendingDeleteAction: (() => Promise<void>) | null = null;

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
      const userId = this.authService.currentUserValue?.id || '';
      const allTemplates = await this.invoiceService.getTemplates(userId);
      this.templates = allTemplates.filter(t => t.isPredefined || t.visibility === 'public');
      
      const allInvoices = await this.invoiceService.getInvoices(userId);
      this.drafts = allInvoices.filter(i => i.isDraft);
    } finally {
      this.loading = false;
    }
  }

  createTemplate() {
    this.router.navigate(['/editor'], { queryParams: { mode: 'template', fresh: 'true' } });
  }

  editTemplate(template: InvoiceTemplate) {
    this.router.navigate(['/editor'], { queryParams: { mode: 'template', id: template.id } });
  }

  openDraft(draft: InvoiceRecord) {
    this.router.navigate(['/editor', draft.id]);
  }

  async deleteTemplate(id?: string) {
    if (!id) return;
    this.confirmTitle = 'Delete Template';
    this.confirmMessage = 'Are you sure you want to delete this design template? This action cannot be undone.';
    this.pendingDeleteAction = async () => {
      await this.invoiceService.deleteTemplate(id);
      this.toast.success('Design template removed.');
      this.refreshTemplates();
    };
    this.showConfirmModal = true;
  }

  async deleteDraft(id?: string) {
    if (!id) return;
    this.confirmTitle = 'Delete Draft';
    this.confirmMessage = 'Are you sure you want to delete this unfinished draft? This action cannot be undone.';
    this.pendingDeleteAction = async () => {
      await this.invoiceService.deleteInvoice(id);
      this.toast.success('Draft removed.');
      this.refreshTemplates();
    };
    this.showConfirmModal = true;
  }

  async onConfirmDelete() {
    if (this.pendingDeleteAction) {
      try {
        await this.pendingDeleteAction();
      } catch (err) {
        this.toast.error('Failed to remove record.');
      } finally {
        this.closeConfirm();
      }
    }
  }

  closeConfirm() {
    this.showConfirmModal = false;
    this.pendingDeleteAction = null;
  }
}
