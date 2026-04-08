import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      <div
        *ngFor="let toast of toastService.toasts$ | async"
        class="toast toast--{{ toast.type }}"
      >
        <span class="toast-icon">
          <span *ngIf="toast.type === 'success'">✓</span>
          <span *ngIf="toast.type === 'warning'">⚠</span>
          <span *ngIf="toast.type === 'error'">✕</span>
          <span *ngIf="toast.type === 'info'">ℹ</span>
        </span>
        <span class="toast-message">{{ toast.message }}</span>
        <button class="toast-close" (click)="toastService.dismiss(toast.id)">×</button>
      </div>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 9999;
      display: flex;
      flex-direction: column-reverse;
      gap: 10px;
      width: 100%;
      max-width: 400px;
      pointer-events: none;
      align-items: center;
    }

    .toast {
      pointer-events: auto;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 20px;
      border-radius: 50px; /* Pill shape for bottom center */
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 10px 25px rgba(0,0,0,0.4);
      border: 1px solid rgba(255, 255, 255, 0.1);
      animation: slide-up 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
      backdrop-filter: blur(12px);
      width: fit-content;
      min-width: 280px;
      justify-content: center;
    }

    @keyframes slide-up {
      from { transform: translateY(40px); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }

    .toast--success {
      background: rgba(34, 197, 94, 0.12);
      border-color: #22c55e;
      color: #4ade80;
    }
    .toast--warning {
      background: rgba(234, 179, 8, 0.12);
      border-color: #eab308;
      color: #facc15;
    }
    .toast--error {
      background: rgba(239, 68, 68, 0.12);
      border-color: #ef4444;
      color: #f87171;
    }
    .toast--info {
      background: rgba(99, 102, 241, 0.12);
      border-color: #6366f1;
      color: #818cf8;
    }

    .toast-icon {
      font-size: 16px;
      flex-shrink: 0;
      font-weight: 700;
    }

    .toast-message {
      flex: 1;
      line-height: 1.4;
    }

    .toast-close {
      background: none;
      border: none;
      color: inherit;
      font-size: 18px;
      cursor: pointer;
      opacity: 0.6;
      padding: 0;
      line-height: 1;
      flex-shrink: 0;
      &:hover { opacity: 1; }
    }

    @media (max-width: 768px) {
      .toast-container {
        pointer-events: none;
        bottom: 80px; /* Stay clear of mobile bottom tabs */
        max-width: 90vw;
      }
      .toast {
        padding: 8px 16px;
        font-size: 12px;
        min-width: 200px;
        border-radius: 12px;
      }
      .toast-icon { font-size: 14px; }
      .toast-close { font-size: 16px; }
    }
  `]
})
export class ToastComponent {
  toastService = inject(ToastService);
}
