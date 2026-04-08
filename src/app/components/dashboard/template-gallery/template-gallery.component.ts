import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MASTER_DESIGNS } from '../../../utils/master-templates.util';
import { Icons } from '../../../utils/icons.util';
import { InvoiceTemplate } from '../../../services/invoice.service';

@Component({
  selector: 'app-template-gallery',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './template-gallery.component.html',
  styleUrl: './template-gallery.component.scss'
})
export class TemplateGalleryComponent implements OnInit {
  icons = Icons;
  masterTemplates: InvoiceTemplate[] = MASTER_DESIGNS;

  constructor(public router: Router) {}

  ngOnInit() {}

  useTemplate(template: InvoiceTemplate) {
    this.router.navigate(['/editor'], { queryParams: { templateId: template.id } });
  }
}
