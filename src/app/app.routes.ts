import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./components/landing-page/landing-page.component').then(m => m.LandingPageComponent) },
  { path: 'login', loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent) },
  {
    path: 'dashboard',
    canActivate: [AuthGuard],
    data: { roles: ['USER'] },
    loadComponent: () => import('./components/dashboard/user-dashboard/user-dashboard.component').then(m => m.UserDashboardComponent)
  },
  {
    path: 'designs',
    canActivate: [AuthGuard],
    data: { roles: ['USER'] },
    loadComponent: () => import('./components/dashboard/template-gallery/template-gallery.component').then(m => m.TemplateGalleryComponent)
  },
  {
    path: 'documents',
    canActivate: [AuthGuard],
    data: { roles: ['USER'] },
    loadComponent: () => import('./components/dashboard/user-documents/user-documents.component').then(m => m.UserDocumentsComponent)
  },
  {
    path: 'admin',
    canActivate: [AuthGuard],
    data: { roles: ['ADMIN'] },
    loadComponent: () => import('./components/admin/admin.component').then(m => m.AdminComponent),
    children: [
      {
        path: 'overview',
        loadComponent: () => import('./components/admin/admin-overview/admin-overview.component').then(m => m.AdminOverviewComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./components/admin/admin-users/admin-users.component').then(m => m.AdminUserManagementComponent)
      },
      {
        path: 'designs',
        loadComponent: () => import('./components/admin/admin-designs/admin-designs.component').then(m => m.AdminDesignCenterComponent)
      },
      {
        path: 'create-user',
        loadComponent: () => import('./components/admin/user-create/user-create.component').then(m => m.UserCreateComponent)
      },
      { path: '', redirectTo: 'overview', pathMatch: 'full' }
    ]
  },
  {
    path: 'editor',
    canActivate: [AuthGuard],
    data: { roles: ['ADMIN', 'USER'] },
    loadComponent: () => import('./components/invoice-editor/invoice-editor.component').then(m => m.InvoiceEditorComponent)
  },
  {
    path: 'editor/:id',
    canActivate: [AuthGuard],
    data: { roles: ['ADMIN', 'USER'] },
    loadComponent: () => import('./components/invoice-editor/invoice-editor.component').then(m => m.InvoiceEditorComponent)
  },
  {
    path: 'viewer/:id',
    canActivate: [AuthGuard],
    data: { roles: ['ADMIN', 'USER'] },
    loadComponent: () => import('./components/invoice-viewer/invoice-viewer.component').then(m => m.InvoiceViewerComponent)
  },
  {
    path: 'profile',
    canActivate: [AuthGuard],
    data: { roles: ['ADMIN', 'USER'] },
    loadComponent: () => import('./components/profile/profile.component').then(m => m.ProfileComponent)
  },
  {
    path: 'settings',
    canActivate: [AuthGuard],
    data: { roles: ['ADMIN', 'USER'] },
    loadComponent: () => import('./components/settings/settings.component').then(m => m.SettingsComponent)
  },
  { path: '401', loadComponent: () => import('./components/errors/error401/error401.component').then(m => m.Error401Component) },
  { path: '404', loadComponent: () => import('./components/errors/error404/error404.component').then(m => m.Error404Component) },
  { path: '**', loadComponent: () => import('./components/errors/error404/error404.component').then(m => m.Error404Component) }
];