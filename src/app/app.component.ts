import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterModule, Router, NavigationEnd } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { filter } from 'rxjs/operators';
import { AuthService } from './services/auth.service';
import { ThemeService, Theme } from './services/theme.service';
import { InvoiceService } from './services/invoice.service';
import { SearchService } from './services/search.service';
import { LayoutService } from './services/layout.service';
import { InactivityService } from './services/inactivity.service';
import { Icons } from './utils/icons.util';
import { ToastComponent } from './components/toast/toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule, ToastComponent, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  icons = Icons;
  isSidebarCollapsed = false;
  isMobileMenuOpen = false;
  isStandalonePage = false;
  isInitializing = true; // New state to prevent flicker
  currentYear = new Date().getFullYear();
  currentUser: any = null;
  currentTheme: Theme = 'dark';

  get logoLink(): string {
    return this.currentUser?.role === 'ADMIN' ? '/admin/overview' : '/dashboard';
  }

  get homeLink(): string {
    return this.logoLink;
  }

  get createNewLink(): string {
    // For admins, it goes to template mode if in Design Center, but default to editor
    return '/editor';
  }

  get createNewParams(): any {
    return {}; // Standardized
  }
 
  templates: any[] = [];
  get userTemplates() { return this.templates.filter(t => !t.isPredefined); }
  get adminTemplates() { return this.templates.filter(t => t.isPredefined); }
 
  recentInvoices: any[] = [];
  get sidebarInvoices() { return this.recentInvoices.slice(0, 5); }

  constructor(
     private router: Router,
     private authService: AuthService,
     public themeService: ThemeService,
     private invoiceService: InvoiceService,
     private searchService: SearchService,
     private layoutService: LayoutService,
     private inactivity: InactivityService
  ) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const url = event.urlAfterRedirects;
      // List of base paths that require the dashboard shell
      const shellPaths = ['/dashboard', '/designs', '/documents', '/admin', '/editor', '/viewer', '/settings', '/profile'];
      
      // If it doesn't start with any shell path, it's a standalone page (Landing, Login, or Error pages)
      this.isStandalonePage = !shellPaths.some(p => url.startsWith(p)) || url === '/login' || url === '/';
      
      this.isMobileMenuOpen = false;
    });

    this.layoutService.sidebarCollapsed$.subscribe((collapsed: boolean) => {
      this.isSidebarCollapsed = collapsed;
    });
  }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.loadData(user.id);
        this.inactivity.startMonitoring();
      } else {
        this.inactivity.stopMonitoring();
      }
    });

    this.authService.initialAuthChecked$.subscribe(checked => {
      if (checked) {
        // Short delay to ensure router has stabilized
        setTimeout(() => this.isInitializing = false, 200);
      }
    });

    this.themeService.theme$.subscribe(theme => {
      this.currentTheme = theme;
    });
  }

  async loadData(userId: string) {
    this.templates = await this.invoiceService.getTemplates(userId);
    this.recentInvoices = await this.invoiceService.getInvoices(userId);
    this.recentInvoices.sort((a,b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());
  }

  onGlobalSearch(term: string) {
    this.searchService.setSearchTerm(term);
  }

  get currentSearchTerm() {
    return this.searchService.currentSearchTerm;
  }

  toggleSidebar(): void {
    if (window.innerWidth <= 992) {
      this.isMobileMenuOpen = !this.isMobileMenuOpen;
    } else {
      this.layoutService.toggleSidebar();
    }
  }

  toggleTheme(): void {
    const userId = this.currentUser?.id;
    this.themeService.toggleTheme(userId);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
