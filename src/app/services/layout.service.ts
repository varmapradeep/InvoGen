import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LayoutService {
  private sidebarCollapsed = new BehaviorSubject<boolean>(false);
  public sidebarCollapsed$ = this.sidebarCollapsed.asObservable();

  constructor() {}

  public setSidebarCollapsed(collapsed: boolean) {
    this.sidebarCollapsed.next(collapsed);
  }

  public toggleSidebar() {
    this.sidebarCollapsed.next(!this.sidebarCollapsed.value);
  }

  public isSidebarCollapsed(): boolean {
    return this.sidebarCollapsed.value;
  }
}
