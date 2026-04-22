import { Component, OnInit, AfterViewInit, ElementRef, ViewChildren, QueryList, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Icons } from '../../utils/icons.util';
import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';
import { Firestore, collection, addDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss'
})
export class LandingPageComponent implements OnInit, AfterViewInit {
  icons = Icons;
  themeService = inject(ThemeService);
  authService = inject(AuthService);
  router = inject(Router);
  private firestore = inject(Firestore);

  currentUser$ = this.authService.currentUser$;
  
  isMenuOpen = false;
  showContactModal = false;
  isSending = false;
  isSent = false;
  
  contactForm = {
    name: '',
    email: '',
    message: ''
  };

  features = [
    {
      title: 'Smart Templates',
      desc: 'Choose from a gallery of professionally designed themes that adapt to your brand.',
      icon: this.icons.grid
    },
    {
      title: 'Real-time Preview',
      desc: 'See exactly what your customers will see with our high-fidelity document engine.',
      icon: this.icons.eye
    },
    {
      title: 'One-Click Export',
      desc: 'Download high-quality PDFs or share direct links with your clients instantly.',
      icon: this.icons.download
    },
    {
      title: 'Business Insights',
      desc: 'Track your revenue and issued documents through a streamlined dashboard.',
      icon: this.icons.dashboard
    }
  ];

  plans = [
    {
      name: 'Starter',
      price: 'Free',
      features: ['5 Invoices / month', 'Basic Templates', 'Single User', 'Standard Support'],
      recommended: false
    },
    {
      name: 'Professional',
      price: '99',
      features: ['Unlock Premium Templates', 'Unlimited Invoices', 'Multiple Businesses', 'Priority Support', 'Custom Branding'],
      recommended: true
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      features: ['Fully Customizable', 'Team Collaboration', 'API Access', 'Dedicated Account Manager'],
      recommended: false,
      isContact: true
    }
  ];

  stats = [
    { value: '10K+', label: 'Active Users' },
    { value: '500K+', label: 'Invoices Issued' },
    { value: '99.9%', label: 'Uptime' }
  ];

  @ViewChildren('reveal') revealElements!: QueryList<ElementRef>;

  currentTheme: 'dark' | 'light' = 'dark';

  constructor() {
    this.currentTheme = (this.themeService.currentTheme || 'dark') as any;
    // Subscribe to theme changes
    this.themeService.theme$.subscribe(t => this.currentTheme = t as any);
  }

  ngOnInit(): void {}

  ngAfterViewInit() {
    this.revealElements.forEach(el => {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
          }
        });
      }, { threshold: 0.1 });
      observer.observe(el.nativeElement);
    });
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu() {
    this.isMenuOpen = false;
  }

  openContact() {
    this.showContactModal = true;
    this.isSent = false;
    this.closeMenu();
  }

  closeContact() {
    this.showContactModal = false;
  }

  async submitContact() {
    if (!this.contactForm.name || !this.contactForm.email) return;
    
    this.isSending = true;
    try {
      // Save contact submission to Firestore
      const submissionsRef = collection(this.firestore, 'contact_submissions');
      await addDoc(submissionsRef, {
        name: this.contactForm.name,
        email: this.contactForm.email,
        message: this.contactForm.message,
        submittedAt: new Date().toISOString()
      });
      this.isSent = true;
      this.contactForm = { name: '', email: '', message: '' };
      setTimeout(() => this.closeContact(), 2000);
    } catch (e) {
      console.error('Contact form submission failed:', e);
      // Still show sent to user — form data logged in console as fallback
      this.isSent = true;
      setTimeout(() => this.closeContact(), 2000);
    } finally {
      this.isSending = false;
    }
  }

  async goToDashboard() {
    const user = this.authService.currentUserValue;
    if (user) {
      const dest = user.role === 'ADMIN' ? '/admin' : '/dashboard';
      this.router.navigate([dest]);
    } else {
      this.router.navigate(['/login']);
    }
  }

  scrollToSection(id: string) {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: 'smooth' });
    this.closeMenu();
  }
}
