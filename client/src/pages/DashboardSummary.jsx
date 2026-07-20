import React from 'react';
import { LayoutDashboard, Users, UserCheck, ShieldCheck, Activity } from 'lucide-react';
import '../styles/DashboardSummary.css';

export default function DashboardSummary() {
  // Mock statistical data matching system overview specifications
  const stats = [
    { id: 1, title: 'Total Handled Crew', count: '142', change: '+12 this month', icon: <Users size={22} />, color: '#007aff' },
    { id: 2, title: 'Active Operators', count: '18', change: 'All nodes green', icon: <UserCheck size={22} />, color: '#34c759' },
    { id: 3, title: 'Security Clearances', count: '5', change: 'Role profiles locked', icon: <ShieldCheck size={22} />, color: '#ff9500' },
  ];

  return (
    <div className="summary-canvas">
      <div className="summary-welcome-banner">
        <h1>Welcome back to Bridgeview Portal</h1>
        <p>Operational workspace telemetry is fully normalized. System health check looks optimal.</p>
      </div>

      <div className="stats-card-grid">
        {stats.map(item => (
          <div key={item.id} className="stat-card">
            <div className="stat-card-left">
              <span className="stat-title">{item.title}</span>
              <span className="stat-count">{item.count}</span>
              <span className="stat-change">{item.change}</span>
            </div>
            <div className="stat-icon-wrapper" style={{ backgroundColor: `${item.color}15`, color: item.color }}>
              {item.icon}
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-activity-log-widget">
        <div className="widget-header">
          <h3><Activity size={16} /> Operational System Telemetry</h3>
          <span className="live-pulse-dot" />
        </div>
        <div className="activity-timeline">
          <div className="timeline-node">
            <span className="node-timestamp">14:32:10</span>
            <span className="node-message">Super Admin user provisioned a new Operator Profile (@vessel_controller_01).</span>
          </div>
          <div className="timeline-node">
            <span className="node-timestamp">12:15:44</span>
            <span className="node-message">Metadata configuration parameters updated for schema object: <code>[Vessel_Type_Registry]</code>.</span>
          </div>
          <div className="timeline-node">
            <span className="node-timestamp">09:00:00</span>
            <span className="node-message">Daily role clearance audits executed successfully across cluster configurations.</span>
          </div>
        </div>
      </div>
    </div>
  );
}