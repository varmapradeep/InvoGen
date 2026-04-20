import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-save-template-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-backdrop animated-fade-in" (click)="onCancel()">
      <div class="modal-card animated-slide-up" (click)="$event.stopPropagation()">
        <div class="modal-header">
           <div class="icon-circle">📂</div>
           <h3>Save as Template</h3>
           <p>Convert your current design into a reusable template.</p>
        </div>
        
        <div class="modal-body">
          <div class="form-group">
            <label>Template Name</label>
            <input type="text" [(ngModel)]="templateName" placeholder="e.g. Modern Professional" focus-it>
          </div>

          <div class="form-group visibility-picker" *ngIf="isAdmin">
            <label>Template Visibility</label>
            <div class="toggle-cards">
              <div class="toggle-card" [class.active]="!isPublic" (click)="isPublic = false">
                <div class="tc-icon">🔒</div>
                <div class="tc-info">
                  <strong>Private</strong>
                  <span>Only you can see this</span>
                </div>
              </div>
              <div class="toggle-card" [class.active]="isPublic" (click)="isPublic = true">
                <div class="tc-icon">🌍</div>
                <div class="tc-info">
                  <strong>Public</strong>
                  <span>Available to all users</span>
                </div>
              </div>
            </div>
          </div>

          <div class="form-group visibility-picker" *ngIf="isAdmin">
            <label>Premium Placement</label>
            <div class="toggle-cards">
              <div class="toggle-card" [class.active]="isPremium" (click)="isPremium = !isPremium">
                <div class="tc-icon">💎</div>
                <div class="tc-info">
                  <strong>Premium Template</strong>
                  <span>Requires payment/membership to edit</span>
                </div>
              </div>
            </div>
          </div>

          <div class="info-note" *ngIf="!isAdmin">
             <p>✨ This template will be saved to your personal gallery.</p>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-cancel" (click)="onCancel()">Cancel</button>
          <button class="btn-confirm" (click)="onSave()" [disabled]="!templateName.trim()">
            Save Template
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.7);
      backdrop-filter: blur(8px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .modal-card {
      background: #ffffff;
      width: 100%;
      max-width: 440px;
      border-radius: 20px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .modal-header {
      padding: 30px 30px 10px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }
    .icon-circle {
      width: 50px;
      height: 50px;
      background: #f1f5f9;
      color: var(--accent-color);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
    }
    h3 { margin: 0; color: #0f172a; font-size: 20px; font-weight: 700; }
    p { margin: 0; color: #64748b; font-size: 14px; }

    .modal-body { padding: 20px 30px; }
    .form-group { margin-bottom: 20px; }
    label { display: block; font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 8px; }
    input {
      width: 100%;
      padding: 12px 16px;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      font-size: 15px;
      outline: none;
      transition: all 0.2s;
      &:focus { border-color: var(--accent-color); box-shadow: 0 0 0 4px rgba(118, 69, 192, 0.1); }
    }

    .visibility-picker { margin-top: 10px; }
    .toggle-cards { display: grid; gap: 10px; }
    .toggle-card {
      display: flex;
      align-items: center;
      gap: 15px;
      padding: 12px 16px;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s;
      &.active {
        background: #f8fafc;
        border-color: var(--accent-color);
        .tc-icon { background: #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
      }
      &:hover:not(.active) { background: #f8fafc; }
    }
    .tc-icon { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 10px; font-size: 16px; transition: all 0.2s; }
    .tc-info { display: flex; flex-direction: column; }
    .tc-info strong { font-size: 14px; color: #0f172a; }
    .tc-info span { font-size: 12px; color: #64748b; }

    .info-note { background: #f0f9ff; padding: 12px; border-radius: 12px; p { color: #0369a1; } }

    .modal-footer {
      padding: 10px 30px 30px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    button { padding: 12px; border-radius: 12px; font-weight: 600; font-size: 14px; cursor: pointer; border: none; transition: all 0.2s; }
    .btn-cancel { background: #f1f5f9; color: #475569; &:hover { background: #e2e8f0; } }
    .btn-confirm { background: #7645c0; color: #ffffff; &:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.1); } &:disabled { opacity: 0.5; cursor: not-allowed; } }

    @media (prefers-color-scheme: dark) {
      .modal-card { background: #1e293b; border-color: rgba(255, 255, 255, 0.05); }
      h3 { color: #f8fafc; }
      p { color: #94a3b8; }
      label { color: #94a3b8; }
      input { background: #0f172a; border-color: #334155; color: #f8fafc; }
      .toggle-card { 
        border-color: #334155; 
        &.active { background: #0f172a; border-color: #7645c0; }
        &:hover:not(.active) { background: #0f172a; }
      }
      .tc-info strong { color: #f8fafc; }
      .icon-circle { background: #334155; color: #a78bfa; }
      .btn-cancel { background: #334155; color: #e2e8f0; }
      .info-note { background: rgba(7, 89, 133, 0.2); p { color: #7dd3fc; } }
    }

    .animated-fade-in { animation: fadeIn 0.15s ease-out; }
    .animated-slide-up { animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { transform: translateY(15px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  `]
})
export class SaveTemplateModalComponent {
  @Input() isAdmin = false;
  @Output() save = new EventEmitter<{ name: string, isPublic: boolean, isPremium: boolean }>();
  @Output() cancel = new EventEmitter<void>();

  templateName = '';
  isPublic = false;
  isPremium = false;

  onSave() {
    if (this.templateName.trim()) {
      this.save.emit({ 
        name: this.templateName.trim(), 
        isPublic: this.isPublic,
        isPremium: this.isPremium 
      });
    }
  }

  onCancel() {
    this.cancel.emit();
  }
}
