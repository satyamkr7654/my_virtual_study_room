const Y = require('yjs');
const Room = require('../models/Room.model');
const { NotFoundError, ValidationError } = require('../utils/errors');
const logger = require('../utils/logger');

const SAVE_DELAY = 1000; // ms after the last change
const MAX_UPDATE_BYTES = 256 * 1024;
const MAX_STATE_BYTES = 1024 * 1024;

/**
 * Notes Service - Shared notes, one Yjs document per open room.
 * Yjs merges simultaneous edits, so nobody's typing is overwritten.
 */
class NotesService {
    constructor() {
        this.entries = new Map(); // roomId -> { doc, size, dirty, timer, saving, ready }
    }

    async load(roomId) {
        const room = await Room.findById(roomId).select('documentContent +notesState');
        if (!room) throw new NotFoundError('Room not found');

        const doc = new Y.Doc();
        if (room.notesState?.length) {
            Y.applyUpdate(doc, new Uint8Array(room.notesState));
        } else if (room.documentContent) {
            doc.getText('notes').insert(0, room.documentContent);
        }
        return { doc, seeded: !room.notesState?.length && !!room.documentContent };
    }

    async open(roomId) {
        let entry = this.entries.get(roomId);

        if (!entry) {
            entry = { dirty: false, saving: Promise.resolve() };
            this.entries.set(roomId, entry);
            entry.ready = this.load(roomId).then(({ doc, seeded }) => {
                entry.doc = doc;
                entry.size = Y.encodeStateAsUpdate(doc).length;
                doc.on('update', () => this.markDirty(roomId, entry));
                if (seeded) this.markDirty(roomId, entry);
            }).catch((error) => {
                this.entries.delete(roomId);
                throw error;
            });
        }

        await entry.ready;
        return entry;
    }

    markDirty(roomId, entry) {
        entry.dirty = true;
        clearTimeout(entry.timer);
        entry.timer = setTimeout(() => this.save(roomId, entry), SAVE_DELAY);
    }

    /**
     * Write pending changes. Saves of one room never overlap.
     */
    save(roomId, entry) {
        clearTimeout(entry.timer);
        entry.saving = entry.saving.then(async () => {
            if (!entry.dirty || entry.discarded) return;
            entry.dirty = false;
            try {
                const state = Buffer.from(Y.encodeStateAsUpdate(entry.doc));
                entry.size = state.length;
                await Room.updateOne({ _id: roomId }, {
                    notesState: state,
                    documentContent: entry.doc.getText('notes').toString(),
                });
            } catch (error) {
                logger.error('Saving notes failed:', error);
                if (!entry.discarded) this.markDirty(roomId, entry);
            }
        });
        return entry.saving;
    }

    /**
     * Full state of a room's notes
     */
    async getState(roomId) {
        const { doc } = await this.open(roomId);
        return Buffer.from(Y.encodeStateAsUpdate(doc));
    }

    /**
     * Merge an edit into a room's notes
     */
    async applyUpdate(roomId, update) {
        if (!Buffer.isBuffer(update) || update.length > MAX_UPDATE_BYTES) {
            throw new ValidationError('Invalid notes update');
        }

        // Reject corrupt data before it can touch the real document
        try {
            const check = new Y.Doc();
            Y.applyUpdate(check, update);
            check.destroy();
        } catch (error) {
            throw new ValidationError('Invalid notes update');
        }

        const entry = await this.open(roomId);
        if (entry.size + update.length > MAX_STATE_BYTES) {
            throw new ValidationError('The notes are full');
        }
        entry.size += update.length;
        Y.applyUpdate(entry.doc, update);
    }

    /**
     * Save and unload a room nobody is in any more
     * @param {Function} isEmpty - Checked again after saving
     */
    async release(roomId, isEmpty) {
        const entry = this.entries.get(roomId);
        if (!entry) return;

        await entry.ready.catch(() => {});
        await this.save(roomId, entry);
        if (!entry.dirty && isEmpty() && this.entries.get(roomId) === entry) {
            this.entries.delete(roomId);
        }
    }

    /**
     * Forget a deleted room
     */
    discard(roomId) {
        const entry = this.entries.get(roomId);
        if (!entry) return;
        entry.discarded = true;
        clearTimeout(entry.timer);
        this.entries.delete(roomId);
    }

    /**
     * Write everything before shutdown
     */
    async flush() {
        await Promise.all([...this.entries].map(([roomId, entry]) => this.save(roomId, entry)));
    }
}

module.exports = new NotesService();
