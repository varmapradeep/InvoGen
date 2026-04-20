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
import { SettingsComponent } from './components/settings/settings.component';
import { TemplateGalleryComponent } from './components/dashboard/template-gallery/template-gallery.component';
import { Error404Component } from './components/errors/error404/error404.component';
import { Error401Component } from './components/errors/error401/error401.component';


import { LandingPageComponent } from './components/landing-page/landing-page.component';

export const routes: Routes = [
  { path: '', component: LandingPageComponent },
  { path: 'login', component: LoginComponent },
  {
    path: 'dashboard',
    component: UserDashboardComponent,
    canActivate: [AuthGuard],
    data: { roles: ['USER'] }
  },
  {
    path: 'designs',
    component: TemplateGalleryComponent,
    canActivate: [AuthGuard],
    data: { roles: ['USER'] }
  },
  {
    path: 'documents',
    component: UserDocumentsComponent,
    canActivate: [AuthGuard],
    data: { roles: ['USER'] }
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
    path: 'profile',
    component: ProfileComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ADMIN', 'USER'] }
  },
  {
    path: 'settings',
    component: SettingsComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ADMIN', 'USER'] }
  },
  { path: '401', component: Error401Component },
  { path: '404', component: Error404Component },
  { path: '**', component: Error404Component }
];
