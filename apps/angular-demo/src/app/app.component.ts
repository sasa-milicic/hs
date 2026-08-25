import { Component, computed, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { HybridSignHostComponent } from './hybrid-sign-host.component';
import type { TenantId, Language, SessionEndEvent } from '@hs/lib';
import { API_ENDPOINT, InitService } from './init.service';
import {
  buildSessionPath,
  readSessionFromLocation,
  type SessionUrlState,
} from './session-url';

const INVALID_FILE_MESSAGE = 'Molimo izaberite PDF fajl.';
const TENANT_IDS: readonly TenantId[] = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
];
const LANGUAGES: readonly Language[] = ['en', 'de'];

function isPdfFile(candidate: File): boolean {
  if (candidate.type) {
    return candidate.type === 'application/pdf';
  }
  return candidate.name.toLowerCase().endsWith('.pdf');
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

@Component({
  selector: 'app-root',
  imports: [HybridSignHostComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  private readonly initService = inject(InitService);
  private readonly location = inject(Location);

  protected readonly tenantIds = TENANT_IDS;
  protected readonly languages = LANGUAGES;
  protected readonly apiEndpoint = API_ENDPOINT;

  protected readonly signatureFlow = signal(false);
  protected readonly email = signal('');
  protected readonly note = signal('');
  protected readonly emailTouched = signal(false);
  protected readonly isUploading = signal(false);
  protected readonly uploadError = signal<string | null>(null);
  protected readonly tenantId = signal<TenantId>('1');
  protected readonly language = signal<Language>('en');
  // Session identity lives on the URL (`/session?transactionId=&sk=`), same
  // as `_standalone`'s session-create → session-sign navigation — refresh
  // and invitation links reopen the viewer without re-uploading.
  protected readonly session = signal<SessionUrlState | null>(
    readSessionFromLocation(),
  );
  protected readonly sessionEndEvent = signal<SessionEndEvent | null>(null);

  constructor() {
    this.applyFromUrl();
    this.location.subscribe(() => this.applyFromUrl());
  }

  private applyFromUrl(): void {
    const parsed = readSessionFromLocation();
    this.session.set(parsed);
    if (parsed) {
      this.tenantId.set(parsed.tenantId);
      this.language.set(parsed.language);
    } else {
      this.sessionEndEvent.set(null);
    }
  }

  private goToSession(next: SessionUrlState): void {
    this.location.go(buildSessionPath(next));
    this.applyFromUrl();
  }

  private goHome(): void {
    this.location.go('/');
    this.applyFromUrl();
  }

  protected readonly canUpload = computed(
    () => !this.signatureFlow() || isValidEmail(this.email()),
  );
  protected readonly showEmailRequired = computed(
    () =>
      this.signatureFlow() && this.emailTouched() && this.email().trim() === '',
  );
  protected readonly showEmailInvalid = computed(
    () =>
      this.signatureFlow() &&
      this.emailTouched() &&
      this.email().trim() !== '' &&
      !isValidEmail(this.email()),
  );

  protected selectTenant(id: TenantId): void {
    this.tenantId.set(id);
  }

  protected selectLanguage(code: Language): void {
    this.language.set(code);
  }

  protected onSessionEnd(event: SessionEndEvent): void {
    // Standalone's default handler: cancel navigates back to `/`.
    // Finalize/workflow/remote stay on the session URL and show the matching
    // lib endscreen.
    if (event.reason === 'Canceled') {
      this.goHome();
      return;
    }
    this.sessionEndEvent.set(event);
  }

  protected onSignatureFlowChange(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.signatureFlow.set(checked);
    if (checked) {
      this.emailTouched.set(true);
    } else {
      this.email.set('');
      this.note.set('');
      this.emailTouched.set(false);
    }
  }

  protected onEmailInput(event: Event): void {
    this.email.set((event.target as HTMLInputElement).value);
    this.emailTouched.set(true);
  }

  protected onNoteInput(event: Event): void {
    this.note.set((event.target as HTMLTextAreaElement).value);
  }

  protected onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    void this.takePdf(input.files);
    input.value = '';
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    void this.takePdf(event.dataTransfer?.files ?? null);
  }

  private async takePdf(files: FileList | null): Promise<void> {
    if (!files?.length || !this.canUpload() || this.isUploading()) {
      return;
    }
    const list = Array.from(files);
    if (list.some((f) => !isPdfFile(f))) {
      this.uploadError.set(INVALID_FILE_MESSAGE);
      return;
    }
    this.uploadError.set(null);
    this.isUploading.set(true);
    try {
      const documents = await this.initService.createSession(
        list,
        this.signatureFlow(),
        this.email(),
        this.note(),
      );
      const first = documents[0];
      this.goToSession({
        transactionId: first.transactionId,
        secretKey: first.secretKey,
        name: list[0].name,
        tenantId: this.tenantId(),
        language: this.language(),
      });
    } catch (err) {
      this.uploadError.set(
        err instanceof Error ? err.message : 'Unbekannter Fehler',
      );
    } finally {
      this.isUploading.set(false);
    }
  }
}
