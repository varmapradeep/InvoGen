import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc, orderBy, limit } from '@angular/fire/firestore';
import { MASTER_DESIGNS } from '../utils/master-templates.util';

export interface InvoiceSession {
  id: string;
  type: 'header' | 'billed-to' | 'details' | 'items' | 'tax' | 'note' | 'custom' | 'line' | 'table-custom' | 'field-group' | 'layout-row' | 'layout-column' | 'heading' | 'paragraph' | 'image' | 'data-field' | 'spacer';
  title?: string;
  content?: any;
  order: number;
  isBold?: boolean;
  isItalic?: boolean;
  fontSize?: number;
  fontWeight?: number; // 300, 400, 700, etc.
  alignment?: 'left' | 'center' | 'right';
  vAlignment?: 'top' | 'center' | 'bottom';
  offsetX?: number; // Custom horizontal offset (px)
  width?: any; // Percentage for columns, or 'full'/'half' for elements
  height?: number; // Custom height for layout-row
  bgColor?: string; // Background Color
  textColor?: string; // Text Color
  padding?: number; // Inner padding
  margin?: number; // Outer margin
  borderRadius?: number; // Rounded corners (px)
  opacity?: number; // 0.0 to 1.0
  sessions?: InvoiceSession[]; // Sub-sessions for rows and columns
  headerBgColor?: string; // Custom table header background
  headerTextColor?: string; // Custom table header font color
  valueTextColor?: string; // Custom table cells text color
  showBorders?: boolean; // Custom table grid borders toggle
  stripedRows?: boolean; // Custom table striped rows toggle
}

export interface InvoiceTheme {
  primaryColor: string;
  secondaryColor?: string;
  fontFamily?: string;
  layout?: 'modern' | 'standard' | 'minimal';
  currency?: { code: string, symbol: string };
  discount?: { type: 'percent' | 'flat', value: number };
  shipping?: number;
  pageBgColor?: string;
  pageBgImage?: string;
  pageBgOpacity?: number;
}

export interface InvoiceTemplate {
  id?: string;
  name: string;
  userId: string;
  isPredefined: boolean; // For legacy/system master templates
  visibility?: 'public' | 'private'; 
  isPremium?: boolean; // NEW: Flag for premium designs
  fullData: {
    sessions: InvoiceSession[];
    theme: InvoiceTheme;
  };
}

