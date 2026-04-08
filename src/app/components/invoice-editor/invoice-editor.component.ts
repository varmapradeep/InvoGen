import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { InvoiceService, InvoiceRecord, InvoiceSession, InvoiceTheme, InvoiceTemplate } from '../../services/invoice.service';
import { LayoutService } from '../../services/layout.service';
import { Icons } from '../../utils/icons.util';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-invoice-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './invoice-editor.component.html',
  styleUrl: './invoice-editor.component.scss',
  host: {
    'style': 'display: block; height: 100%; overflow: hidden;'
  }
})
export class InvoiceEditorComponent implements OnInit, OnDestroy, AfterViewInit {
  icons = Icons;
  @ViewChild('previewScrollArea') previewScrollArea!: ElementRef;
  // Session Builder Model
  sessions: InvoiceSession[] = [];
  theme: InvoiceTheme = { 
    primaryColor: '#000000', 
    fontFamily: 'Inter',
    currency: { code: 'USD', symbol: '$' },
    discount: { type: 'percent', value: 0 },
    shipping: 0
  };
  
  invoiceNo: string = '';
  invoiceDate: string = '';
  customerName: string = '';
  
  editId: string | null = null;
  activeTab: 'content' | 'design' | 'settings' = 'content';
  isSaving = false;
  isSaved = false;
  isTemplateMode = false;
  templateId: string | null = null;
  currentUser: any = null;

  // UI State
  zoomLevel: number = 0.5;
  selectedSessionId: string | null = null;
  selectedColumnId: string | null = null;
  showLayoutPicker: boolean = false;
  activeInspectorTab: 'content' | 'styles' = 'content';
  expandedRows: { [rowId: string]: boolean } = {};
  customNames: { [id: string]: string } = {};       // user-defined names for rows/cols
  editingNameId: string | null = null;              // which node is being renamed
  expandedSections: { [key: string]: boolean } = {
    'branding': true,
    'parties': true,
    'items': true,
    'finance': false,
    'footer': false
  };

  // Mobile Responsiveness State
  mobileActiveView: 'layers' | 'canvas' | 'properties' = 'canvas';

  // Pinch-to-zoom state
  private _pinchStartDist: number = 0;
  private _pinchStartZoom: number = 0.5;
  private _isPinching: boolean = false;

  // Undo / Redo
  private _history: InvoiceSession[][] = [];
  private _redoStack: InvoiceSession[][] = [];
  get canUndo() { return this._history.length > 0; }
  get canRedo() { return this._redoStack.length > 0; }

  /** All column element-list drop IDs — used to connect cross-column DnD */
  get allElementDropListIds(): string[] {
    const ids: string[] = [];
    for (const row of this.sessions) {
      if (row.sessions) {
        for (const col of row.sessions) ids.push('el-list-' + col.id);
      }
    }
    return ids;
  }

  fonts = ['Inter', 'Roboto', 'Outfit', 'Playfair Display', 'Poppins'];
  currencies = [
    { code: 'USD', symbol: '$' },
    { code: 'INR', symbol: 'Rs.' },
    { code: 'EUR', symbol: '€' },
    { code: 'GBP', symbol: '£' }
  ];
  
  constructor(
    public auth: AuthService,
    private invoiceService: InvoiceService,
    public router: Router,
    private route: ActivatedRoute,
    private toast: ToastService,
    private layoutService: LayoutService
  ) {}

