import { Component, OnInit, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { Icons } from '../../utils/icons.util';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent implements OnInit {
  icons = Icons;
  currentUser: User | null = null;
  loading = false;
  showCurrencyDropdown = false;

  currencies = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' }
  ];

  settingsForm = {
    invoiceSettings: {
      useCustomFormat: false,
      prefix: 'INV-',
      nextNumber: 1,
      padding: 4
    },
    defaultCurrency: { code: 'USD', symbol: '$' }
  };

  constructor(
    private authService: AuthService, 
    private toast: ToastService,
    private eRef: ElementRef
  ) { }

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.currentUser = user;
        this.settingsForm.invoiceSettings = {
          useCustomFormat: user.invoiceSettings?.useCustomFormat ?? false,
          prefix: user.invoiceSettings?.prefix || 'INV-',
          nextNumber: user.invoiceSettings?.nextNumber ?? 1,
          padding: user.invoiceSettings?.padding ?? 4
        };
        if (user.defaultCurrency) {
          this.settingsForm.defaultCurrency = { ...user.defaultCurrency };
        }
      }
    });
  }

  toggleCurrencyDropdown() {
    this.showCurrencyDropdown = !this.showCurrencyDropdown;
  }

  selectCurrency(currency: any) {
    this.settingsForm.defaultCurrency = { code: currency.code, symbol: currency.symbol };
    this.showCurrencyDropdown = false;
  }

  @HostListener('document:click', ['$event'])
  clickout(event: any) {
    if (!this.eRef.nativeElement.contains(event.target)) {
      this.showCurrencyDropdown = false;
    }
  }

  onCurrencyChange(code: string) {
    const found = this.currencies.find(c => c.code === code);
    if (found) {
      this.settingsForm.defaultCurrency = { code: found.code, symbol: found.symbol };
    }
  }

  async saveSettings() {
    if (!this.currentUser) return;
    this.loading = true;
    
    try {
      await this.authService.updateProfile(this.currentUser.id, {
        invoiceSettings: this.settingsForm.invoiceSettings,
        defaultCurrency: this.settingsForm.defaultCurrency
      });
      this.toast.success('Workspace configurations updated successfully');
    } catch (error) {
      console.error(error);
      this.toast.error('Failed to update settings');
    } finally {
      this.loading = false;
    }
  }
}
