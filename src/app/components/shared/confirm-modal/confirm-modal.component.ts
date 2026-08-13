import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="confirm-backdrop animated-fade-in" (click)="onCancel()">
      <div class="confirm-card animated-slide-up" (click)="$event.stopPropagation()">
        <div class="confirm-header">
           <div class="warn-icon">!</div>
           <h3>{{ modalTitle }}</h3>
        </div>
        <div class="confirm-body">
          <p>{{ message }}</p>
        </div>
        <div class="confirm-footer">
          <button class="btn-cancel" (click)="onCancel()">Cancel</button>
          <button class="btn-confirm" (click)="onConfirm()">Delete</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .confirm-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.7);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .confirm-card {
      background: var(--card-surface);
      width: 100%;
      max-width: 420px;
      border-radius: 24px;
      box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.5);
      overflow: hidden;
      border: 1px solid var(--border-color);
    }
    .confirm-header {
      padding: 15px 30px 10px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 15px;
    }
    .warn-icon {
      width: 48px;
      height: 48px;
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: bold;
    }
    h3 {
      margin: 0;
      color: var(--text-main);
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .confirm-body {
      padding: 10px 40px 30px;
      text-align: center;
    }
    p {
      margin: 0;
      color: var(--text-muted);
      line-height: 1.6;
      font-size: 16px;
    }
    .confirm-footer {
      padding: 0 20px 20px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    button {
      padding: 14px;
      border-radius: 12px;
      font-weight: 700;
      font-size: 15px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      border: none;
    }
    .btn-cancel {
      background: hsla(230, 15%, 25%, 1);
      color: #e2e8f0;
      &:hover { 
        background: hsla(230, 15%, 30%, 1);
        transform: translateY(-2px);
      }
    }
    .btn-confirm {
      background: #ef4444;
      color: #ffffff;
      box-shadow: 0 8px 16px rgba(239, 68, 68, 0.2);
      &:hover { 
        background: #ff5555; 
        transform: translateY(-2px);
        box-shadow: 0 12px 24px rgba(239, 68, 68, 0.3);
      }
    }

    .animated-fade-in { animation: fadeIn 0.2s ease-out; }
    .animated-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideUp {
      from { transform: translateY(15px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `]
})
export class ConfirmModalComponent {
  @Input() modalTitle: string = 'Confirm Action';
  @Input() message: string = 'Are you sure you want to proceed?';
  
  @Output() confirmed = new EventEmitter<void>();
  @Output() canceled = new EventEmitter<void>();

  onConfirm() {
    this.confirmed.emit();
  }

  onCancel() {
    this.canceled.emit();
  }
}
