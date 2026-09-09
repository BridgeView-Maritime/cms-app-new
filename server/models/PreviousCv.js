import mongoose from 'mongoose';

// Maps the legacy MySQL-migrated `collection_previous_cv` collection — the
// old site's uploaded-CV history (addresume.php read this to render
// "Your Latest Uploaded CV" / "Your Previous CV").
//
// `cv` holds the stored filename only; the files themselves lived on the
// old PHP server's /upload folder, so a record here does not guarantee the
// file is available. Linked to a candidate by `emailid` (case-insensitive),
// same as collection_addresume.
const PreviousCvSchema = new mongoose.Schema(
  {
    _mysqlId: Number,
    id: Number,
    cv: { type: String, default: '' },
    emailid: { type: String, default: '', index: true },
    resumeid: Number,
    indosno: { type: String, default: '' },
    date: mongoose.Schema.Types.Mixed,
  },
  { strict: false, collection: 'collection_previous_cv' }
);

export const PreviousCv = mongoose.models.PreviousCv || mongoose.model('PreviousCv', PreviousCvSchema);
