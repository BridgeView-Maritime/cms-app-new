import pool from '../config/database.js';

// Recursive helper function to transform flat tables into nested children JSON arrays
const buildMenuTree = (flatList, parentId = null) => {
    return flatList
        .filter(item => item.parent_id === parentId)
        .map(item => {
            const children = buildMenuTree(flatList, item.id);
            const node = {
                id: item.id,
                title: item.menu_name,
                icon: item.menu_icon,
                path: item.route
            };
            if (children.length > 0) {
                node.children = children;
            }
            return node;
        });
};

// GET /api/menus/sidebar -> Resolves dynamic visible layout structures based on authorized permissions
export const getAuthorizedSidebar = async (req, res) => {
    try {
        const roleId = req.user.role_id; // Sourced straight out of decode authentication middleware token context

        // SQL queries menus that are either public (no permission key) OR specifically authorized to this user's role
        const [allowedMenus] = await pool.query(`
            SELECT DISTINCT 
                m.id, m.parent_id, m.menu_name, m.menu_icon, m.route, m.display_order
            FROM menus m
            LEFT JOIN permissions p ON m.permission_key = p.permission_key
            LEFT JOIN role_permissions rp ON p.id = rp.permission_id
            WHERE (m.permission_key IS NULL OR rp.role_id = ?)
              AND m.status = 'Active'
              AND m.is_visible = 1
            ORDER BY m.parent_id ASC, m.display_order ASC
        `, [roleId]);

        const hierarchicalTree = buildMenuTree(allowedMenus, null);
        return res.json({ success: true, sidebar: hierarchicalTree });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

// POST /api/menus -> Creates a menu management item
export const createMenuItem = async (req, res) => {
    const { parent_id, menu_name, menu_icon, route, display_order, permission_key, is_visible } = req.body;
    if (!menu_name) return res.status(400).json({ success: false, message: "Missing menu descriptor identifier." });

    try {
        const [result] = await pool.query(`
            INSERT INTO menus (parent_id, menu_name, menu_icon, route, display_order, permission_key, is_visible)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [parent_id || null, menu_name, menu_icon || null, route || null, display_order || 0, permission_key || null, is_visible ?? 1]);

        return res.status(201).json({ success: true, menuId: result.insertId });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

// GET /api/menus -> Fetches flat table matrix lists for administration layouts
export const getAllMenusFlat = async (req, res) => {
    try {
        const [menus] = await pool.query('SELECT * FROM menus ORDER BY parent_id ASC, display_order ASC');
        return res.json({ success: true, menus });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

// PUT /api/menus/:id -> Modifies an existing structural element
export const updateMenuItem = async (req, res) => {
    const { id } = req.params;
    const { menu_name, menu_icon, route, display_order, permission_key, is_visible, status } = req.body;
    try {
        await pool.query(`
            UPDATE menus 
            SET menu_name = ?, menu_icon = ?, route = ?, display_order = ?, permission_key = ?, is_visible = ?, status = ?
            WHERE id = ?
        `, [menu_name, menu_icon, route, display_order, permission_key, is_visible, status, id]);

        return res.json({ success: true, message: "Menu record normalized successfully." });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

// DELETE /api/menus/:id -> Removes an execution context item cleanly
export const deleteMenuItem = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM menus WHERE id = ?', [id]);
        return res.json({ success: true, message: "Menu item severed from system safely." });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};