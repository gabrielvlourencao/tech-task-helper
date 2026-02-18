import {
  Component,
  input,
  output,
  viewChild,
  effect,
  ChangeDetectionStrategy,
  ElementRef,
  AfterViewInit
} from '@angular/core';
import type { TechDocumentStep } from '../../core/models/tech-document.model';

/** Sanitiza HTML do step: permite tags seguras e img apenas com data:image */
export function sanitizeStepHtml(html: string): string {
  if (!html || !html.trim()) return '';
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    if (!doc?.body) return html;
    const allowedTags = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'ul', 'ol', 'li', 'span', 'div', 'img']);
    const walk = (node: Node): void => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        const tag = el.tagName.toLowerCase();
        if (!allowedTags.has(tag)) {
          const span = doc.createElement('span');
          while (el.firstChild) span.appendChild(el.firstChild);
          el.parentNode?.replaceChild(span, el);
          walk(span);
          return;
        }
        if (tag === 'img') {
          const src = el.getAttribute('src') ?? '';
          if (!src.startsWith('data:image/')) el.removeAttribute('src');
        }
      }
      let next: ChildNode | null;
      for (let child: ChildNode | null = node.firstChild; child; child = next) {
        next = child.nextSibling as ChildNode | null;
        walk(child);
      }
    };
    walk(doc.body);
    return doc.body?.innerHTML ?? html;
  } catch {
    return html;
  }
}

@Component({
  selector: 'app-step-description-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      #editable
      class="step-desc-editor-inner"
      contenteditable="true"
      role="textbox"
      aria-label="Descrição do passo (pode colar imagens)"
      data-placeholder="Detalhes do passo... (pode colar imagens)"
      (input)="emitContent()"
      (blur)="emitContent()"
      (paste)="onPaste($event)"
    ></div>
  `,
  styles: [`
    .step-desc-editor-inner {
      min-height: 60px;
      font-size: 0.875rem;
      outline: none;
    }
    .step-desc-editor-inner:empty::before {
      content: attr(data-placeholder);
      color: #9ca3af;
    }
    .step-desc-editor-inner img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 0.5rem 0;
      border-radius: 6px;
    }
  `]
})
export class StepDescriptionEditorComponent implements AfterViewInit {
  step = input.required<TechDocumentStep>();
  descriptionChange = output<string>();

  editable = viewChild<ElementRef<HTMLDivElement>>('editable');

  private lastStepId: string | null = null;

  constructor() {
    effect(() => {
      const s = this.step();
      const el = this.editable()?.nativeElement;
      if (!s || !el) return;
      if (this.lastStepId !== s.id) {
        this.lastStepId = s.id;
        const safe = sanitizeStepHtml(s.description || '');
        if (el) el.innerHTML = safe;
      }
    });
  }

  ngAfterViewInit(): void {
    this.syncContentFromStep();
    setTimeout(() => this.syncContentFromStep(), 0);
  }

  private syncContentFromStep(): void {
    const s = this.step();
    const el = this.editable()?.nativeElement;
    if (!s || !el) return;
    const currentHtml = el.innerHTML ?? '';
    if (this.lastStepId !== s.id || !currentHtml.trim()) {
      this.lastStepId = s.id;
      el.innerHTML = sanitizeStepHtml(s.description || '');
    }
  }

  emitContent(): void {
    const el = this.editable()?.nativeElement;
    if (el) this.descriptionChange.emit(el.innerHTML);
  }

  onPaste(e: ClipboardEvent): void {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (): void => {
          const dataUrl = reader.result as string;
          const sel = window.getSelection();
          const el = this.editable()?.nativeElement;
          if (!el) return;
          if (sel && el.contains(sel.anchorNode)) {
            const range = sel.getRangeAt(0);
            range.deleteContents();
            const img = document.createElement('img');
            img.src = dataUrl;
            img.setAttribute('alt', 'Imagem colada');
            range.insertNode(img);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
          } else {
            el.appendChild(document.createElement('br'));
            const img = document.createElement('img');
            img.src = dataUrl;
            img.setAttribute('alt', 'Imagem colada');
            el.appendChild(img);
          }
          this.emitContent();
        };
        reader.readAsDataURL(file);
        return;
      }
    }
  }
}
