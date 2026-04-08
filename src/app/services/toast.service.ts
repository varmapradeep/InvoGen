import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastId = 0;
  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  public toasts$ = this.toastsSubject.asObservable();

  private show(message: string, type: Toast['type']) {
    const id = ++this.toastId;
    const toast: Toast = { id, message, type };
    this.toastsSubject.next([...this.toastsSubject.value, toast]);

    setTimeout(() => this.dismiss(id), 2500);
  }

  success(message: string) { this.show(message, 'success'); }
  warning(message: string) { this.show(message, 'warning'); }
  error(message: string)   { this.show(message, 'error'); }
  info(message: string)    { this.show(message, 'info'); }

  dismiss(id: number) {
    this.toastsSubject.next(this.toastsSubject.value.filter(t => t.id !== id));
  }
}
