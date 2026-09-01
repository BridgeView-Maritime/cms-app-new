// server/utils/generateMysqlId.js
// Every collection migrated from the legacy MySQL database carries a
// UNIQUE (non-sparse) index on `_mysqlId` — a leftover of the migration
// that mirrored the old auto-increment primary key. New documents this
// app creates don't have a real MySQL id, but leaving the field unset
// still writes `_mysqlId: null`, and a unique index treats a second
// `null` as a duplicate of the first — the second-ever insert into any
// of these collections fails outright. Every INSERT into a migrated
// collection (Registration, ProductCart, ProductOrder, ...) must set
// this to something guaranteed-unique instead.
export const generateMysqlId = () => Date.now() * 1000 + Math.floor(Math.random() * 1000);
