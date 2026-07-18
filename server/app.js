import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';

// CRITICAL: You MUST add the ".js" extension when importing your local routes
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import menuRoutes from './routes/menuRoutes.js';
import metadataRoutes from './routes/metadataRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import collectionsRoutes from './routes/collectionRoutes.js';


const app = express();

app.use(cors());
app.use(helmet());
app.use(compression());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.use("/api/auth", authRoutes);

// app.use("/api/users", userRoutes);
app.use("/api/user", userRoutes);
app.use("/api/employees", employeeRoutes); 
app.use("/api/menus", menuRoutes);
app.use("/api/metadata", metadataRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/collections', collectionsRoutes);


app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "API running"
    });
});

export default app; // Replaces module.exports = app;