  exitEditor() {
    if (this.currentUser?.role === 'ADMIN') {
      this.router.navigate(['/admin/designs']);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  async ngOnInit() {
    this.layoutService.setSidebarCollapsed(true);
    
    this.auth.currentUser$.subscribe(user => {
      this.currentUser = user;
    });

    this.route.params.subscribe(async params => {
      this.isTemplateMode = this.route.snapshot.queryParams['mode'] === 'template';
      this.templateId = this.route.snapshot.queryParams['id'];

      if (params['id']) {
        this.editId = params['id'];
        await this.loadInvoice(this.editId!);
      } else if (this.isTemplateMode && this.templateId) {
        await this.loadTemplate(this.templateId);
      } else if (this.route.snapshot.queryParams['templateId']) {
        await this.loadTemplate(this.route.snapshot.queryParams['templateId']);
      } else {
        this.initNewInvoice();
      }
    });
  }

  ngOnDestroy(): void {
    this.layoutService.setSidebarCollapsed(false);
  }

  initNewInvoice() {
    this.invoiceNo = this.generateInvoiceNumber();
    this.invoiceDate = new Date().toISOString().split('T')[0];
    this.theme = { 
      primaryColor: '#000000', 
      fontFamily: 'Inter',
      currency: { code: 'USD', symbol: '$' },
      discount: { type: 'percent', value: 0 },
      shipping: 0
    };
    this.sessions = [];
  }

  async loadInvoice(id: string) {
    const data = await this.invoiceService.getInvoiceById(id);
    if (data && data.fullData) {
      this.sessions = JSON.parse(JSON.stringify(data.fullData.sessions));
      this.theme = { ...data.fullData.theme };
      this.invoiceNo = data.invoiceNo;
      this.invoiceDate = data.dateCreated;
      this.customerName = data.customerName;
      this.initExpandedRows();
    }
  }

  async loadTemplate(id: string) {
    const templates = await this.invoiceService.getTemplates(this.currentUser?.id || '');
    const template = templates.find(t => t.id === id);
    if (template) {
       this.sessions = JSON.parse(JSON.stringify(template.fullData.sessions));
       this.theme = { ...template.fullData.theme };
       const header = this.sessions.find(s => s.type === 'header');
       if (header && this.currentUser?.companyLogoUrl) {
         header.content = { ...header.content, customLogo: this.currentUser.companyLogoUrl };
       }
       this.invoiceNo = this.generateInvoiceNumber();
       this.invoiceDate = new Date().toISOString().split('T')[0];
       this.initExpandedRows();
    }
  }

  /** Collapse all rows on load (so user can selectively expand) */
  private initExpandedRows() {
    this.expandedRows = {};
    for (const row of this.sessions) this.expandedRows[row.id] = false;
  }

  // --- Rename ---
  getDisplayName(id: string, fallback: any): string {
    return this.customNames[id] || (typeof fallback === 'string' ? fallback : String(fallback));
  }
  startRename(id: string, event: Event) {
    event.stopPropagation();
    this.editingNameId = id;
  }
  confirmRename(id: string, value: string) {
    if (value.trim()) this.customNames[id] = value.trim();
    this.editingNameId = null;
  }

  // --- Getters ---
  get selectedSession(): InvoiceSession | undefined {
    if (!this.selectedSessionId) return undefined;
    return this.findSessionByIdRecursive(this.sessions, this.selectedSessionId);
  }

  get selectedContainerSessions(): InvoiceSession[] {
    if (!this.selectedSessionId) return [];
    const id = this.selectedSessionId;
    const session = this.findSessionByIdRecursive(this.sessions, id);
    return session?.sessions || [];
  }

  get subtotal(): number {
    const itemsSession = this.findSessionRecursive(this.sessions, 'items');
    if (!itemsSession || !itemsSession.content) return 0;
    return itemsSession.content.reduce((sum: number, item: any) => sum + (item.qty * item.rate), 0);
  }

  get taxRate(): number {
    const taxSession = this.findSessionRecursive(this.sessions, 'tax');
    return taxSession?.content?.rate || 0;
  }

  get taxAmount(): number { return this.subtotal * (this.taxRate / 100); }

  get discountAmount(): number {
    if (!this.theme.discount) return 0;
    const base = this.subtotal + this.taxAmount;
    return this.theme.discount.type === 'percent' ? base * (this.theme.discount.value / 100) : this.theme.discount.value;
  }

  get grandTotal(): number {
    const total = this.subtotal + this.taxAmount - this.discountAmount + (this.theme.shipping || 0);
    return Math.max(0, total);
  }

  // --- Undo / Redo ---
  private snapshot() {
    this._history.push(JSON.parse(JSON.stringify(this.sessions)));
    this._redoStack = []; // clear redo on new action
    if (this._history.length > 50) this._history.shift(); // cap at 50
  }
  undo() {
    if (!this.canUndo) return;
    this._redoStack.push(JSON.parse(JSON.stringify(this.sessions)));
    this.sessions = this._history.pop()!;
    this.selectedSessionId = null;
    this.selectedColumnId = null;
  }
  redo() {
    if (!this.canRedo) return;
    this._history.push(JSON.parse(JSON.stringify(this.sessions)));
    this.sessions = this._redoStack.pop()!;
    this.selectedSessionId = null;
    this.selectedColumnId = null;
  }

  // --- Session Management ---
  addLayoutRow(colCount: number) {
    this.snapshot();
    const rowId = 'row-' + Date.now();
    const columns: InvoiceSession[] = [];
    const colWidth = 100 / colCount;
    for (let i = 0; i < colCount; i++) {
      columns.push({
        id: `col-${rowId}-${i}`,
        type: 'layout-column',
        width: colWidth,
        sessions: [],
        order: i
      });
    }
    const newRow: InvoiceSession = {
      id: rowId,
      type: 'layout-row',
      sessions: columns,
      order: this.sessions.length,
      height: 120
    };
    this.sessions.push(newRow);
    this.expandedRows[rowId] = true;
    this.showLayoutPicker = false;
    this.selectedSessionId = rowId;
    this.toast.success(`Added ${colCount}-column layout row`);
  }

  // Select a column and open inspector (used by empty-column + button)
  selectColumnAndAdd(col: InvoiceSession, event: Event) {
    event.stopPropagation();
    this.selectedColumnId = col.id;
    this.selectedSessionId = col.id;
    this.activeInspectorTab = 'content';
    if (window.innerWidth <= 1024) this.mobileActiveView = 'properties';
  }

  addSession(type: 'header' | 'billed-to' | 'items' | 'tax' | 'note' | 'custom' | 'line' | 'table-custom' | 'field-group' | 'heading' | 'paragraph' | 'image' | 'data-field' | 'spacer') {
    if (!this.selectedColumnId && this.sessions.length > 0) {
      this.toast.warning('Please select a layout column on the canvas first');
      return;
    }
    this.snapshot();
    const newSession: InvoiceSession = {
      id: Date.now().toString(),
      type: type,
      order: 0,
      content: this.getDefaultContent(type),
      alignment: 'left',
      fontSize: type === 'heading' ? 24 : 14,
      fontWeight: type === 'heading' ? 700 : 400,
      textColor: '#1e293b',
      height: type === 'spacer' ? 30 : undefined
    };

    if (this.selectedColumnId) {
      const col = this.findSessionByIdRecursive(this.sessions, this.selectedColumnId);
      if (col && col.sessions) {
        newSession.order = col.sessions.length;
        col.sessions.push(newSession);
      }
    } else {
      this.addLayoutRow(1);
      const firstCol = this.sessions[this.sessions.length-1].sessions![0];
      firstCol.sessions!.push(newSession);
      this.selectedColumnId = firstCol.id;
    }
    this.selectedSessionId = newSession.id;
    this.isSaved = false;
  }

  removeSession(id: string) {
    this.snapshot();
    const removeRecursive = (list: InvoiceSession[]) => {
      const idx = list.findIndex(s => s.id === id);
      if (idx !== -1) {
        list.splice(idx, 1);
        return true;
      }
      for (const s of list) {
        if (s.sessions && removeRecursive(s.sessions)) return true;
      }
      return false;
    };
    removeRecursive(this.sessions);
    this.selectedSessionId = null;
    this.selectedColumnId = null;
    this.isSaved = false;
  }

  updateProperty(session: InvoiceSession, prop: string, value: any) {
    (session as any)[prop] = value;
    this.isSaved = false;
  }

  updateColumnWidth(colId: string, newWidth: number) {
    this.snapshot();
    newWidth = Number(newWidth);
    if (isNaN(newWidth) || newWidth < 1) newWidth = 5;

    for (const row of this.sessions) {
      if (row.type === 'layout-row' && row.sessions) {
        const colIdx = row.sessions.findIndex(c => c.id === colId);
        if (colIdx !== -1) {
          
          if (row.sessions.length > 1) {
            const otherCols = row.sessions.filter((_, idx) => idx !== colIdx);
            
            // Limit the new width so that siblings can retain at least 5% each
            const maxNewWidth = 100 - (otherCols.length * 5);
            newWidth = Math.min(newWidth, maxNewWidth);
            
            const oldWidth = row.sessions[colIdx].width;
            const delta = newWidth - oldWidth;
            const totalOtherWidth = otherCols.reduce((sum, c) => sum + c.width, 0);

            if (totalOtherWidth > 0 && delta !== 0) {
              otherCols.forEach(c => {
                c.width = Math.max(5, c.width - (delta * (c.width / totalOtherWidth)));
              });
            }
          } else {
             newWidth = 100; // Standalone column takes the full row regardless of input
          }
          
          row.sessions[colIdx].width = newWidth;
          
          // Final safety clamping - ensure row precisely equals 100%
          const totalWidth = row.sessions.reduce((sum, c) => sum + c.width, 0);
          if (Math.abs(totalWidth - 100) > 0.01) {
             const diff = 100 - totalWidth;
             if (row.sessions.length > 1) {
                const otherCols = row.sessions.filter((_, idx) => idx !== colIdx);
                const distribute = diff / otherCols.length;
                otherCols.forEach(c => c.width += distribute);
             }
          }
          break;
        }
      }
    }
  }

  // --- Search Helpers ---
  findSessionRecursive(sessions: InvoiceSession[], type: string): InvoiceSession | undefined {
    for (const s of sessions) {
      if (s.type === type) return s;
      if (s.sessions) {
        const found = this.findSessionRecursive(s.sessions, type);
        if (found) return found;
      }
    }
    return undefined;
  }

  findSessionByIdRecursive(sessions: InvoiceSession[], id: string): InvoiceSession | undefined {
    for (const s of sessions) {
      if (s.id === id) return s;
      if (s.sessions) {
        const found = this.findSessionByIdRecursive(s.sessions, id);
        if (found) return found;
      }
    }
    return undefined;
  }

  findParentRow(sessionId: string): InvoiceSession | undefined {
    for (const row of this.sessions) {
      if (row.id === sessionId) return row;
      if (row.sessions) {
        const found = row.sessions.find(c => c.id === sessionId || (c.sessions && c.sessions.some(s => s.id === sessionId)));
        if (found) return row;
      }
    }
    return undefined;
  }

  // --- Content Helpers ---
  getDefaultContent(type: string) {
    const userLogo = this.currentUser?.companyLogoUrl || null;
    switch (type) {
      case 'header': return { logoSize: 60, customLogo: userLogo };
      case 'billed-to': return { fromName: this.currentUser?.companyName || '', fromAddress: this.currentUser?.companyAddress || '', name: '', address: '' };
      case 'items': return [{ description: 'New Service', qty: 1, rate: 0 }];
      case 'tax': return { rate: 0 };
      case 'heading': return 'New Heading';
      case 'paragraph': return 'Enter your paragraph text here...';
      case 'image': return '';
      case 'data-field': return 'invoiceNo';
      case 'spacer': return null;
      default: return '';
    }
  }

  getDataFieldValue(field: string): string {
    switch(field) {
      case 'invoiceNo': return this.invoiceNo;
      case 'date': return this.invoiceDate;
      case 'total': return `${this.theme.currency?.symbol}${this.grandTotal.toFixed(2)}`;
      case 'clientName': return this.findSessionRecursive(this.sessions, 'billed-to')?.content.name || 'Client Name';
      case 'companyName': return this.currentUser?.companyName || 'Company Name';
      default: return 'Value';
    }
  }

  onSessionImageUpload(event: any, session: InvoiceSession) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => { session.content = e.target.result; this.isSaved = false; };
      reader.readAsDataURL(file);
    }
  }

