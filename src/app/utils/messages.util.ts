export const ToasterMessages = {
  // Auth & Session
  auth: {
    sessionExpired: 'Your session has expired. Please log in again.',
    welcomeBack: (name: string) => `Welcome back, ${name}!`,
    loginFailed: 'Invalid credentials. Please check your email and password.',
    googleLoginFailed: 'Google Sign-In failed. Please try again.',
    registrationSuccess: 'Registration successful! Your account is pending admin approval.',
    registrationFailed: 'Registration failed. Email might already be in use.',
    resetEmailSent: 'Password reset email sent! Check your inbox.',
    resetEmailFailed: 'Failed to send reset email. Ensure the email is correct.',
    pendingApproval: 'Your account is pending Admin approval. Please contact support.',
    enterCredentials: 'Please enter both email and password.',
    enterSignUpDetails: 'Please enter name, email, and password.',
    enterResetEmail: 'Please enter your email to reset password.'
  },

  // Profile & Settings
  profile: {
    logoSuccess: 'Professional logo uploaded!',
    logoFailed: 'Logo upload failed.',
    updateSuccess: 'Account info updated successfully!',
    updateFailed: 'Failed to update account.',
    nameRequired: 'Name cannot be empty.',
    passwordRequired: 'Current password is required.',
    newPasswordRequired: 'Please enter a new password.',
    passwordsMismatch: 'New passwords do not match.',
    passwordTooShort: 'Password must be at least 6 characters.',
    passwordUpdateSuccess: 'Password updated successfully!',
    wrongCurrentPassword: 'The current password you entered is incorrect.',
    requiresRecentLogin: 'For security, please log out and log back in before changing your password.',
    genericPasswordError: 'Failed to update password. Please check your current password.'
  },

  // Invoices & Documents
  invoices: {
    saveSuccess: 'Invoice saved successfully!',
    saveFailed: 'Failed to save invoice.',
    deleteSuccess: 'Invoice deleted successfully',
    deleteFailed: 'Failed to delete invoice',
    deleteConfirm: 'Are you sure you want to delete this invoice?',
    templateSaveSuccess: 'Template saved successfully!'
  },

  // Admin
  admin: {
    userApproved: 'User approved successfully!',
    userRevoked: 'Access revoked successfully!',
    userDeleted: 'User deleted from the system.',
    saveUserSuccess: 'User created successfully and is now ACTIVE.',
    errorSavingUser: 'Failed to create user. Please check the details.'
  }
};
