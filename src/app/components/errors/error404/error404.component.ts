import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-error404',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="error-container">
      <div class="abstract-circles">
        <div class="circle c1"></div>
        <div class="circle c2"></div>
        <div class="circle c3"></div>
      </div>
      
      <div class="error-card glass-card animated-up">
        <div class="error-code">404</div>
        <h1 class="error-title">Page Not Found</h1>
        <p class="error-message">
          The page you're searching for seems to have vanished into the digital void. 
          Don't worry, your invoices are safe!
        </p>
        
        <button class="btn-primary" routerLink="/dashboard">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          Back to Home
        </button>
      </div>

      <div class="footer-note">
        InvoGen &copy; 2026 Professional Invoicing
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

    .abstract-circles {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 0;
      overflow: hidden;

      .circle {
        position: absolute;
        border-radius: 50%;
        filter: blur(80px);
        opacity: 0.15;
        animation: float 15s infinite alternate ease-in-out;

        &.c1 { width: 400px; height: 400px; background: #7c3aed; top: -100px; right: -50px; }
        &.c2 { width: 300px; height: 300px; background: #10b981; bottom: 50px; left: -50px; animation-delay: -5s; }
        &.c3 { width: 250px; height: 250px; background: #8b5cf6; top: 40%; left: 30%; animation-delay: -10s; }
      }
    }

    @keyframes float {
      from { transform: translate(0, 0) scale(1); }
      to { transform: translate(30px, 40px) scale(1.1); }
    }

    .error-card {
      position: relative;
      z-index: 10;
      padding: 60px 40px;
      max-width: 500px;
      width: 100%;
      text-align: center;
      background: rgba(30, 41, 59, 0.4);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 32px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }

    .error-code {
      font-size: 120px;
      font-weight: 900;
      background: linear-gradient(135deg, #7c3aed, #10b981);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 8px;
      letter-spacing: -4px;
      line-height: 1;
    }

    .error-title {
      font-size: 32px;
      font-weight: 800;
      margin-bottom: 20px;
      color: #fff;
      letter-spacing: -0.5px;
    }

    .error-message {
      font-size: 16px;
      color: #94a3b8;
      line-height: 1.6;
      margin-bottom: 40px;
    }

    .btn-primary {
      padding: 14px 32px;
      background: #7c3aed;
      color: white;
      border: none;
      border-radius: 16px;
      font-weight: 700;
      font-size: 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin: 0 auto;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 10px 20px -5px rgba(124, 58, 237, 0.4);

      &:hover {
        transform: translateY(-3px);
        box-shadow: 0 15px 30px -8px rgba(124, 58, 237, 0.5);
        background: #6d28d9;
      }

      &:active { transform: translateY(0); }
    }

    .footer-note {
      position: absolute;
      bottom: 40px;
      font-size: 13px;
      color: #64748b;
      font-weight: 600;
    }

    .animated-up {
      animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(40px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 480px) {
      .error-card { padding: 40px 24px; }
      .error-code { font-size: 80px; }
      .error-title { font-size: 24px; }
      .error-message { font-size: 14px; }
    }
  `]
})
export class Error404Component {}
