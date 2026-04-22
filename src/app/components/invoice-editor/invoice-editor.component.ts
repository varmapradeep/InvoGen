import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { InvoiceService, InvoiceRecord, InvoiceSession, InvoiceTheme, InvoiceTemplate } from '../../services/invoice.service';
import { LayoutService } from '../../services/layout.service';
import { Icons } from '../../utils/icons.util';
import { ToastService } from '../../services/toast.service';
import { ToasterMessages } from '../../utils/messages.util';
import { ImageCropperModalComponent } from '../shared/image-cropper/image-cropper.component';
import { ConfirmModalComponent } from '../shared/confirm-modal/confirm-modal.component';
import { SaveTemplateModalComponent } from '../shared/save-template-modal/save-template-modal.component';

@Component({
  selector: 'app-invoice-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, ImageCropperModalComponent, ConfirmModalComponent, SaveTemplateModalComponent],
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
    shipping: 0,
    pageBgColor: '#ffffff',
    pageBgOpacity: 1,
    pageBgImage: ''
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
  currentUser: User | null = null;
  isUploading = false;

  // Cropper state
  showCropper = false;
  imageChangedEvent: any = '';
  cropperRound = false;
  cropperTarget: 'logo' | 'pageBg' | InvoiceSession | null = null;

  // UI State
  zoomLevel: number = 0.8;
  computedPages: InvoiceSession[][] = [];
  selectedSessionId: string | null = null;
  selectedColumnId: string | null = null;
  showLayoutPicker: boolean = false;
  activeInspectorTab: 'content' | 'styles' = 'content';
  expandedRows: { [rowId: string]: boolean } = {};
  pendingUploads = new Map<string, Blob>(); // Element ID -> Blob
  sessionToDelete: string | null = null;
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
  private _pinchStartZoom: number = 0.8;
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

  getNumberRange(n: number): number[] {
    return Array.from({ length: Math.max(0, n || 0) }, (_, i) => i);
  }
  
  get cropperAspectRatio(): number {
    if (this.cropperTarget === 'logo') return 1;
    if (this.cropperTarget === 'pageBg') return 210 / 297; // A4 Ratio
    return 1;
  }

  get shouldMaintainAspectRatio(): boolean {
    if (this.cropperTarget === 'logo' || this.cropperTarget === 'pageBg') return true;
    return false;
  }

  currencies = [
    { code: 'USD', symbol: '$' },
    { code: 'INR', symbol: '₹' },
    { code: 'EUR', symbol: '€' },
    { code: 'GBP', symbol: '£' },
    { code: 'JPY', symbol: '¥' },
    { code: 'AUD', symbol: 'A$' },
    { code: 'CAD', symbol: 'C$' }
  ];
  
  constructor(
    public auth: AuthService,
    private invoiceService: InvoiceService,
    public router: Router,
    private route: ActivatedRoute,
    public toast: ToastService,
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

    // NEW: Combine params and queryParams to ensure fresh=true is always handled
    import('rxjs').then(m => {
      m.combineLatest([this.route.params, this.route.queryParams]).subscribe(async ([params, qParams]) => {
        this.isTemplateMode = qParams['mode'] === 'template';
        this.templateId = qParams['id'];
        const isFresh = qParams['fresh'] === 'true';

        if (params['id']) {
          this.editId = params['id'];
          await this.loadInvoice(this.editId!);
        } else if (this.isTemplateMode && this.templateId) {
          await this.loadTemplate(this.templateId);
        } else if (qParams['templateId']) {
          await this.loadTemplate(qParams['templateId']);
        } else if (this.currentUser) {
          if (!isFresh) {
            const latestDraft = await this.invoiceService.getLatestDraft(this.currentUser.id);
            if (latestDraft) {
              this.editId = latestDraft.id!;
              await this.loadInvoice(this.editId);
              setTimeout(() => {
                this.toast.info('Restored your latest draft.');
              }, 0);
            } else {
              this.initNewInvoice();
            }
          } else {
            this.initNewInvoice();
          }
        } else {
          this.initNewInvoice();
        }
        this.paginate();
      });
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
      currency: this.currentUser?.defaultCurrency ? { ...this.currentUser.defaultCurrency } : { code: 'USD', symbol: '$' },
      discount: { type: 'percent', value: 0 },
      shipping: 0,
      pageBgColor: '#ffffff',
      pageBgOpacity: 1
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
       
       // If this is a Premium template and the user is not ADMIN → restrict
       if (template.isPremium && this.currentUser?.role !== 'ADMIN') {
         this.isPremiumRestricted = true;
         this.toast.warning('This is a premium template. Upgrade to save or export.');
       } else {
         this.isPremiumRestricted = false;
       }

       // Clone Logic: If this is a Public/Admin template AND I am not the owner, clear IDs
       if (template.userId !== this.currentUser?.id) {
          this.editId = null; 
          this.templateId = null;
          this.isTemplateMode = false;
          this.toast.info('Working on a copy of ' + template.name);
       } else {
          // If I own it and I'm in template mode, keep templateId to allow UPDATING it
          this.templateId = template.id || null;
       }

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
    this.paginate();
  }

  /**
   * Estimates the visual height of a session based on its content type and data.
   * This ensures pagination is aware of growing tables or text blocks.
   */
  getEstimatedHeight(session: InvoiceSession): number {
    let height = session.height || 0;

    // Fixed Minimums for layout rows
    if (session.type === 'layout-row') {
      height = Math.max(height, 80);
      if (session.sessions) {
        // A row is at least as tall as its tallest column
        let maxColHeight = 0;
        for (const col of session.sessions) {
          let colContentHeight = 0;
          if (col.sessions) {
            for (const sub of col.sessions) {
              colContentHeight += this.getEstimatedHeight(sub);
            }
          }
          maxColHeight = Math.max(maxColHeight, colContentHeight);
        }
        height = Math.max(height, maxColHeight);
      }
    }

    // Item Table: Header (45px) + Row (38px) * count + space
    if (session.type === 'items' && Array.isArray(session.content)) {
      height = 50 + (session.content.length * 40) + 20;
    }

    // Branding / Header: Fixed approx
    if (session.type === 'header') {
      height = (session.content?.logoSize || 60) + 120;
    }

    // Billed To: Approx
    if (session.type === 'billed-to') {
      height = 160;
    }

    // Note / Paragraphs: Approx 20px per 50 chars
    if (['paragraph', 'note', 'heading'].includes(session.type)) {
      const charCount = (session.content + '').length;
      const lines = Math.ceil(charCount / 50);
      height = Math.max(height || 30, lines * 24);
    }

    // Totals Box
    if (session.type === 'tax') {
      height = 150;
    }

    return height + (session.margin ? session.margin * 2 : 0) + (session.padding ? session.padding * 2 : 0);
  }

  /** 
   * Automatic Pagination Logic
   * Groups sessions into Pages based on A4 height (approx 1122px).
   */
  paginate() {
    this.computedPages = [];
    if (this.sessions.length === 0) {
      this.computedPages = [[]];
      return;
    }

    const A4_HEIGHT_PX = 1122;
    const PAGE_PADDING = 120; // Increased padding for header/footer safety
    const MAX_CONTENT_HEIGHT = A4_HEIGHT_PX - PAGE_PADDING;

    let currentPage: InvoiceSession[] = [];
    let currentHeight = 0;

    for (const session of this.sessions) {
      const sessionHeight = this.getEstimatedHeight(session);

      if (currentHeight + sessionHeight > MAX_CONTENT_HEIGHT && currentPage.length > 0) {
        this.computedPages.push([...currentPage]);
        currentPage = [session];
        currentHeight = sessionHeight;
      } else {
        currentPage.push(session);
        currentHeight += sessionHeight;
      }
    }

    if (currentPage.length > 0) {
      this.computedPages.push(currentPage);
    }
  }

  // --- Rename ---
  getDisplayName(id: string, fallback: any): string {
    return this.customNames[id] || (typeof fallback === 'string' ? fallback : String(fallback || ''));
  }
  startRename(id: string, event: Event) {
    event.stopPropagation();
    this.editingNameId = id;
  }
  confirmRename(id: string, value: string) {
    if (value.trim()) this.customNames[id] = value.trim();
    this.editingNameId = null;
  }

  isString(val: any): boolean {
    return typeof val === 'string';
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
    this.paginate();
  }
  undo() {
    if (!this.canUndo) return;
    this._redoStack.push(JSON.parse(JSON.stringify(this.sessions)));
    this.sessions = this._history.pop()!;
    this.selectedSessionId = null;
    this.selectedColumnId = null;
    this.paginate();
  }
  redo() {
    if (!this.canRedo) return;
    this._history.push(JSON.parse(JSON.stringify(this.sessions)));
    this.sessions = this._redoStack.pop()!;
    this.selectedSessionId = null;
    this.selectedColumnId = null;
    this.paginate();
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
    this.paginate();
    this.expandedRows[rowId] = true;
    this.showLayoutPicker = false;
    this.selectedSessionId = rowId;
    this.toast.success(`${colCount}-column layout row created!`);
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
      this.toast.warning('Select a column on the canvas first!');
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
    this.paginate();
  }

  removeSession(id: string) {
    this.sessionToDelete = id;
  }

  onConfirmDelete() {
    if (!this.sessionToDelete) return;
    const id = this.sessionToDelete;
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
    this.paginate();
    this.selectedSessionId = null;
    this.selectedColumnId = null;
    this.isSaved = false;
    this.sessionToDelete = null;
    this.toast.success('Element removed');
  }

  onCancelDelete() {
    this.sessionToDelete = null;
  }

  updateProperty(session: InvoiceSession, prop: string, value: any) {
    (session as any)[prop] = value;
    this.isSaved = false;
    this.paginate();
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
      case 'data-field': return { field: 'invoiceNo', label: '' };
      case 'line': return { lineCount: 1, lineGap: 4 };
      case 'spacer': return null;
      default: return '';
    }
  }

  getDataFieldValue(fieldOrObj: any): string {
    const field = (typeof fieldOrObj === 'object') ? fieldOrObj.field : fieldOrObj;
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
    if (event.target.files && event.target.files.length > 0) {
      this.imageChangedEvent = event;
      this.cropperRound = false;
      this.cropperTarget = session;
      this.showCropper = true;
    }
  }

  onLogoUpload(event: any) {
    if (event.target.files && event.target.files.length > 0) {
      this.imageChangedEvent = event;
      this.cropperRound = false;
      this.cropperTarget = 'logo';
      this.showCropper = true;
    }
  }

  onPageBgUpload(event: any) {
    if (event.target.files && event.target.files.length > 0) {
      this.imageChangedEvent = event;
      this.cropperRound = false;
      this.cropperTarget = 'pageBg';
      this.showCropper = true;
    }
  }

  async handleCroppedImage(blob: Blob) {
    if (!this.currentUser) return;
    this.showCropper = false;
    
    // Generate temporary preview URL
    const tempUrl = URL.createObjectURL(blob);
    
    // Identify target ID
    let targetId = '';
    if (this.cropperTarget === 'logo') {
      targetId = 'logo';
      const header = this.findSessionRecursive(this.sessions, 'header');
      if (header) {
        header.content = { ...header.content, customLogo: tempUrl };
      }
    } else if (this.cropperTarget === 'pageBg') {
      targetId = 'pageBg';
      this.theme.pageBgImage = tempUrl;
    } else if (this.cropperTarget && typeof this.cropperTarget !== 'string') {
      targetId = this.cropperTarget.id;
      this.cropperTarget.content = tempUrl;
    }

    if (targetId) {
      // Store blob for later upload
      this.pendingUploads.set(targetId, blob);
    }

    this.isSaved = false;
    this.imageChangedEvent = '';
    this.cropperTarget = null;
    this.paginate();
  }

  ngAfterViewInit() {
    // We keep the initial 0.5 zoom as requested, no auto-fit on load.
  }

  @HostListener('window:resize')
  onResize() {
    this.fitToScreen();
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    // Only trigger if 'Delete' is pressed and something is selected
    if (event.key === 'Delete' && this.selectedSessionId) {
      const target = event.target as HTMLElement;
      // Safety: Don't delete if the user is currently typing in a field
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable;
      
      if (!isInput) {
        event.preventDefault();
        this.removeSession(this.selectedSessionId);
      }
    }
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
  generateInvoiceNumber(): string {
    const settings = this.currentUser?.invoiceSettings;
    if (settings && settings.useCustomFormat) {
      const numStr = (settings.nextNumber + '').padStart(settings.padding, '0');
      return `${settings.prefix}${numStr}`;
    }
    const now = new Date();
    return `INV-${now.getTime()}`;
  }

  async saveDraft() {
    if (!this.currentUser) return;
    if (this.isPremiumRestricted) {
      this.toast.warning('Payment required to save or export this premium template.');
      return;
    }
    
    this.isSaving = true;
    try {
      // 1. Process pending uploads first
      if (this.pendingUploads.size > 0) {
        await this.processPendingUploads();
      }

      const billedTo = this.findSessionRecursive(this.sessions, 'billed-to');
      let finalInvoiceNo = this.invoiceNo;
      const settings = this.currentUser.invoiceSettings;
      
      // NEW: Intelligent numbering logic for NEW invoices
      if (!this.editId && settings && settings.useCustomFormat) {
        let isUnique = await this.invoiceService.isInvoiceNumberUnique(this.currentUser.id, finalInvoiceNo);
        let safetyCounter = 0;
        
        // If the number exists (maybe it was used elsewhere), keep incrementing until we find a gap
        while (!isUnique && safetyCounter < 10) {
          settings.nextNumber++;
          finalInvoiceNo = this.generateInvoiceNumber();
          isUnique = await this.invoiceService.isInvoiceNumberUnique(this.currentUser.id, finalInvoiceNo);
          safetyCounter++;
        }
        this.invoiceNo = finalInvoiceNo;
      }

      const record: InvoiceRecord = {
        invoiceNo: finalInvoiceNo,
        dateCreated: this.invoiceDate,
        customerName: billedTo?.content.name || 'Unknown',
        totalAmount: this.grandTotal,
        userId: this.currentUser.id,
        isDraft: true, // SAVE AS DRAFT
        fullData: { sessions: this.sessions, theme: this.theme }
      };

      if (this.editId) {
        await this.invoiceService.updateInvoice(this.editId, JSON.parse(JSON.stringify(record)));
      } else {
        await this.invoiceService.saveInvoice(this.currentUser.id, JSON.parse(JSON.stringify(record)));
        
        // After successful save of a NEW invoice, increment the global counter in user profile
        if (settings && settings.useCustomFormat) {
          await this.auth.updateProfile(this.currentUser.id, {
            invoiceSettings: {
              ...settings,
              nextNumber: settings.nextNumber + 1
            }
          });
        }
      }
      
      this.isSaved = true;
      this.toast.success(ToasterMessages.invoices.saveSuccess);
    } catch (e) { 
      console.error(e);
      this.toast.error(ToasterMessages.invoices.saveFailed); 
    } finally { 
      this.isSaving = false; 
    }
  }

  private async processPendingUploads() {
    this.toast.info('Uploading images...');
    
    for (const [id, blob] of this.pendingUploads.entries()) {
      try {
        const permanentUrl = await this.auth.uploadImage(blob, `invoices/${this.currentUser!.id}`);
        
        // Replace temporary URL in sessions/logo
        if (id === 'logo') {
          const header = this.findSessionRecursive(this.sessions, 'header');
          if (header) {
            // Revoke old temp URL to free memory
            if (header.content.customLogo?.startsWith('blob:')) {
              URL.revokeObjectURL(header.content.customLogo);
            }
            header.content.customLogo = permanentUrl;
          }
        } else if (id === 'pageBg') {
          // Revoke old temp URL
          if (this.theme.pageBgImage?.startsWith('blob:')) {
            URL.revokeObjectURL(this.theme.pageBgImage);
          }
          this.theme.pageBgImage = permanentUrl;
        } else {
          const element = this.findSessionByIdRecursive(this.sessions, id);
          if (element) {
            // Revoke old temp URL
            if (element.content?.startsWith('blob:')) {
              URL.revokeObjectURL(element.content);
            }
            element.content = permanentUrl;
          }
        }
      } catch (err) {
        console.error(`Failed to upload image ${id}:`, err);
        throw new Error('One or more images failed to upload. Save cancelled.');
      }
    }
    
    this.pendingUploads.clear();
  }

  // State for Step 3 modal
  showSaveTemplateModal = false;
  isPremiumRestricted = false; // NEW: Lock for premium templates

  openSaveTemplateModal() {
    if (!this.currentUser) return;
    this.showSaveTemplateModal = true;
  }

  async handleSaveTemplate(data: { name: string, isPublic: boolean, isPremium: boolean }) {
    this.showSaveTemplateModal = false;
    if (!this.currentUser) return;
    
    this.isSaving = true;
    try {
      const templateData: Omit<InvoiceTemplate, 'id'> = {
        name: data.name,
        userId: this.currentUser.id,
        isPredefined: false,
        visibility: data.isPublic ? 'public' : 'private',
        isPremium: data.isPremium,
        fullData: { 
          sessions: JSON.parse(JSON.stringify(this.sessions)), 
          theme: { ...this.theme } 
        }
      };

      // If an existing template ID is set and the user owns it → UPDATE instead of creating a duplicate
      if (this.templateId) {
        await this.invoiceService.updateTemplate(this.templateId, templateData);
        this.toast.success('Template updated successfully!');
      } else {
        await this.invoiceService.saveTemplate({ ...templateData });
        this.toast.success('Template saved successfully!');
      }
    } catch (e) {
      this.toast.error('Failed to save template');
    } finally {
      this.isSaving = false;
    }
  }

  async saveAsTemplate() {
     this.openSaveTemplateModal();
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
      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = (html2pdfModule as any).default ?? html2pdfModule;
      const element = document.getElementById('invoiceDoc');
      if (element) {
        const opt = {
          margin: 0,
          filename: `${this.invoiceNo}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: 'css' }
        };
        html2pdf().set(opt).from(element).save();
      }
    } catch (e) { this.toast.error('PDF generation failed. Try again.'); }
  }
}
