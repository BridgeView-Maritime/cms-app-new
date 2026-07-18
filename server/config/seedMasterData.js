import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Ensure your connection string or fallback database is correct
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/maritime_hr_db';

const ReferenceSchema = new mongoose.Schema({ 
  name: { type: String, required: true }, 
  code: { type: String, required: true, unique: true } 
});

const Branch = mongoose.model('Branch', ReferenceSchema, 'branches');
const Department = mongoose.model('Department', ReferenceSchema, 'departments');
const Designation = mongoose.model('Designation', ReferenceSchema, 'designations');

async function seedSystemDatabase() {
  try {
    console.log("Connecting to Database Pipeline...");
    await mongoose.connect(MONGODB_URI);
    console.log("🚀 Connected to MongoDB successfully.");

    // Clear legacy collections completely to rebuild references
    await Branch.deleteMany({});
    await Department.deleteMany({});
    await Designation.deleteMany({});
    console.log("🧹 Cleared existing legacy data tables.");

    // ==========================================
    // 1. SEED BRANCHES (Maritime Hubs)
    // ==========================================
    const branches = await Branch.insertMany([
      { name: 'Mumbai (Main Port Headquarters)', code: 'BR-BOM-01' },
      { name: 'Patna (Inland Waterways Hub)', code: 'BR-PAT-02' }
    ]);
    console.log(`⚓ Seeded ${branches.length} Maritime Operating Branches.`);

    // ==========================================
    // 2. SEED DEPARTMENTS
    // ==========================================
    const departments = await Department.insertMany([
      { name: 'Marine Operations & Cargo Logistics', code: 'DEPT-OPS' },
      { name: 'Crew Management & Manning Operations', code: 'DEPT-CREW' },
      { name: 'Maritime Technical, Fleet & Safety', code: 'DEPT-TECH' },
      { name: 'Documentation, Customs & Port Clearance', code: 'DEPT-DOCS' },
      { name: 'Maritime Accounts & Commercial Finance', code: 'DEPT-FIN' },
      { name: 'Information Technology & Vessel Support', code: 'DEPT-IT' },
      { name: 'Human Resources & Shore Personnel Management', code: 'DEPT-HR' }
    ]);
    console.log(`📂 Seeded ${departments.length} Core Corporate & Vessel Departments.`);

    // ==========================================
    // 3. SEED DESIGNATIONS
    // ==========================================
    const designations = await Designation.insertMany([
      // Marine Operations & Cargo Logistics
      { name: 'Operations Director / Port Captain', code: 'DSG-PORT-CAPT' },
      { name: 'Vessel Operations Coordinator', code: 'DSG-VESSEL-ORD' },
      { name: 'Logistics Execution Specialist', code: 'DSG-LOG-SPEC' },

      // Crew Management & Manning Operations
      { name: 'Crewing Manager (Manning Operations)', code: 'DSG-CREW-MGR' },
      { name: 'Rostering & Seaman Travel Executive', code: 'DSG-CREW-EXEC' },

      // Maritime Technical & Safety
      { name: 'Marine Technical Superintendent', code: 'DSG-TECH-SUPT' },
      { name: 'DPA (Designated Person Ashore) / QHSE Auditor', code: 'DSG-QHSE-MGR' },

      // Documentation, Customs & Port Clearance
      { name: 'Documentation & Bill of Lading Specialist', code: 'DSG-DOC-SPEC' },
      { name: 'Customs Liaison & Port Clearance Officer', code: 'DSG-PORT-OFFICER' },

      // Accounts & Commercial Finance
      { name: 'Commercial Voyage Accountant', code: 'DSG-ACC-VOYAGE' },
      { name: 'Finance Executive', code: 'DSG-FIN-EXEC' },

      // Information Technology & Vessel Support
      { name: 'IT Infrastructure & Vessel Communication Engineer', code: 'DSG-IT-VESSEL' },
      { name: 'Helpdesk Support Analyst', code: 'DSG-IT-HELP' },

      // Human Resources
      { name: 'HR Manager (Shore & Fleet)', code: 'DSG-HR-MGR' },
      { name: 'Recruitment & Training Coordinator', code: 'DSG-HR-TRAIN' }
    ]);
    console.log(`🎖️ Seeded ${designations.length} Maritime Technical & Shore Designations.`);
    console.log("\n✨ Database Synchronization Core Seeding Complete!");

  } catch (error) {
    console.error("❌ Critical error seeding database structures:", error);
  } finally {
    mongoose.connection.close();
    console.log("🔌 Database Connection Closed cleanly.");
  }
}

seedSystemDatabase();