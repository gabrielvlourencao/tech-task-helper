import { Component, inject, signal, ChangeDetectionStrategy, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { HeaderComponent } from '../../components/header/header.component';

@Component({
  selector: 'app-documentos',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, HeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-container">
      <app-header />

      <main class="main-content">
        <nav class="doc-tabs" role="tablist" aria-label="Tipo de documento">
          <a
            routerLink="/documentos/releases"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: false }"
            class="tab tab-releases"
            [class.active]="isReleasesActive()"
            role="tab"
            aria-selected="isReleasesActive()"
            aria-controls="panel-releases"
            id="tab-releases"
          >
            <span class="tab-icon" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
            </span>
            <span class="tab-label">Releases</span>
            <span class="tab-desc">Deploy / go-live</span>
          </a>
          <a
            routerLink="/documentos/tech"
            routerLinkActive="active"
            class="tab tab-tech"
            [class.active]="isTechActive()"
            role="tab"
            aria-selected="isTechActive()"
            aria-controls="panel-tech"
            id="tab-tech"
          >
            <span class="tab-icon" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <path d="M16 13H8"></path>
                <path d="M16 17H8"></path>
                <path d="M10 9H8"></path>
              </svg>
            </span>
            <span class="tab-label">Docs Técnicos</span>
            <span class="tab-desc">Desenho de solução, especificação</span>
          </a>
        </nav>

        <div class="tab-panel" [id]="isReleasesActive() ? 'panel-releases' : 'panel-tech'" role="tabpanel" [attr.aria-labelledby]="isReleasesActive() ? 'tab-releases' : 'tab-tech'">
          <router-outlet />
        </div>
      </main>
    </div>
  `,
  styles: [`
    .page-container { min-height: 100vh; background: #f3f4f6; }
    .main-content { max-width: 1000px; margin: 0 auto; padding: 2rem; }

    .doc-tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 0;
    }

    .tab {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.875rem 1.25rem;
      border-radius: 10px 10px 0 0;
      text-decoration: none;
      color: #6b7280;
      font-weight: 500;
      transition: all 0.2s ease;
      border: 2px solid transparent;
      border-bottom: none;
      margin-bottom: -2px;
      background: #f9fafb;
    }

    .tab:hover {
      color: #374151;
      background: #f3f4f6;
    }

    .tab-icon {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .tab-label {
      font-size: 1rem;
    }

    .tab-desc {
      font-size: 0.75rem;
      font-weight: 400;
      color: #9ca3af;
      margin-left: 0.25rem;
    }

    .tab.active .tab-desc {
      color: rgba(255,255,255,0.85);
    }

    .tab-releases.active {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-color: #5a67d8;
    }

    .tab-tech.active {
      background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
      color: white;
      border-color: #0284c7;
    }

    .tab-panel {
      min-height: 200px;
    }
  `]
})
export class DocumentosComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private sub: ReturnType<Router['events']['subscribe']> | null = null;

  currentTab = signal<'releases' | 'tech'>('releases');

  ngOnInit(): void {
    this.updateTabFromUrl(this.router.url);
    this.sub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.updateTabFromUrl(e.url));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private updateTabFromUrl(url: string): void {
    this.currentTab.set(url.startsWith('/documentos/tech') ? 'tech' : 'releases');
  }

  isReleasesActive(): boolean {
    return this.currentTab() === 'releases';
  }

  isTechActive(): boolean {
    return this.currentTab() === 'tech';
  }
}