  ngAfterViewInit() {
    // We keep the initial 0.5 zoom as requested, no auto-fit on load.
  }

  @HostListener('window:resize')
  onResize() {
    this.fitToScreen();
  }

  fitToScreen() {
    if (!this.previewScrollArea) return;
    const containerWidth = this.previewScrollArea.nativeElement.clientWidth;
    const a4Width = 793.7; // 210mm in px at 96dpi
    const padding = 80; // Total padding
    this.zoomLevel = Math.max(0.3, Math.min(1.2, (containerWidth - padding) / a4Width));
  }

  onWheelZoom(event: WheelEvent) {
    if (event.ctrlKey) {
      event.preventDefault(); // Stop normal zoom
      if (event.deltaY < 0) this.zoomIn();
      else this.zoomOut();
    }
  }

  // --- Interaction ---
  selectColumn(id: string) {
    this.selectedColumnId = id;
    this.selectedSessionId = id;
    if (window.innerWidth <= 1024) this.mobileActiveView = 'properties';
  }

  selectSession(id: string) {
    this.selectedSessionId = id;
    this.activeInspectorTab = 'content';
    if (window.innerWidth <= 1024) this.mobileActiveView = 'properties';
  }

  // --- Actions ---
  generateInvoiceNumber() {
    const now = new Date();
    return `INV-${now.getTime()}`;
  }

