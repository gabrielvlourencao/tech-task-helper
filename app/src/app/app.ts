import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    @if (loading()) {
      <div class="app-loading">
        <div class="loading-spinner"></div>
        <p>Carregando...</p>
      </div>
    } @else {
      <router-outlet />
    }
  `,
  styles: [`
    .app-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .loading-spinner {
      width: 48px;
      height: 48px;
      border: 3px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 1rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    p {
      font-size: 1rem;
      opacity: 0.9;
    }
  `]
})
export class App {
  private authService = inject(AuthService);
  loading = this.authService.loading;
}
