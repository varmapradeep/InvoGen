import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-invoice-thumbnail',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="thumbnail-wrapper" [style.--accent]="fullData?.theme?.primaryColor || '#7645c0'">
      <div class="scaled-container">
        <!-- Mock A4 Page -->
        <div class="mini-page">
          <ng-container *ngFor="let s of fullData?.sessions">
            <ng-container *ngTemplateOutlet="sessionRenderer; context: { $implicit: s }"></ng-container>
          </ng-container>
          
          <!-- Watermark -->
          <div class="mini-watermark">InvoGen</div>
        </div>
      </div>
    </div>

    <!-- RECURSIVE RENDERER (Miniature version) -->
    <ng-template #sessionRenderer let-s>
      <!-- Layout Row -->
      <div class="mini-row" *ngIf="s.type === 'layout-row'" 
        [style.background-color]="s.bgColor"
        [style.padding.px]="(s.padding || 0) / 4">
        
        <div class="mini-cols">
          <div class="mini-col" *ngFor="let col of s.sessions" 
            [style.width.%]="col.width"
            [style.background-color]="col.bgColor"
            [style.align-items]="col.alignment === 'center' ? 'center' : (col.alignment === 'right' ? 'flex-end' : 'flex-start')">
            
            <ng-container *ngFor="let sub of col.sessions">
              <ng-container *ngTemplateOutlet="sessionRenderer; context: { $implicit: sub }"></ng-container>
            </ng-container>
          </div>
        </div>
      </div>

      <!-- Heading -->
      <div class="mini-heading" *ngIf="s.type === 'heading'" 
        [style.color]="s.textColor || 'inherit'">
        {{ s.content }}
      </div>

      <!-- Para / Lines (Simplified for thumbnail) -->
      <div class="mini-para" *ngIf="s.type === 'paragraph' || s.type === 'note'">
        <div class="para-line"></div>
        <div class="para-line short"></div>
      </div>

      <!-- Branding / Header -->
      <div class="mini-branding" *ngIf="s.type === 'header'">
         <div class="b-logo"></div>
         <div class="b-text">
            <div class="l1"></div>
            <div class="l2"></div>
         </div>
      </div>

      <!-- Items Table (Simplified) -->
      <div class="mini-table" *ngIf="s.type === 'items'">
         <div class="t-h"></div>
         <div class="t-r" *ngFor="let i of [1,2]"></div>
      </div>

      <!-- Image -->
      <div class="mini-img" *ngIf="s.type === 'image'">
         <div class="img-placeholder"></div>
      </div>

      <!-- Spacer -->
      <div class="mini-spacer" *ngIf="s.type === 'spacer'" [style.height.px]="(s.height || 20) / 5"></div>
    </ng-template>
  `,
  styles: [`
    :host { display: block; width: 100%; height: 100%; overflow: hidden; }
    .thumbnail-wrapper {
      width: 100%;
      height: 100%;
      background: var(--bg-dark, #0f172a);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .scaled-container {
      width: 210px; /* A4 aspect ratio scale base */
      height: 297px;
      transform: scale(0.85); /* Increased zoom as requested for "Big" look */
      transform-origin: top center; /* Focus strictly on the header down */
      box-shadow: 0 4px 15px rgba(0,0,0,0.05);
      border-radius: 4px;
      background: #fff;
      overflow: hidden;
      flex-shrink: 0;
    }
    .mini-page {
      padding: 15px;
      height: 297px; /* Strict A4 height for first page */
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden; /* Ensure only page 1 is visible */
    }
    
    /* Session Types */
    .mini-row { width: 100%; min-height: 5px; margin-bottom: 2px; }
    .mini-cols { display: flex; width: 100%; }
    .mini-col { display: flex; flex-direction: column; padding: 2px; }
    
    .mini-heading {
      font-size: 8px;
      font-weight: 900;
      line-height: 1;
      margin-bottom: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }
    
    .mini-para { 
      margin-bottom: 4px;
      .para-line { height: 2px; background: #e2e8f0; margin-bottom: 1px; border-radius: 1px; }
      .para-line.short { width: 60%; }
    }
    
    .mini-branding {
      display: flex; gap: 4px; align-items: center; margin-bottom: 8px;
      .b-logo { width: 14px; height: 14px; background: var(--accent); border-radius: 2px; }
      .b-text { flex: 1; .l1 { height: 2px; width: 40%; background: #475569; margin-bottom: 1px; } .l2 { height: 1.5px; width: 25%; background: #94a3b8; } }
    }
    
    .mini-table {
      width: 100%; margin: 6px 0;
      .t-h { height: 3px; background: #f1f5f9; border-radius: 1px; margin-bottom: 2px; }
      .t-r { height: 2px; background: #f8fafc; border-radius: 1px; margin-bottom: 1px; }
    }
    
    .mini-img {
      width: 100%; .img-placeholder { width: 100%; height: 30px; background: #f1f5f9; border-radius: 4px; }
    }
    
    .mini-watermark {
      position: absolute; bottom: 8px; right: 8px; font-size: 5px; font-weight: 900; color: #e2e8f0; text-transform: uppercase; letter-spacing: 0.5px;
    }
  `]
})
export class InvoiceThumbnailComponent {
  @Input() fullData: any;
}
