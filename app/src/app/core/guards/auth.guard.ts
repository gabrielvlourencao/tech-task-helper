import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Wait for auth to be ready
  return new Promise<boolean>((resolve) => {
    const checkAuth = () => {
      if (authService.loading()) {
        setTimeout(checkAuth, 50);
        return;
      }

      if (authService.isAuthenticated()) {
        resolve(true);
      } else {
        router.navigate(['/login']);
        resolve(false);
      }
    };

    checkAuth();
  });
};

export const publicGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Wait for auth to be ready
  return new Promise<boolean>((resolve) => {
    const checkAuth = () => {
      if (authService.loading()) {
        setTimeout(checkAuth, 50);
        return;
      }

      if (authService.isAuthenticated()) {
        router.navigate(['/']);
        resolve(false);
      } else {
        resolve(true);
      }
    };

    checkAuth();
  });
};
