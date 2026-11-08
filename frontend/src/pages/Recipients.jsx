
import { useEffect, useRef, useState } from 'react';
import Papa from 'papaparse';
import {
    Plus,
    Search,
    Upload,
    Trash2,
    RotateCcw,
    Users,
    Pencil,
    UserMinus,
    UserCheck,
    X,
    Save
} from 'lucide-react';

import api from '../services/api';

export default function Recipients({ trash = false }) {
    const [items, setItems] = useState([]);
    const [q, setQ] = useState('');
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);

    // Edit recipient state.
    const [editingId, setEditingId] = useState(null);
    const [editingName, setEditingName] = useState('');
    const [saving, setSaving] = useState(false);

    const fileRef = useRef();

    // Load recipients.
    async function load() {
        try {
            const { data } = await api.get('/recipients', {
                params: {
                    q,
                    trash,
                    limit: 100
                }
            });

            setItems(data.items);
        } catch (e) {
            setMessage(
                e.response?.data?.message || e.message
            );
        }
    }

    useEffect(() => {
        load();
    }, [q, trash]);

    // Add recipient.
    async function add(e) {
        e.preventDefault();

        try {
            await api.post('/recipients', {
                name,
                email
            });

            setName('');
            setEmail('');
            setMessage('Recipient added successfully.');

            await load();
        } catch (e) {
            setMessage(
                e.response?.data?.message || e.message
            );
        }
    }

    // Open edit form.
    function startEdit(recipient) {
        setEditingId(recipient._id);
        setEditingName(recipient.name || '');
        setMessage('');
    }

    // Cancel editing.
    function cancelEdit() {
        setEditingId(null);
        setEditingName('');
    }

    // Save recipient name.
    async function saveEdit(e) {
        e.preventDefault();

        if (!editingId) return;

        setSaving(true);

        try {
            await api.patch(`/recipients/${editingId}`, {
                name: editingName
            });

            setMessage('Recipient name updated successfully.');

            cancelEdit();
            await load();
        } catch (e) {
            setMessage(
                e.response?.data?.message || e.message
            );
        } finally {
            setSaving(false);
        }
    }

    // Subscribe or unsubscribe recipient.
    async function toggleSubscription(recipient) {
        const action = recipient.subscribed
            ? 'unsubscribe'
            : 'resubscribe';

        const confirmed = window.confirm(
            `Are you sure you want to ${action} ${recipient.email}?`
        );

        if (!confirmed) return;

        try {
            await api.patch(`/recipients/${recipient._id}`, {
                subscribed: !recipient.subscribed
            });

            setMessage(
                recipient.subscribed
                    ? 'Recipient unsubscribed successfully.'
                    : 'Recipient subscribed successfully.'
            );

            await load();
        } catch (e) {
            setMessage(
                e.response?.data?.message || e.message
            );
        }
    }

    // Move recipient to trash.
    async function remove(id) {
        if (!window.confirm('Move this recipient to trash?')) {
            return;
        }

        try {
            await api.delete(`/recipients/${id}`);

            setMessage('Recipient moved to trash.');

            await load();
        } catch (e) {
            setMessage(
                e.response?.data?.message || e.message
            );
        }
    }

    // Restore recipient.
    async function restore(id) {
        try {
            await api.post(`/recipients/${id}/restore`);

            setMessage('Recipient restored successfully.');

            await load();
        } catch (e) {
            setMessage(
                e.response?.data?.message || e.message
            );
        }
    }

    // Permanently delete recipient.
    async function permanent(id) {
        if (
            !window.confirm(
                'Permanently delete this recipient? This cannot be undone.'
            )
        ) {
            return;
        }

        try {
            await api.delete(`/recipients/${id}/permanent`);

            setMessage('Recipient permanently deleted.');

            await load();
        } catch (e) {
            setMessage(
                e.response?.data?.message || e.message
            );
        }
    }

    // Import CSV file.
    async function importFile(file) {
        setBusy(true);
        setMessage('');

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,

            complete: async result => {
                try {
                    const rows = result.data
                        .map(row => ({
                            email: row.email || row.Email || row.EMAIL,
                            name: row.name || row.Name || ''
                        }))
                        .filter(row => row.email);

                    if (!rows.length) {
                        setMessage(
                            'No valid email addresses found in the CSV file.'
                        );
                        return;
                    }

                    const { data } = await api.post(
                        '/recipients/import',
                        {
                            recipients: rows
                        }
                    );

                    setMessage(
                        `Import complete: ${data.imported} imported, ${data.restored || 0} restored, ${data.skipped} skipped.`
                    );

                    await load();
                } catch (e) {
                    setMessage(
                        e.response?.data?.message || e.message
                    );
                } finally {
                    setBusy(false);

                    if (fileRef.current) {
                        fileRef.current.value = '';
                    }
                }
            },

            error: error => {
                setMessage(`CSV parsing failed: ${error.message}`);
                setBusy(false);
            }
        });
    }

    return (
        <>
            <div className="page-heading">
                <div>
                    <span className="eyebrow">CONTACTS</span>

                    <h1>{trash ? 'Trash' : 'Recipients'}</h1>

                    <p>
                        {trash
                            ? 'Restore deleted contacts or permanently remove them.'
                            : 'Manage your opted-in email audience.'}
                    </p>
                </div>

                {!trash && (
                    <button
                        className="btn secondary"
                        onClick={() => fileRef.current?.click()}
                        disabled={busy}
                    >
                        <Upload size={16} />
                        {busy ? 'Importing...' : 'Import CSV'}
                    </button>
                )}
            </div>

            {!trash && (
                <div className="panel add-recipient">
                    <form onSubmit={add}>
                        <label>
                            Name

                            <input
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Recipient name"
                                maxLength={100}
                            />
                        </label>

                        <label>
                            Email address

                            <input
                                required
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="name@example.com"
                            />
                        </label>

                        <button className="btn primary" type="submit">
                            <Plus size={16} />
                            Add recipient
                        </button>
                    </form>

                    <input
                        ref={fileRef}
                        hidden
                        type="file"
                        accept=".csv,text/csv"
                        onChange={e => {
                            if (e.target.files?.[0]) {
                                importFile(e.target.files[0]);
                            }
                        }}
                    />

                    <p className="fine-print">
                        CSV must contain an <code>email</code> column;
                        optional <code>name</code> column.
                        {busy ? ' Importing...' : ''}
                    </p>
                </div>
            )}

            <section className="panel table-panel">
                <div className="table-toolbar">
                    <div className="searchbox">
                        <Search size={17} />

                        <input
                            value={q}
                            onChange={e => setQ(e.target.value)}
                            placeholder="Search name or email"
                        />
                    </div>

                    <span className="pill">
                        {items.length} shown
                    </span>
                </div>

                {message && (
                    <div className="notice">
                        {message}
                    </div>
                )}

                {items.length ? (
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Status</th>

                                    {trash && <th>Deleted</th>}

                                    <th>Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {items.map(recipient => (
                                    <tr key={recipient._id}>
                                        <td>
                                            <b>{recipient.name || '—'}</b>
                                        </td>

                                        <td>{recipient.email}</td>

                                        <td>
                                            <span
                                                className={`status ${trash
                                                        ? 'failed'
                                                        : recipient.subscribed
                                                            ? 'completed'
                                                            : 'failed'
                                                    }`}
                                            >
                                                {trash
                                                    ? 'Deleted'
                                                    : recipient.subscribed
                                                        ? 'Subscribed'
                                                        : 'Unsubscribed'}
                                            </span>
                                        </td>

                                        {trash && (
                                            <td>
                                                {recipient.deletedAt
                                                    ? new Date(
                                                        recipient.deletedAt
                                                    ).toLocaleDateString()
                                                    : '—'}
                                            </td>
                                        )}

                                        <td>
                                            <div className="row-actions">
                                                {trash ? (
                                                    <>
                                                        <button
                                                            className="icon-button green-text"
                                                            title="Restore"
                                                            onClick={() => restore(recipient._id)}
                                                        >
                                                            <RotateCcw size={17} />
                                                        </button>

                                                        <button
                                                            className="icon-button red-text"
                                                            title="Permanently delete"
                                                            onClick={() => permanent(recipient._id)}
                                                        >
                                                            <Trash2 size={17} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            className="icon-button"
                                                            title="Edit recipient name"
                                                            onClick={() => startEdit(recipient)}
                                                        >
                                                            <Pencil size={17} />
                                                        </button>

                                                        <button
                                                            className={`icon-button ${recipient.subscribed
                                                                    ? 'red-text'
                                                                    : 'green-text'
                                                                }`}
                                                            title={
                                                                recipient.subscribed
                                                                    ? 'Unsubscribe'
                                                                    : 'Resubscribe'
                                                            }
                                                            onClick={() =>
                                                                toggleSubscription(recipient)
                                                            }
                                                        >
                                                            {recipient.subscribed ? (
                                                                <UserMinus size={17} />
                                                            ) : (
                                                                <UserCheck size={17} />
                                                            )}
                                                        </button>

                                                        <button
                                                            className="icon-button red-text"
                                                            title="Move to trash"
                                                            onClick={() => remove(recipient._id)}
                                                        >
                                                            <Trash2 size={17} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="empty">
                        <Users size={28} />

                        <b>No recipients found</b>

                        <span>
                            {trash
                                ? 'Deleted contacts will appear here.'
                                : 'Add a contact or import a CSV to get started.'}
                        </span>
                    </div>
                )}
            </section>

            {/* Edit recipient dialog */}
            {editingId && (
                <div className="modal-overlay">
                    <div
                        className="modal-card"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="edit-recipient-title"
                    >
                        <div className="modal-header">
                            <div>
                                <span className="eyebrow">CONTACTS</span>
                                <h2 id="edit-recipient-title">
                                    Edit recipient
                                </h2>
                            </div>

                            <button
                                className="icon-button"
                                type="button"
                                title="Close"
                                onClick={cancelEdit}
                                disabled={saving}
                            >
                                <X size={19} />
                            </button>
                        </div>

                        <form onSubmit={saveEdit}>
                            <label>
                                Recipient name

                                <input
                                    autoFocus
                                    required
                                    type="text"
                                    maxLength={100}
                                    value={editingName}
                                    onChange={e => setEditingName(e.target.value)}
                                    placeholder="Enter recipient name"
                                />
                            </label>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="btn secondary"
                                    onClick={cancelEdit}
                                    disabled={saving}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="btn primary"
                                    disabled={saving}
                                >
                                    <Save size={16} />
                                    {saving ? 'Saving...' : 'Save changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
