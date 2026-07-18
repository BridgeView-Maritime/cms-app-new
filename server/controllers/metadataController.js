import pool from '../config/database.js';
import { logAudit } from '../helpers/auditHelper.js';

// Strict validation matrix mapping table handles to exact column identifiers
// This completely resolves string slicing bugs (e.g. 'companies' -> 'company_name')
const METADATA_MAP = {
    'companies': 'company_name',
    'branches': 'branch_name',
    'departments': 'department_name',
    'designations': 'designation_name'
};

/**
 * @desc    Generic Creation Engine for Metadata Lookup Rows
 * @route   POST /api/metadata/:table
 * @access  Private (Super Admin & Admin Only)
 */
export const createMetadataRecord = async (req, res) => {
    const { table } = req.params;
    const { name, company_id } = req.body; // company_id used solely when target is 'branches'
    const creatorId = req.user.id;

    if (!METADATA_MAP[table]) {
        return res.status(400).json({ success: false, message: "Invalid system entity reference target." });
    }
    if (!name) {
        return res.status(400).json({ success: false, message: "Descriptor name metric parameter missing." });
    }

    try {
        let query = '';
        let params = [];

        if (table === 'branches') {
            if (!company_id) {
                return res.status(400).json({ success: false, message: "Branches require a valid company_id parent reference." });
            }
            query = `INSERT INTO branches (branch_name, company_id) VALUES (?, ?)`;
            params = [name, company_id];
        } else {
            const columnName = METADATA_MAP[table]; 
            query = `INSERT INTO ${table} (${columnName}) VALUES (?)`;
            params = [name];
        }

        const [result] = await pool.query(query, params);

        await logAudit(creatorId, 'Metadata Asset Provisioned', `Added record ID ${result.insertId} into ${table}`, req);
        return res.status(201).json({ success: true, message: "Save Successfully", insertId: result.insertId });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * @desc    Universal Generic Modification & State Toggle (Active/Inactive) Engine
 * @route   PUT /api/metadata/:table/:id
 * @access  Private (Super Admin & Admin Only)
 */
export const updateMetadataRecord = async (req, res) => {
    const { table, id } = req.params;
    const { name, company_id, status } = req.body;
    const updaterId = req.user.id;

    if (!METADATA_MAP[table]) {
        return res.status(400).json({ success: false, message: "Invalid system entity reference target." });
    }

    try {
        let query = `UPDATE ${table} SET `;
        let params = [];
        let updates = [];

        if (name) {
            const columnName = METADATA_MAP[table];
            updates.push(`${columnName} = ?`);
            params.push(name);
        }
        if (table === 'branches' && company_id) {
            updates.push(`company_id = ?`);
            params.push(company_id);
        }
        if (status) {
            updates.push(`status = ?`); 
            params.push(status);
        }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, message: "No operational delta parameters supplied." });
        }

        query += updates.join(', ') + ` WHERE id = ?`;
        params.push(id);

        await pool.query(query, params);
        await logAudit(updaterId, 'Metadata Asset Updated', `Altered record ID ${id} inside ${table}`, req);

        return res.json({ success: true, message: "Asset metadata matrix synchronized successfully." });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * @desc    Global list retriever for lookups
 * @route   GET /api/metadata/:table
 * @access  Private (Any logged-in profile reading configuration values)
 */
export const fetchAllMetadataRecords = async (req, res) => {
    const { table } = req.params;
    if (!METADATA_MAP[table]) {
        return res.status(400).json({ success: false, message: "Invalid system entity reference target." });
    }

    try {
        let query = `SELECT * FROM ${table}`;
        if (table === 'branches') {
            query = `SELECT b.*, c.company_name FROM branches b JOIN companies c ON b.company_id = c.id`;
        }
        const [records] = await pool.query(query);
        return res.json({ success: true, data: records });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};