import { useEffect, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import {
  HybridSign,
  SessionFinalizedEndscreen,
  SessionCanceledEndscreen,
  RemoteSignatureEndscreen,
} from '@hs/lib';
import type { TenantId, Language, SessionEndEvent } from '@hs/lib';
import postHorn from './assets/post-horn.svg';
import { createSession } from '../api/init.service';
import {
  buildSessionPath,
  readSessionFromLocation,
  type SessionUrlState,
} from './sessionUrl';
import './App.css';

const INVALID_FILE_MESSAGE = 'Molimo izaberite PDF fajl.';
const TENANT_IDS: TenantId[] = [
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
const LANGUAGES: Language[] = ['en', 'de'];

function isPdfFile(candidate: File): boolean {
  if (candidate.type) {
    return candidate.type === 'application/pdf';
  }
  return candidate.name.toLowerCase().endsWith('.pdf');
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// Mirrors legacy's demo app `handleSessionEnd` switch (`pdf-viewer.component.ts`)
// — legacy navigates its own router to a full endscreen route; this demo has
// no router at all, so it just swaps which component is rendered in place.
// That's an internal simplification of the demo harness, not of the library:
// the library still only exposes `onSessionEnd` + the exported screen
// components, exactly like legacy's `sessionEnd` output + exported components.
function renderEndscreen(event: SessionEndEvent) {
  const tenantId = event.tenantId;
  const language = (event.locale || 'en') as Language;
  switch (event.reason) {
    case 'Canceled':
      return (
        <SessionCanceledEndscreen tenantId={tenantId} language={language} />
      );
    case 'Finalized':
    case 'SignatureWorkflow':
      return (
        <SessionFinalizedEndscreen tenantId={tenantId} language={language} />
      );
    case 'RemoteSignatureProcessing':
      return (
        <RemoteSignatureEndscreen
          tenantId={tenantId}
          language={language}
          deliveryChannel={event.deliveryChannel}
        />
      );
  }
}

export default function App() {
  const [signatureFlow, setSignatureFlow] = useState(false);
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<TenantId>('1');
  const [language, setLanguage] = useState<Language>('en');
  // Session identity lives on the URL (`/session?transactionId=&sk=`), same
  // as `_standalone`'s session-create → session-sign navigation — refresh
  // and invitation links reopen the viewer without re-uploading.
  const [session, setSession] = useState<SessionUrlState | null>(
    readSessionFromLocation,
  );
  const [sessionEndEvent, setSessionEndEvent] =
    useState<SessionEndEvent | null>(null);

  useEffect(() => {
    function onPopState() {
      const next = readSessionFromLocation();
      setSession(next);
      if (!next) setSessionEndEvent(null);
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  function goToSession(next: SessionUrlState) {
    history.pushState(null, '', buildSessionPath(next));
    setSession(next);
    setSessionEndEvent(null);
  }

  function goHome() {
    history.pushState(null, '', '/');
    setSession(null);
    setSessionEndEvent(null);
  }

  function onSessionEnd(event: SessionEndEvent) {
    // Standalone's default handler: cancel (and anything that isn't
    // finalize/workflow) navigates back to `/`. Finalize/workflow/remote
    // stay on the session URL and show the matching lib endscreen.
    if (event.reason === 'Canceled') {
      goHome();
      return;
    }
    setSessionEndEvent(event);
  }

  const canUpload = !signatureFlow || isValidEmail(email);
  const showEmailRequired =
    signatureFlow && emailTouched && email.trim() === '';
  const showEmailInvalid =
    signatureFlow &&
    emailTouched &&
    email.trim() !== '' &&
    !isValidEmail(email);

  // No review/confirm step: the demo embeds the viewer directly (unlike
  // `_demo_app_reference`, which only kicks off a session and redirects
  // elsewhere), so a valid selection goes straight into `createSession` and
  // on to `<HybridSign>`.
  async function takePdf(files: FileList | null) {
    if (!files?.length || !canUpload || isUploading) {
      return;
    }
    const list = Array.from(files);
    if (list.some((f) => !isPdfFile(f))) {
      setUploadError(INVALID_FILE_MESSAGE);
      return;
    }
    setUploadError(null);
    setIsUploading(true);
    try {
      const documents = await createSession(list, signatureFlow, email, note);
      const first = documents[0];
      goToSession({
        transactionId: first.transactionId,
        secretKey: first.secretKey,
        name: list[0].name,
        tenantId,
        language,
      });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setIsUploading(false);
    }
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    void takePdf(event.target.files);
    event.target.value = '';
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    void takePdf(event.dataTransfer.files);
  }

  if (session) {
    return (
      <div className="viewer-overlay">
        {sessionEndEvent ? (
          renderEndscreen(sessionEndEvent)
        ) : (
          <HybridSign
            tenantId={session.tenantId}
            language={session.language}
            transactionId={session.transactionId}
            secretKey={session.secretKey}
            signee={session.signee}
            apiEndpoint={import.meta.env.VITE_API_ENDPOINT}
            onSessionEnd={onSessionEnd}
          />
        )}
      </div>
    );
  }

  return (
    <div className="page">
      <header className="header">
        <div className="header__navigation">
          <a className="header__logo" href="https://www.post.at">
            <img src={postHorn} alt="Österreichische Post" />
          </a>
          <div className="header__controls">
            <div
              className="header__tenant-select"
              role="group"
              aria-label="Tenant"
            >
              {TENANT_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  disabled
                  className={
                    id === tenantId
                      ? 'header__tenant-button header__tenant-button--active'
                      : 'header__tenant-button'
                  }
                  aria-pressed={id === tenantId}
                  onClick={() => setTenantId(id)}
                >
                  Tenant {id}
                </button>
              ))}
            </div>
            <div
              className="header__language-select"
              role="group"
              aria-label="Language"
            >
              {LANGUAGES.map((code) => (
                <button
                  key={code}
                  type="button"
                  disabled
                  className={
                    code === language
                      ? 'header__language-button header__language-button--active'
                      : 'header__language-button'
                  }
                  aria-pressed={code === language}
                  onClick={() => setLanguage(code)}
                >
                  {code.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="form-wrapper">
        <div className="form-container">
          <h1 className="form-heading">PDF unterschreiben</h1>
          <div className="form-content">
            <div
              className="upload"
              onDragOver={(event) => event.preventDefault()}
              onDrop={onDrop}
            >
              <div className="upload__wrapper">
                <div className="upload__icon" aria-hidden="true">
                  <svg viewBox="0 0 72 72" width="72" height="72">
                    <rect
                      x="16"
                      y="10"
                      width="40"
                      height="52"
                      rx="3"
                      fill="none"
                      stroke="#0078c8"
                      strokeWidth="3"
                    />
                    <path
                      d="M36 28v20M28 36l8-8 8 8"
                      fill="none"
                      stroke="#0078c8"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <p className="upload__title">
                  {isUploading
                    ? 'Wird hochgeladen…'
                    : 'Datei per Drag und Drop ablegen oder'}
                </p>
                <span className="upload__button">Datei auswählen</span>
                <input
                  className="upload__file-input"
                  type="file"
                  accept="application/pdf"
                  multiple
                  aria-label="Datei auswählen"
                  disabled={!canUpload || isUploading}
                  onChange={onFileChange}
                />
              </div>
            </div>
            {uploadError && <p className="email-error">{uploadError}</p>}

            <form className="extras" autoComplete="off" noValidate>
              <div className="checkbox">
                <input
                  id="checkbox"
                  type="checkbox"
                  checked={signatureFlow}
                  onChange={(event) => {
                    setSignatureFlow(event.target.checked);
                    if (event.target.checked) {
                      setEmailTouched(true);
                    } else {
                      setEmail('');
                      setNote('');
                      setEmailTouched(false);
                    }
                  }}
                />
                <label htmlFor="checkbox">
                  Ich will einen Signaturlauf an mehrere Personen versenden.
                </label>
              </div>

              {signatureFlow && (
                <>
                  <div className="email">
                    <label htmlFor="email">
                      Bitte geben Sie Ihre E-Mail Adresse ein, auf der Sie das
                      von allen Parteien unterschriebene Dokument empfangen
                      wollen:
                    </label>
                    <input
                      id="email"
                      type="text"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        setEmailTouched(true);
                      }}
                    />
                    {showEmailInvalid && (
                      <p className="email-error">
                        Bitte geben Sie eine gültige E-Mail-Adresse an.
                      </p>
                    )}
                    {showEmailRequired && (
                      <p className="email-error">Pflichtfeld.</p>
                    )}
                  </div>
                  <div className="note">
                    <label htmlFor="note">Notiz:</label>
                    <textarea
                      id="note"
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                    />
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      </main>

      <footer className="footer">
        <div className="footer__item">
          <div className="footer__separator" />
          <h2 className="footer__title">HOTLINE: +43 800 2088 23</h2>
          <span className="footer__span">Servicezeiten:</span>
          <span className="footer__span">
            Montag - Donnerstag (werktags): 08:00 - 17:00
          </span>
          <span className="footer__span">
            Freitag (werktags): 08:00 - 14:00
          </span>
          <span className="footer__span">
            Support:{' '}
            <a href="mailto:servicedesk@sendhybrid.com">
              servicedesk@sendhybrid.com
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
