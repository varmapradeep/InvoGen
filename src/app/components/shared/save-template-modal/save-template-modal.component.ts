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
           <div class="icon-circle">{{ mode === 'template' ? '📂' : '📝' }}</div>
           <h3>{{ mode === 'template' ? 'Save Project' : 'Save Invoice' }}</h3>
           <p>{{ mode === 'template' ? 'Create a reusable template from this design.' : 'Save your progress as a draft invoice.' }}</p>
        </div>

        <div class="save-mode-toggle">
          <button [class.active]="mode === 'draft'" (click)="mode = 'draft'">
            Draft
          </button>
          <button [class.active]="mode === 'template'" (click)="mode = 'template'">
            Template
          </button>
        </div>
        
        <div class="modal-body">
          <!-- Template Specific Settings (Admin Only) -->
          <ng-container *ngIf="mode === 'template' && isAdmin">
            <div class="form-group">
              <label>Template Visibility</label>
              <div class="select-pill-group">
                <button [class.active]="!isPublic" (click)="isPublic = false">
                  <span class="icon">🔒</span> Private
                </button>
                <button [class.active]="isPublic" (click)="isPublic = true">
                  <span class="icon">🌍</span> Public
                </button>
              </div>
            </div>
          </ng-container>

          <div class="form-group" *ngIf="mode === 'template'">
            <label>Template Name</label>
            <input type="text" [(ngModel)]="templateName" placeholder="e.g. Modern Professional" focus-it>
          </div>

          <ng-container *ngIf="mode === 'template' && isAdmin">
            <label class="form-group premium-toggle-box">
              <div class="toggle-info">
                <label>Premium Template</label>
                <p>Requires license to edit</p>
              </div>
              <label class="t-switch">
                <input type="checkbox" [(ngModel)]="isPremium">
                <span class="slider"></span>
              </label>
            </label>
          </ng-container>

          <div class="info-note" *ngIf="mode === 'draft'">
             <p>✨ This will save your current progress as a draft invoice. You can continue editing it later from your dashboard.</p>
          </div>
          
          <div class="info-note" *ngIf="mode === 'template' && !isAdmin">
             <p>✨ This template will be saved to your personal gallery for future use.</p>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-cancel" (click)="onCancel()">Cancel</button>
          <button class="btn-confirm" (click)="onSave()" [disabled]="mode === 'template' && !templateName.trim()">
            {{ mode === 'template' ? 'Save Template' : 'Save Draft' }}
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
      backdrop-filter: blur(12px);
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
      border-radius: 28px;
      box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
      overflow: hidden;
    }
    .modal-header {
      padding: 30px 30px 15px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }
    .icon-circle {
      width: 56px;
      height: 56px;
      background: #f1f5f9;
      color: #7645c0;
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      margin-bottom: 5px;
    }
    h3 { margin: 0; color: #0f172a; font-size: 22px; font-weight: 900; letter-spacing: -0.5px; }
    p { margin: 0; color: #64748b; font-size: 14px; font-weight: 500; }

    .save-mode-toggle {
      display: flex;
      margin: 10px 30px;
      padding: 6px;
      background: #f1f5f9;
      border-radius: 16px;
      gap: 6px;

      button {
        flex: 1;
        padding: 10px;
        border: none;
        background: transparent;
        border-radius: 12px;
        font-size: 13px;
        font-weight: 800;
        color: #64748b;
        cursor: pointer;
        transition: all 0.2s;

        &.active {
          background: #ffffff;
          color: #7645c0;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }
      }
    }

    .modal-body { padding: 15px 30px; }
    .form-group { margin-bottom: 22px; }
    label { display: block; font-size: 13px; font-weight: 800; color: #334155; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
    
    input[type="text"] {
      width: 100%;
      padding: 14px 18px;
      border: 2px solid #f1f5f9;
      background: #f8fafc;
      border-radius: 16px;
      font-size: 15px;
      font-weight: 600;
      outline: none;
      transition: all 0.3s;
      &:focus { border-color: #7645c0; background: #fff; box-shadow: 0 0 0 4px rgba(118, 69, 192, 0.1); }
    }

    /* Segmented Control UI (Visibility) */
    .select-pill-group {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      
      button {
        padding: 12px;
        border: 2px solid #f1f5f9;
        background: #f8fafc;
        border-radius: 16px;
        font-size: 14px;
        font-weight: 700;
        color: #64748b;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;

        .icon { font-size: 16px; }

        &.active {
          border-color: #7645c0;
          background: rgba(118, 69, 192, 0.05);
          color: #7645c0;
        }

        &:hover:not(.active) {
          border-color: #e2e8f0;
          background: #f1f5f9;
        }
      }
    }

    /* Premium Toggle Box */
    .premium-toggle-box {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #fff9f0;
      padding: 16px 20px;
      border-radius: 20px;
      border: 2px solid #ffedd5;
      cursor: pointer;
      margin-top: 10px;
      
      .toggle-info {
        label { margin-bottom: 2px; color: #c2410c; text-transform: none; letter-spacing: normal; cursor: pointer; }
        p { font-size: 12px; color: #9a3412; font-weight: 600; margin: 0; }
      }
    }

    /* Switch Toggler */
    .t-switch {
      position: relative;
      width: 44px;
      height: 24px;
      input { opacity: 0; width: 0; height: 0; }
      .slider {
        position: absolute;
        cursor: pointer;
        inset: 0;
        background-color: #fdba74;
        transition: .4s;
        border-radius: 34px;
        &::before {
          content: "";
          position: absolute;
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .4s;
          border-radius: 50%;
        }
      }
      input:checked + .slider { background-color: #f97316; }
      input:checked + .slider::before { transform: translateX(20px); }
    }

    .info-note { background: #f0f9ff; padding: 16px; border-radius: 18px; p { color: #0369a1; font-weight: 600; font-size: 13px; line-height: 1.5; margin: 0; } }

    .modal-footer {
      padding: 10px 30px 30px;
      display: grid;
      grid-template-columns: 1fr 1.6fr;
      gap: 15px;
    }
    button { padding: 15px; border-radius: 16px; font-weight: 800; font-size: 15px; cursor: pointer; border: none; transition: all 0.3s; }
    .btn-cancel { background: #f1f5f9; color: #475569; &:hover { background: #e2e8f0; transform: translateY(-1px); } }
    .btn-confirm { background: #7645c0; color: #ffffff; &:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.1); box-shadow: 0 12px 24px rgba(118, 69, 192, 0.3); } &:disabled { opacity: 0.5; cursor: not-allowed; } }

    @media (prefers-color-scheme: dark) {
      .modal-card { background: #0f172a; border-color: rgba(255, 255, 255, 0.05); }
      h3 { color: #f8fafc; }
      p { color: #94a3b8; }
      label { color: #94a3b8; }
      .save-mode-toggle { 
        background: #1e293b; 
        button { color: #94a3b8; &.active { background: #334155; color: #a78bfa; } }
      }
      input[type="text"], .select-pill-group button { background: #1e293b; border-color: #1e293b; color: #f8fafc; }
      .select-pill-group button.active { border-color: #7645c0; background: rgba(118, 69, 192, 0.1); color: #a78bfa; }
      .premium-toggle-box { background: rgba(251, 146, 60, 0.1); border-color: rgba(251, 146, 60, 0.2); .toggle-info label { color: #fb923c; } p { color: #fdba74; } }
      .t-switch .slider { background-color: #334155; }
      .btn-cancel { background: #1e293b; color: #e2e8f0; }
      .info-note { background: rgba(7, 89, 133, 0.15); p { color: #7dd3fc; } }
    }

    .animated-fade-in { animation: fadeIn 0.3s ease-out; }
    .animated-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  `]
})
export class SaveTemplateModalComponent {
  @Input() isAdmin = false;
  @Output() save = new EventEmitter<{ mode: 'draft' | 'template', name?: string, isPublic?: boolean, isPremium?: boolean }>();
  @Output() cancel = new EventEmitter<void>();

  mode: 'draft' | 'template' = 'draft';
  templateName = '';
  isPublic = false;
  isPremium = false;

  onSave() {
    if (this.mode === 'template') {
      if (this.templateName.trim()) {
        this.save.emit({ 
          mode: 'template',
          name: this.templateName.trim(), 
          isPublic: this.isPublic,
          isPremium: this.isPremium 
        });
      }
    } else {
      this.save.emit({ mode: 'draft' });
    }
  }

  onCancel() {
    this.cancel.emit();
  }
}
