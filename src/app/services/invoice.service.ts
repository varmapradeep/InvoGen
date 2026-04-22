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
  width?: any; // Percentage for columns, or 'full'/'half' for elements
  height?: number; // Custom height for layout-row
  bgColor?: string; // Background Color
  textColor?: string; // Text Color
  padding?: number; // Inner padding
  margin?: number; // Outer margin
  borderRadius?: number; // Rounded corners (px)
  opacity?: number; // 0.0 to 1.0
  sessions?: InvoiceSession[]; // Sub-sessions for rows and columns
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
  customerName: string;
  totalAmount: number;
  userId: string;
  isDraft?: boolean; // NEW: Distinguish drafts from finalized records
  fullData?: {
    sessions: InvoiceSession[];
    theme: InvoiceTheme;
  };
}

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {
  private firestore: Firestore = inject(Firestore);

  constructor() {}

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
    const invoicesRef = collection(this.firestore, 'invoices');
    const q = query(invoicesRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map((doc: any) => {
      const data = doc.data();
      const id = doc.id;
      delete data.id; // Correctly handle if 'id' was accidentally saved as a field
      return { ...data, id } as InvoiceRecord;
    });
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
  }

  public async updateInvoice(id: string, invoice: Partial<InvoiceRecord>): Promise<void> {
    const docRef = doc(this.firestore, 'invoices', id);
    const data = { ...invoice };
    delete data.id; // Never update ID field
    await updateDoc(docRef, data);
  }

  public async deleteInvoice(id: string): Promise<void> {
    const docRef = doc(this.firestore, 'invoices', id);
    await deleteDoc(docRef);
  }

  public async isInvoiceNumberUnique(userId: string, invoiceNo: string): Promise<boolean> {
    const invoicesRef = collection(this.firestore, 'invoices');
    const q = query(invoicesRef, where('userId', '==', userId), where('invoiceNo', '==', invoiceNo));
    const querySnapshot = await getDocs(q);
    return querySnapshot.empty;
  }

  // --- Templates Methods ---
  public async getTemplates(userId: string): Promise<InvoiceTemplate[]> {
    try {
      const templatesRef = collection(this.firestore, 'templates');
      const querySnapshot = await getDocs(templatesRef);
      
      const firestoreTemplates = querySnapshot.docs.map((doc: any) => {
        const data = doc.data();
        const id = doc.id;
        return { ...data, id } as InvoiceTemplate;
      });

      // Filter: Owned by user OR is Public OR is a Predefined master template
      const allowedTemplates = firestoreTemplates.filter(t => 
        t.userId === userId || 
        t.visibility === 'public' || 
        t.isPredefined
      );
      
      return [...MASTER_DESIGNS, ...allowedTemplates];
    } catch (e) {
      return MASTER_DESIGNS;
    }
  }

  public async saveTemplate(template: InvoiceTemplate): Promise<void> {
    const templatesRef = collection(this.firestore, 'templates');
    const data = { ...template };
    delete data.id;
    await addDoc(templatesRef, data);
  }

  public async updateTemplate(id: string, template: Partial<InvoiceTemplate>): Promise<void> {
    const docRef = doc(this.firestore, 'templates', id);
    const data = { ...template };
    delete data.id;
    await updateDoc(docRef, data);
  }

  public async deleteTemplate(id: string): Promise<void> {
    const docRef = doc(this.firestore, 'templates', id);
    await deleteDoc(docRef);
  }
}
