import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  OnChanges,
  OnDestroy,
  AfterViewInit,
  NgZone,
  ViewChild,
  inject,
} from '@angular/core';
import { createElement, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  HybridSign,
  SessionFinalizedEndscreen,
  SessionCanceledEndscreen,
  RemoteSignatureEndscreen,
} from '@hs/lib';
import type { TenantId, Language, SessionEndEvent } from '@hs/lib';

@Component({
  selector: 'app-hybrid-sign-host',
  template: '<div #container class="hybrid-sign-host"></div>',
  styles: [
    ':host { display: block; width: 100%; height: 100%; }',
    '.hybrid-sign-host { width: 100%; height: 100%; }',
  ],
})
export class HybridSignHostComponent
  implements AfterViewInit, OnChanges, OnDestroy
{
  private readonly ngZone = inject(NgZone);

  @ViewChild('container', { static: true })
  private containerRef!: ElementRef<HTMLDivElement>;

  @Input() tenantId: TenantId = '1';
  @Input() language: Language = 'en';
  @Input({ required: true }) transactionId!: string;
  @Input() secretKey?: string;
  @Input() signee?: string;
  @Input() apiEndpoint?: string;
  @Input() sessionEndEvent: SessionEndEvent | null = null;

  @Output() readonly sessionEnd = new EventEmitter<SessionEndEvent>();

  private root: Root | null = null;

  private readonly handleSessionEnd = (event: SessionEndEvent): void => {
    this.ngZone.run(() => this.sessionEnd.emit(event));
  };

  ngAfterViewInit(): void {
    this.root = createRoot(this.containerRef.nativeElement);
    this.renderReactTree();
  }

  ngOnChanges(): void {
    this.renderReactTree();
  }

  ngOnDestroy(): void {
    this.root?.unmount();
    this.root = null;
  }

  private renderReactTree(): void {
    this.root?.render(
      this.sessionEndEvent
        ? this.createEndscreen(this.sessionEndEvent)
        : createElement(HybridSign, {
            tenantId: this.tenantId,
            language: this.language,
            transactionId: this.transactionId,
            secretKey: this.secretKey,
            signee: this.signee,
            apiEndpoint: this.apiEndpoint,
            onSessionEnd: this.handleSessionEnd,
          }),
    );
  }

  private createEndscreen(event: SessionEndEvent): ReactElement {
    const tenantId = event.tenantId;
    const language = (event.locale || 'en') as Language;
    switch (event.reason) {
      case 'Canceled':
        return createElement(SessionCanceledEndscreen, { tenantId, language });
      case 'Finalized':
      case 'SignatureWorkflow':
        return createElement(SessionFinalizedEndscreen, { tenantId, language });
      case 'RemoteSignatureProcessing':
        return createElement(RemoteSignatureEndscreen, {
          tenantId,
          language,
          deliveryChannel: event.deliveryChannel,
        });
    }
  }
}