export interface InvoiceRecord {
  id?: string;
  invoiceNo: string;
  dateCreated: string;
  dueDate?: string;
  customerName: string;
  invoiceName?: string;
  totalAmount: number;
  userId: string;
  isDraft?: boolean; // NEW: Distinguish drafts from finalized records
  lastEdited?: string; // Relative or absolute last edited timestamp
  fullData?: {
    sessions: InvoiceSession[];
    theme: InvoiceTheme;
    invoiceDueDate?: string;
  };
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {
  private firestore: Firestore = inject(Firestore);

  private templatesCache: { [userId: string]: { data: InvoiceTemplate[]; ts: number } } = {};
  private invoicesCache: { [userId: string]: { data: InvoiceRecord[]; ts: number } } = {};

  constructor() {}

  private isCacheFresh(ts: number): boolean {
    return Date.now() - ts < CACHE_TTL_MS;
  }

  private getCached<T>(storageKey: string, memory: { data: T; ts: number } | undefined): { data: T; ts: number } | null {
    if (memory && this.isCacheFresh(memory.ts)) return memory;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { data: T; ts: number };
        if (parsed && parsed.data && this.isCacheFresh(parsed.ts)) return parsed;
      }
    } catch (e) { /* ignore corrupt cache */ }
    return null;
  }

  private setCache(storageKey: string, memory: { data: any; ts: number }, data: any): void {
    memory.data = data;
    memory.ts = Date.now();
    try { sessionStorage.setItem(storageKey, JSON.stringify({ data, ts: memory.ts })); } catch (e) { /* quota exceeded */ }
  }

  private invalidateCache(userId?: string): void {
    if (userId) {
      delete this.templatesCache[userId];
      delete this.invoicesCache[userId];
      try {
        sessionStorage.removeItem(`invogen_templates_${userId}`);
        sessionStorage.removeItem(`invogen_invoices_${userId}`);
      } catch (e) { /* ignore */ }
    } else {
      this.templatesCache = {};
      this.invoicesCache = {};
      try {
        Object.keys(sessionStorage)
          .filter(k => k.startsWith('invogen_templates_') || k.startsWith('invogen_invoices_'))
          .forEach(k => sessionStorage.removeItem(k));
      } catch (e) { /* ignore */ }
    }
  }

  public async getLatestDraft(userId: string): Promise<InvoiceRecord | null> {
    const invoicesRef = collection(this.firestore, 'invoices');
    // Use server-side ordering and limit to avoid fetching all drafts into memory
    const q = query(
      invoicesRef,
      where('userId', '==', userId),
      where('isDraft', '==', true),
      orderBy('dateCreated', 'desc'),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;
    const d = querySnapshot.docs[0];
    return { id: d.id, ...d.data() } as InvoiceRecord;
  }

  public async getInvoices(userId: string): Promise<InvoiceRecord[]> {
    const key = `invogen_invoices_${userId}`;
    const cached = this.getCached<InvoiceRecord[]>(key, this.invoicesCache[userId]);
    if (cached) return cached.data;

    const invoicesRef = collection(this.firestore, 'invoices');
    const q = query(invoicesRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    const invoices = querySnapshot.docs.map((doc: any) => {
      const data = doc.data();
      const id = doc.id;
      delete data.id; // Correctly handle if 'id' was accidentally saved as a field
      return { ...data, id } as InvoiceRecord;
    });

    this.setCache(key, (this.invoicesCache[userId] = this.invoicesCache[userId] || { data: [], ts: 0 }), invoices);
    return invoices;
  }

  public async getInvoiceById(id: string): Promise<InvoiceRecord | null> {
    const docRef = doc(this.firestore, 'invoices', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as InvoiceRecord;
    }
    return null;
  }

  public async saveInvoice(userId: string, invoice: InvoiceRecord): Promise<void> {
    const invoicesRef = collection(this.firestore, 'invoices');
    const data = { ...invoice, userId };
    delete data.id; // Never save actual ID as a field in doc data
    await addDoc(invoicesRef, data);
    this.invalidateCache(userId);
  }

  public async updateInvoice(id: string, invoice: Partial<InvoiceRecord>): Promise<void> {
    const docRef = doc(this.firestore, 'invoices', id);
    const data = { ...invoice };
    delete data.id; // Never update ID field
    await updateDoc(docRef, data);
    this.invalidateCache(invoice.userId);
  }

  public async deleteInvoice(id: string): Promise<void> {
    const docRef = doc(this.firestore, 'invoices', id);
    await deleteDoc(docRef);
    this.invalidateCache();
  }

  public async isInvoiceNumberUnique(userId: string, invoiceNo: string): Promise<boolean> {
    const invoicesRef = collection(this.firestore, 'invoices');
    const q = query(invoicesRef, where('userId', '==', userId), where('invoiceNo', '==', invoiceNo));
    const querySnapshot = await getDocs(q);
    return querySnapshot.empty;
  }

  // --- Templates Methods ---
  public async getTemplates(userId: string): Promise<InvoiceTemplate[]> {
    const key = `invogen_templates_${userId}`;
    const cached = this.getCached<InvoiceTemplate[]>(key, this.templatesCache[userId]);
    if (cached) return cached.data;

    let templates: InvoiceTemplate[];
    try {
      templates = await this.fetchTemplates(userId);
    } catch (e) {
      templates = MASTER_DESIGNS;
    }
    this.setCache(key, (this.templatesCache[userId] = this.templatesCache[userId] || { data: [], ts: 0 }), templates);
    return templates;
  }

  private async fetchTemplates(userId: string): Promise<InvoiceTemplate[]> {
    const templatesRef = collection(this.firestore, 'templates');
    const querySnapshot = await getDocs(templatesRef);

    const firestoreTemplates = querySnapshot.docs.map((doc: any) => {
      const data = doc.data();
      const id = doc.id;
      return { ...data, id } as InvoiceTemplate;
    });

    // Filter: Owned by user OR is Public OR is a Predefined master template
    return [...MASTER_DESIGNS, ...firestoreTemplates.filter(t =>
      t.userId === userId ||
      t.visibility === 'public' ||
      t.isPredefined
    )];
  }

  public async saveTemplate(template: InvoiceTemplate): Promise<void> {
    const templatesRef = collection(this.firestore, 'templates');
    const data = { ...template };
    delete data.id;
    await addDoc(templatesRef, data);
    this.invalidateCache(template.userId);
  }

  public async updateTemplate(id: string, template: Partial<InvoiceTemplate>): Promise<void> {
    const docRef = doc(this.firestore, 'templates', id);
    const data = { ...template };
    delete data.id;
    await updateDoc(docRef, data);
    this.invalidateCache(template.userId);
  }

  public async deleteTemplate(id: string): Promise<void> {
    const docRef = doc(this.firestore, 'templates', id);
    await deleteDoc(docRef);
    this.invalidateCache();
  }
}
