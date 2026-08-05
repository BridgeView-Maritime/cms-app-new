import mongoose from 'mongoose';

const userMenuChatbotSchema = new mongoose.Schema(
  {
    user_id: { type: String, default: null },
    role: { type: String, default: 'USER' },
    route: { type: String, required: true },
    from_code: { type: String, required: true },
    description: { type: String, default: '' },
    status: { type: String, default: 'Active' }
  },
  { timestamps: true }
);

export const UserMenuChatbot =
  mongoose.models.collection_users_menu_chatbot ||
  mongoose.model('collection_users_menu_chatbot', userMenuChatbotSchema, 'collection_users_menu_chatbot');