import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="admin-shell">
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [`
    .admin-shell {
      min-height: 100%;
      background: var(--bg-dark);
    }
  `]
})
export class AdminComponent {}
