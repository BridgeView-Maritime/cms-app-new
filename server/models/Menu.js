import mongoose from 'mongoose';

const menuSchema = new mongoose.Schema({
  id: { type: Number, unique: true }, // For matching old structure IDs
  parent_id: { type: Number, default: null },
  menu_name: { type: String, required: true },
  route: { type: String, required: true },
  menu_icon: { type: String, default: null },
  display_order: { type: Number, default: 0 },
  permission_key: { type: String, default: null },
  is_visible: { type: Boolean, default: true },
  status: { type: String, default: 'Active' }
}, { timestamps: true });

const Menu = mongoose.model('Menu', menuSchema);
export default Menu;