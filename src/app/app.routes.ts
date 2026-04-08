import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { AuthGuard } from './guards/auth.guard';
import { UserDashboardComponent } from './components/dashboard/user-dashboard/user-dashboard.component';
import { UserDocumentsComponent } from './components/dashboard/user-documents/user-documents.component';
import { AdminComponent } from './components/admin/admin.component';
import { AdminOverviewComponent } from './components/admin/admin-overview/admin-overview.component';
import { AdminUserManagementComponent } from './components/admin/admin-users/admin-users.component';
import { AdminDesignCenterComponent } from './components/admin/admin-designs/admin-designs.component';
import { UserCreateComponent } from './components/admin/user-create/user-create.component';
import { InvoiceEditorComponent } from './components/invoice-editor/invoice-editor.component';
import { InvoiceViewerComponent } from './components/invoice-viewer/invoice-viewer.component';
import { ProfileComponent } from './components/profile/profile.component';
import { TemplateGalleryComponent } from './components/dashboard/template-gallery/template-gallery.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: 'dashboard',
    component: UserDashboardComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ADMIN', 'USER'] }
  },
  {
    path: 'designs',
    component: TemplateGalleryComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ADMIN', 'USER'] }
  },
  {
    path: 'documents',
    component: UserDocumentsComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ADMIN', 'USER'] }
  },
  {
    path: 'admin',
    component: AdminComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ADMIN'] },
    children: [
      { path: 'overview', component: AdminOverviewComponent },
      { path: 'users', component: AdminUserManagementComponent },
      { path: 'designs', component: AdminDesignCenterComponent },
      { path: 'create-user', component: UserCreateComponent },
      { path: '', redirectTo: 'overview', pathMatch: 'full' }
    ]
  },
  {
    path: 'editor',
    component: InvoiceEditorComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ADMIN', 'USER'] }
  },
  {
    path: 'editor/:id',
    component: InvoiceEditorComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ADMIN', 'USER'] }
  },
  {
    path: 'viewer/:id',
    component: InvoiceViewerComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ADMIN', 'USER'] }
  },
  {
    path: 'settings',
    component: ProfileComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ADMIN', 'USER'] }
  },
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: '/dashboard' }
];
