import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImageCropperComponent, ImageCroppedEvent } from 'ngx-image-cropper';

@Component({
  selector: 'app-image-cropper-modal',
  standalone: true,
  imports: [CommonModule, ImageCropperComponent],
  template: `
    <div class="cropper-overlay" (click)="onCancel()">
      <div class="cropper-modal" (click)="$event.stopPropagation()">
        <div class="cropper-body">
          <image-cropper
            [imageChangedEvent]="imageChangedEvent"
            [imageBase64]="imageBase64"
            [maintainAspectRatio]="maintainAspectRatio"
            [aspectRatio]="aspectRatio"
            [roundCropper]="roundCropper"
            [alignImage]="'center'"
            format="png"
            (imageCropped)="imageCropped($event)"
          ></image-cropper>
        </div>

        <div class="cropper-footer">
          <button class="btn-cancel" (click)="onCancel()">Cancel</button>
          <button class="btn-crop" (click)="onSave()" [disabled]="!croppedBlob">
            Crop & Save
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cropper-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.9);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 6000;
      padding: 16px;
      animation: fadeIn 0.15s ease-out;
    }

    .cropper-modal {
      width: 100%;
      max-width: 800px; /* Expanded workspace */
      background: #111;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 20px;
      box-shadow: 0 40px 100px rgba(0,0,0,0.8);
      overflow: hidden;
    }

    .cropper-body {
      padding: 12px;
      background: #000;
      min-height: 400px;
      max-height: 70vh;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .cropper-footer {
      padding: 16px 20px;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      background: #111;
    }

    button {
      padding: 10px 20px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-cancel {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      color: #999;
      &:hover { background: rgba(255,255,255,0.1); color: #fff; }
    }

    .btn-crop {
      background: #7645c0; /* var(--accent-color) equivalent */
      border: none;
      color: #fff;
      box-shadow: 0 4px 12px rgba(118, 69, 192, 0.3);
      &:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.1); }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }

    image-cropper {
      max-height: 60vh;
      width: 100%;
    }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  `]
})
export class ImageCropperModalComponent {
  @Input() imageChangedEvent: any = '';
  @Input() imageBase64: string = '';
  @Input() maintainAspectRatio: boolean = true;
  @Input() aspectRatio: number = 1;
  @Input() roundCropper = false;

  @Output() cropped = new EventEmitter<Blob>();
  @Output() canceled = new EventEmitter<void>();

  croppedBlob: Blob | null = null;

  imageCropped(event: ImageCroppedEvent) {
    if (event.blob) {
      this.croppedBlob = event.blob;
    }
  }

  onSave() {
    if (this.croppedBlob) {
      this.cropped.emit(this.croppedBlob);
    }
  }

  onCancel() {
    this.canceled.emit();
  }
}
