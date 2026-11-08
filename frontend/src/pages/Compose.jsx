
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Send,
    Eye,
    X,
    Info,
    AlertCircle,
    Search,
    Users,
    CheckCircle2,
    RefreshCw
} from 'lucide-react';

import api from '../services/api';

export default function Compose() {
    const [campaignName, setCampaignName] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');

    const [availableRecipients, setAvailableRecipients] = useState([]);
    const [recipients, setRecipients] = useState([]);

    const [recipientSearch, setRecipientSearch] = useState('');
    const [loadingRecipients, setLoadingRecipients] = useState(true);
    const [recipientError, setRecipientError] = useState('');

    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('success');
    const [preview, setPreview] = useState(false);

    const navigate = useNavigate();

    // Load all active and subscribed recipients from MongoDB.
    useEffect(() => {
        let active = true;

        async function loadRecipients() {
            setLoadingRecipients(true);
            setRecipientError('');

            try {
                const firstResponse = await api.get('/recipients', {
                    params: {
                        page: 1,
                        limit: 100,
                        trash: false
                    }
                });

                const firstData = firstResponse.data;
                let allItems = firstData.items || [];

                // Fetch additional pages if there are more than 100 contacts.
                const totalPages = firstData.pages || 1;

                if (totalPages > 1) {
                    const remainingPages = await Promise.all(
                        Array.from(
                            { length: totalPages - 1 },
                            (_, index) =>
                                api.get('/recipients', {
                                    params: {
                                        page: index + 2,
                                        limit: 100,
                                        trash: false
                                    }
                                })
                        )
                    );

                    remainingPages.forEach(response => {
                        allItems = allItems.concat(response.data.items || []);
                    });
                }

                if (active) {
                    const eligible = allItems.filter(
                        recipient =>
                            recipient.isDeleted === false &&
                            recipient.subscribed === true
                    );

                    setAvailableRecipients(eligible);

                    // Remove previously selected addresses that are no longer eligible.
                    const eligibleEmails = new Set(
                        eligible.map(recipient => recipient.email)
                    );

                    setRecipients(old =>
                        old.filter(email => eligibleEmails.has(email))
                    );
                }
            } catch (error) {
                if (active) {
                    setRecipientError(
                        error.response?.data?.message ||
                        error.message ||
                        'Unable to load recipients.'
                    );
                }
            } finally {
                if (active) {
                    setLoadingRecipients(false);
                }
            }
        }

        loadRecipients();

        return () => {
            active = false;
        };
    }, []);

    // Filter recipients using the search field.
    const filteredRecipients = useMemo(() => {
        const search = recipientSearch.trim().toLowerCase();

        if (!search) {
            return availableRecipients;
        }

        return availableRecipients.filter(recipient =>
            `${recipient.name || ''} ${recipient.email}`
                .toLowerCase()
                .includes(search)
        );
    }, [availableRecipients, recipientSearch]);

    // Check whether a recipient is selected.
    function isSelected(email) {
        return recipients.includes(email);
    }

    // Select or deselect an individual recipient.
    function toggleRecipient(email) {
        setRecipients(old =>
            old.includes(email)
                ? old.filter(item => item !== email)
                : [...old, email]
        );
    }

    // Select all currently visible recipients.
    function selectAll() {
        setRecipients(old => [
            ...new Set([
                ...old,
                ...filteredRecipients.map(recipient => recipient.email)
            ])
        ]);
    }

    // Deselect all currently visible recipients.
    function deselectAll() {
        const visibleEmails = new Set(
            filteredRecipients.map(recipient => recipient.email)
        );

        setRecipients(old =>
            old.filter(email => !visibleEmails.has(email))
        );
    }

    function showMessage(text, type = 'success') {
        setMessage(text);
        setMessageType(type);
    }

    // Submit campaign.
    async function send(e) {
        e.preventDefault();

        if (busy) return;

        if (!recipients.length) {
            showMessage(
                'Please select at least one subscribed recipient.',
                'error'
            );
            return;
        }

        if (
            !campaignName.trim() ||
            !subject.trim() ||
            !body.trim()
        ) {
            showMessage(
                'Please complete all campaign details.',
                'error'
            );
            return;
        }

        const confirmed = window.confirm(
            `Send "${campaignName}" to ${recipients.length} selected recipient(s)?`
        );

        if (!confirmed) return;

        setBusy(true);
        setMessage('');

        try {
            const { data } = await api.post('/campaigns', {
                campaignName: campaignName.trim(),
                subject: subject.trim(),
                body,
                recipients
            });

            showMessage(
                data.message || 'Campaign processed successfully.'
            );

            navigate('/campaigns');
        } catch (error) {
            showMessage(
                error.response?.data?.message ||
                error.message ||
                'Unable to send campaign.',
                'error'
            );
        } finally {
            setBusy(false);
        }
    }

    return (
        <>
            <div className="page-heading">
                <div>
                    <span className="eyebrow">CAMPAIGNS</span>
                    <h1>Compose campaign</h1>
                    <p>
                        Create a message and send it to your subscribed recipients.
                    </p>
                </div>
            </div>

            <div className="compose-layout">
                <form
                    className="panel compose-form"
                    onSubmit={send}
                >
                    {/* 01 Campaign details */}
                    <div className="form-section-title">
                        <span>01</span>
                        <div>
                            <h3>Campaign details</h3>
                            <p className="muted">
                                Give your campaign a name and subject.
                            </p>
                        </div>
                    </div>

                    <label>
                        Campaign name
                        <input
                            required
                            maxLength={120}
                            value={campaignName}
                            onChange={e => setCampaignName(e.target.value)}
                            placeholder="e.g. November product update"
                        />
                    </label>

                    <label>
                        Email subject
                        <input
                            required
                            maxLength={200}
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                            placeholder="What should the email subject say?"
                        />
                    </label>

                    {/* 02 Recipient selection */}
                    <div className="form-section-title spaced">
                        <span>02</span>
                        <div>
                            <h3>Recipients</h3>
                            <p className="muted">
                                Select contacts from your MailFlow recipient database.
                            </p>
                        </div>
                    </div>

                    <div className="recipient-selection">
                        <div className="recipient-selection-toolbar">
                            <div className="recipient-search">
                                <Search size={17} />
                                <input
                                    value={recipientSearch}
                                    onChange={e => setRecipientSearch(e.target.value)}
                                    placeholder="Search recipient name or email"
                                />
                            </div>

                            <div className="recipient-selection-actions">
                                <button
                                    type="button"
                                    className="text-action"
                                    onClick={selectAll}
                                    disabled={
                                        loadingRecipients ||
                                        filteredRecipients.length === 0
                                    }
                                >
                                    Select all
                                </button>

                                <button
                                    type="button"
                                    className="text-action"
                                    onClick={deselectAll}
                                    disabled={recipients.length === 0}
                                >
                                    Deselect visible
                                </button>
                            </div>
                        </div>

                        <div className="recipient-selection-summary">
                            <span>
                                <Users size={16} />
                                {availableRecipients.length} available
                            </span>

                            <span className="selected-count">
                                <CheckCircle2 size={16} />
                                {recipients.length} selected
                            </span>
                        </div>

                        {loadingRecipients ? (
                            <div className="recipient-loading">
                                <RefreshCw size={22} className="loading-icon" />
                                <span>Loading your recipients...</span>
                            </div>
                        ) : recipientError ? (
                            <div className="recipient-empty">
                                <AlertCircle size={25} />
                                <b>Unable to load recipients</b>
                                <span>{recipientError}</span>
                            </div>
                        ) : filteredRecipients.length > 0 ? (
                            <div className="recipient-list">
                                {filteredRecipients.map(recipient => (
                                    <label
                                        className={`recipient-option ${isSelected(recipient.email) ? 'selected' : ''
                                            }`}
                                        key={recipient._id}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected(recipient.email)}
                                            onChange={() =>
                                                toggleRecipient(recipient.email)
                                            }
                                        />

                                        <span className="recipient-option-info">
                                            <b>{recipient.name || 'Unnamed recipient'}</b>
                                            <span>{recipient.email}</span>
                                        </span>

                                        <span className="recipient-subscribed">
                                            Subscribed
                                        </span>
                                    </label>
                                ))}
                            </div>
                        ) : (
                            <div className="recipient-empty">
                                <Users size={28} />
                                <b>
                                    {availableRecipients.length === 0
                                        ? 'No subscribed recipients'
                                        : 'No matching recipients'}
                                </b>
                                <span>
                                    {availableRecipients.length === 0
                                        ? 'Add recipients and make sure they are subscribed.'
                                        : 'Try another name or email address.'}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="helper">
                        <Info size={15} />
                        Only active, subscribed contacts can receive campaigns.
                        Unsubscribed and deleted contacts are excluded.
                    </div>

                    {/* 03 Email content */}
                    <div className="form-section-title spaced">
                        <span>03</span>
                        <div>
                            <h3>Email content</h3>
                            <p className="muted">
                                Write a plain-text message. HTML templates can be added later.
                            </p>
                        </div>
                    </div>

                    <label>
                        Email body
                        <textarea
                            required
                            rows="9"
                            maxLength={100000}
                            value={body}
                            onChange={e => setBody(e.target.value)}
                            placeholder={'Hi there,\n\nWe are excited to share our latest updates…'}
                        />
                    </label>

                    {message && (
                        <div
                            className={`notice ${messageType === 'error' ? 'error-notice' : ''
                                }`}
                            role="status"
                        >
                            {messageType === 'error' && (
                                <AlertCircle size={16} />
                            )}
                            {message}
                        </div>
                    )}

                    <div className="form-actions">
                        <button
                            type="button"
                            className="btn secondary"
                            onClick={() => setPreview(true)}
                            disabled={busy}
                        >
                            <Eye size={16} />
                            Preview
                        </button>

                        <button
                            type="submit"
                            className="btn primary"
                            disabled={
                                busy ||
                                loadingRecipients ||
                                recipients.length === 0 ||
                                !campaignName.trim() ||
                                !subject.trim() ||
                                !body.trim()
                            }
                        >
                            <Send size={16} />
                            {busy ? 'Sending…' : 'Send campaign'}
                        </button>
                    </div>

                    <p className="fine-print">
                        Sending is rate-limited and intended for small,
                        consent-based campaigns. SMTP acceptance is not
                        proof of inbox delivery.
                    </p>
                </form>

                {/* Sidebar */}
                <aside className="panel send-aside">
                    <div className="aside-icon">
                        <Send />
                    </div>

                    <h3>Before you send</h3>

                    <ul>
                        <li>Confirm every recipient has opted in.</li>
                        <li>Check your subject and message for accuracy.</li>
                        <li>Send a test email using your SMTP provider's test tools before a real campaign.</li>
                    </ul>

                    <div className="aside-note">
                        <b>{recipients.length}</b>
                        <span>
                            recipient{recipients.length === 1 ? '' : 's'} selected
                        </span>
                    </div>
                </aside>
            </div>

            {/* Email preview */}
            {preview && (
                <div
                    className="modal-backdrop"
                    onClick={() => setPreview(false)}
                >
                    <div
                        className="modal"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="panel-heading">
                            <h3>Email preview</h3>
                            <button
                                type="button"
                                className="icon-button"
                                onClick={() => setPreview(false)}
                            >
                                <X />
                            </button>
                        </div>

                        <p>
                            <b>Campaign:</b> {campaignName || '—'}
                        </p>

                        <p>
                            <b>Subject:</b> {subject || '—'}
                        </p>

                        <p>
                            <b>Selected recipients:</b> {recipients.length}
                        </p>

                        <div className="preview-recipients">
                            {recipients.map(email => (
                                <span key={email}>{email}</span>
                            ))}
                        </div>

                        <div className="preview-body">
                            {body || 'Your email body will appear here.'}
                        </div>

                        <button
                            type="button"
                            className="btn primary"
                            onClick={() => setPreview(false)}
                        >
                            Close preview
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
