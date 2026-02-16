import { Component, ChangeDetectionStrategy } from '@angular/core';
import { HeaderComponent } from '../../components/header/header.component';
import { ReleaseDocumentsListComponent } from '../release-documents-list/release-documents-list.component';

@Component({
  selector: 'app-release-documents',
  standalone: true,
  imports: [HeaderComponent, ReleaseDocumentsListComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-container">
      <app-header />
      <main class="main-content">
        <app-release-documents-list />
      </main>
    </div>
  `,
  styles: [`
    .page-container { min-height: 100vh; background: #f3f4f6; }
    .main-content { max-width: 1000px; margin: 0 auto; padding: 2rem; }
  `]
})
export class ReleaseDocumentsComponent {}