  async saveDraft() {
    if (!this.currentUser) return;
    const billedTo = this.findSessionRecursive(this.sessions, 'billed-to');
    const record: InvoiceRecord = {
      invoiceNo: this.invoiceNo,
      dateCreated: this.invoiceDate,
      customerName: billedTo?.content.name || 'Unknown',
      totalAmount: this.grandTotal,
      userId: this.currentUser.id,
      fullData: { sessions: this.sessions, theme: this.theme }
    };
    this.isSaving = true;
    try {
      if (this.editId) await this.invoiceService.updateInvoice(this.editId, record);
      else await this.invoiceService.saveInvoice(this.currentUser.id, record);
      this.toast.success('Draft saved!');
    } catch (e) { this.toast.error('Save failed'); }
    finally { this.isSaving = false; }
  }

  async saveAsTemplate() {
     if (!this.currentUser) return;
     const name = prompt('Template Name:', 'My Template');
     if (!name) return;
     const template: InvoiceTemplate = {
       name, userId: this.currentUser.id, isPredefined: this.currentUser.role === 'ADMIN',
       fullData: { sessions: JSON.parse(JSON.stringify(this.sessions)), theme: { ...this.theme } }
     };
     await this.invoiceService.saveTemplate(template);
     this.toast.success('Template saved!');
  }

