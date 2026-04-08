import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-error401',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="error-container">
      <div class="abstract-blobs">
        <div class="blob b1"></div>
        <div class="blob b2"></div>
      </div>
      
      <div class="error-card glass-card animated-up">
        <div class="status-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <h1 class="error-title">Unauthorized Access</h1>
        <p class="error-message">
          It looks like you don't have the necessary clearance to view this page. 
          Please contact your administrator if you believe this is a mistake.
        </p>
        
        <div class="actions">
          <button class="btn-primary" routerLink="/dashboard">
            Back to Dashboard
          </button>
          <button class="btn-outline" routerLink="/login">
            Switch Account
          </button>
        </div>
      </div>

      <div class="footer-note">
        InvoGen &copy; 2026 Security Protocols Active
      </div>
    </div>
  `,
  styles: [`
    .error-container {
      height: 100dvh;
      width: 100vw;
      background: #0f172a;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
      padding: 24px;
      color: #f8fafc;
      font-family: 'Inter', system-ui, sans-serif;
    }

    .abstract-blobs {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 0;

      .blob {
        position: absolute;
        border-radius: 50%;
        filter: blur(100px);
        opacity: 0.1;
        animation: pulse 8s infinite alternate ease-in-out;

        &.b1 { width: 450px; height: 450px; background: #ef4444; top: -150px; left: -100px; }
        &.b2 { width: 400px; height: 400px; background: #7c3aed; bottom: -100px; right: -50px; animation-delay: -4s; }
      }
    }

    @keyframes pulse {
      from { transform: scale(1) translate(0, 0); opacity: 0.08; }
      to { transform: scale(1.1) translate(20px, 20px); opacity: 0.15; }
    }

    .error-card {
      position: relative;
      z-index: 10;
      padding: 50px 40px;
      max-width: 480px;
      width: 100%;
      text-align: center;
      background: rgba(30, 41, 59, 0.4);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 32px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
    }

    .status-icon {
      width: 80px;
      height: 80px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      color: #ef4444;

      svg { width: 40px; height: 40px; }
    }

    .error-title {
      font-size: 28px;
      font-weight: 850;
      margin-bottom: 16px;
      color: #fff;
      letter-spacing: -0.5px;
    }

    .error-message {
      font-size: 15px;
      color: #94a3b8;
      line-height: 1.6;
      margin-bottom: 32px;
    }

    .actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .btn-primary {
      padding: 14px 24px;
      background: #7c3aed;
      color: white;
      border: none;
      border-radius: 14px;
      font-weight: 700;
      font-size: 15px;
      cursor: pointer;
      transition: all 0.3s;
      box-shadow: 0 10px 15px -3px rgba(124, 58, 237, 0.3);

      &:hover {
        transform: translateY(-2px);
        background: #6d28d9;
        box-shadow: 0 15px 20px -5px rgba(124, 58, 237, 0.4);
      }
    }

    .btn-outline {
      padding: 14px 24px;
      background: transparent;
      color: #f8fafc;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 14px;
      font-weight: 700;
      font-size: 15px;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.2);
      }
    }

    .footer-note {
      position: absolute;
      bottom: 40px;
      font-size: 12px;
      color: #475569;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .animated-up {
      animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 480px) {
      .error-card { padding: 40px 20px; }
      .error-title { font-size: 22px; }
    }
  `]
})
export class Error401Component {}
