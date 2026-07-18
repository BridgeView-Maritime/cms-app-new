// server/server.js
import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import collectionsRoutes from './routes/collectionRoutes.js';
import formSectionRoutes from './routes/formSectionRoutes.js';

// Fixed imports: Importing models from their actual respective files
import { FormMeta } from './models/DynamicMetaSchemas.js';
import { UserRole, AppMenu } from './models/AdminManagementModels.js'; 

// FIXED: Corrected default import from named import statement execution syntax
import UkmtoScraperService from './services/UkmtoScraperService.js';
import notificationRoutes from './routes/notificationRoutes.js';

dotenv.config();
const app = express();

// Create HTTP server wrapper around Express for Socket.IO integration
const server = http.createServer(app);

// FIXED: Added 'PATCH' explicitly to the methods array to resolve your CORS error
const allowedOrigin = process.env.APP_URL || 'http://localhost:5173' || 'https://elliptic-thinning-credit.ngrok-free.dev';
// app.use(cors({
//   origin: true,
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
// }));

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Socket.IO Server with proper CORS parameters
const io = new Server(server, {
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Configure Socket.IO connection orchestration channels
io.on('connection', (socket) => {
  console.log(`🔌 Client connected to WebSocket: ${socket.id}`);

  // Setup channel tracking rooms
  socket.on('join-room', (roomName) => {
    socket.join(roomName);
    console.log(`📡 Socket client ${socket.id} joined room: ${roomName}`);
  });

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected from WebSocket: ${socket.id}`);
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes); 
app.use('/api/employees', employeeRoutes); 
app.use('/api/admin', adminRoutes);
app.use('/api/collections', collectionsRoutes);
app.use('/api/form_sections', formSectionRoutes);
app.use('/api/notifications', notificationRoutes);

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cms_new_db';

async function seedHRMSDynamicSystem() {
  try {
    console.log('🔄 Checking dynamic application configurations...');

    // 1. Seed complete dynamic workspace inputs ONLY if the form meta schema does not exist yet
    const existingFormMeta = await FormMeta.findOne({ form_code: 'EMPLOYEE_MASTER_DIRECTORY' });
    
    if (!existingFormMeta) {
      console.log('🌱 Form schema configuration missing. Initializing default FormMeta...');
      await FormMeta.create({
        form_code: 'EMPLOYEE_MASTER_DIRECTORY',
        form_name: 'Employee Master Directory Entry Form',
        form_icon: 'Briefcase',
        is_active: true,
        fields: [
          { field_key: 'first_name', label: 'First Name', input_type: 'text', section: 'personal', validations: { required: true, min_length: 1, max_length: 255 }, allowed_roles: [], is_active: true },
          { field_key: 'middle_name', label: 'Middle Name', input_type: 'text', section: 'personal', validations: { required: false, min_length: 0, max_length: 255 }, allowed_roles: [], is_active: true },
          { field_key: 'last_name', label: 'Last Name', input_type: 'text', section: 'personal', validations: { required: true, min_length: 1, max_length: 255 }, allowed_roles: [], is_active: true },
          { field_key: 'date_of_birth', label: 'Date of Birth', input_type: 'date', section: 'personal', validations: { required: true }, allowed_roles: [], is_active: true },
          { field_key: 'gender', label: 'Gender', input_type: 'select', options: ['Male', 'Female', 'Other'], section: 'personal', validations: { required: false }, allowed_roles: [], is_active: true },
          { field_key: 'branch_name', label: 'Branch Hub Assignment', input_type: 'select', options: ['Mumbai HQ', 'Patna Port'], section: 'employment', validations: { required: true }, allowed_roles: [], is_active: true },
          { field_key: 'department_block', label: 'Department Block', input_type: 'select', options: ['Marine Operations', 'Core HR & Contracts', 'Financials & Bank'], section: 'employment', validations: { required: true }, allowed_roles: [], is_active: true }
        ]
      });
      console.log('✅ FormMeta default template initialized.');
    } else {
      console.log('⚠️ Employee Master Directory schema already exists. Skipping write to protect dynamic custom fields.');
    }

    // 2. Seed default App Menus (skip or update safely without breaking associations)
    const menuItems = [
      { menu_name: 'Dashboard Grid Overview', menu_icon: 'Layers', route: '/dashboard', sort_order: 1 },
      { menu_name: 'Dynamic Meta-Field Configurator', menu_icon: 'Settings', route: '/dashboard/meta-config', sort_order: 2 },
      { menu_name: 'Broadcast Center Form', menu_icon: 'Send', route: '/dashboard/broadcast', sort_order: 3 },
      { menu_name: 'My Advisory History', menu_icon: 'History', route: '/dashboard/my-history', sort_order: 4 }
    ];

    const seededMenuIds = [];
    for (const item of menuItems) {
      let menu = await AppMenu.findOne({ route: item.route });
      if (!menu) {
        menu = await AppMenu.create(item);
        console.log(`🌱 Seeded new menu: ${item.menu_name}`);
      } else {
        menu.menu_name = item.menu_name;
        menu.menu_icon = item.menu_icon;
        menu.sort_order = item.sort_order;
        await menu.save();
      }
      seededMenuIds.push(menu._id);
    }

    // 3. Seed Dynamic UserRole if not initialized
    const existingRole = await UserRole.findOne({ role_code: 'SUPER_ADMIN' });
    if (!existingRole) {
      console.log('🌱 Super Admin user role missing. Creating definition entry...');
      await UserRole.create({
        role_code: 'SUPER_ADMIN',
        role_name: 'Super Admin',
        allowed_menus: seededMenuIds
      });
      console.log('✅ Super Admin role established.');
    } else {
      existingRole.allowed_menus = seededMenuIds;
      await existingRole.save();
    }

    console.log('🏁 Dynamic Matrix Seeding run check complete.');
  } catch (err) {
    console.error('❌ Data seed runtime exception error occurred:', err);
  }
}

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('🔌 Successfully integrated with MongoDB Database.');
    await seedHRMSDynamicSystem();
    
    // Initialize UKMTO Background Scraper Service tied directly to our Socket instance
    // const ukmtoScraper = new UkmtoScraperService(io);
    
    // // Execute a sync cycle immediately on boot
    // ukmtoScraper.scrapeAndIngest();

    const scraper = new UkmtoScraperService(io);
    scraper.scrapeAndIngest();
    

    // Schedule automated RSS checks to run every 20 minutes
    setInterval(() => {
      console.log('🔄 Cron interval trigger: Initiating UKMTO security warning sync...');
      scraper.scrapeAndIngest();
    }, 20 * 60 * 1000);

    // CRITICAL CHANGE: Listen via the 'server' instance wrapper (not app.listen) to mount WebSockets correctly
    server.listen(PORT, () => {
      console.log(`🚀 Server fully synchronized and running on Port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ CRITICAL database failure:', err.message);
    process.exit(1);
  });