  printInvoice() { window.print(); }
  
  zoomIn() { if (this.zoomLevel < 1.5) this.zoomLevel = Number((this.zoomLevel + 0.1).toFixed(1)); }
  zoomOut() { if (this.zoomLevel > 0.3) this.zoomLevel = Number((this.zoomLevel - 0.1).toFixed(1)); }
  resetZoom() { this.fitToScreen(); }

  // --- Pinch-to-Zoom (mobile touch) ---
  onPinchStart(event: TouchEvent) {
    if (event.touches.length === 2) {
      this._isPinching = true;
      this._pinchStartDist = this._getTouchDistance(event.touches);
      this._pinchStartZoom = this.zoomLevel;
      event.preventDefault();
    }
  }

  onPinchMove(event: TouchEvent) {
    if (!this._isPinching || event.touches.length !== 2) return;
    event.preventDefault();
    const currentDist = this._getTouchDistance(event.touches);
    const scale = currentDist / this._pinchStartDist;
    this.zoomLevel = Math.max(0.3, Math.min(1.5, Number((this._pinchStartZoom * scale).toFixed(2))));
  }

  onPinchEnd() {
    this._isPinching = false;
  }

  private _getTouchDistance(touches: TouchList): number {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // --- Drag & Drop Reordering ---
  dropRow(event: CdkDragDrop<InvoiceSession[]>) {
    this.snapshot();
    moveItemInArray(this.sessions, event.previousIndex, event.currentIndex);
    this.isSaved = false;
  }

  /** Handles same-column reorder AND cross-column/cross-row transfer */
  dropElement(event: CdkDragDrop<InvoiceSession[] | undefined>) {
    const src = event.previousContainer.data;
    const dst = event.container.data;
    if (!dst) return;
    this.snapshot();
    if (event.previousContainer === event.container) {
      moveItemInArray(dst, event.previousIndex, event.currentIndex);
    } else {
      if (!src) return;
      transferArrayItem(src, dst, event.previousIndex, event.currentIndex);
    }
    this.isSaved = false;
  }

  async downloadPDF() {
    try {
      // @ts-ignore
      const html2pdf = (await import('html2pdf.js')).default;
      const element = document.getElementById('invoiceDoc');
      if (element) {
        const opt: any = {
          margin: 0,
          filename: `${this.invoiceNo}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(element).save();
      }
    } catch (e) { this.toast.error('PDF generation failed'); }
  }
}
