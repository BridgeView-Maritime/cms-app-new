// client/src/pages/DashboardShell.jsx
import React, { useState, useMemo } from 'react';
import DynamicFormEngine from '../components/DynamicFormEngine';

export default function DashboardShell({ userSession, onLogout }) {
  // Use a default routing fallback form key
  const [currentViewForm, setCurrentViewForm] = useState('emp_core_profile');
  
  // 1. DYNAMICALLY BUILD COMPATIBLE TREE HIERARCHY FROM FLAT API DATA
  const structuredHierarchy = useMemo(() => {
    const rawMenus = userSession?.menus || [];
    const itemMap = {};
    const processedTree = [];

    // Step A: Index and normalize properties
    rawMenus.forEach(item => {
      const id = item._id || item.id;
      if (!id) return;
      
      itemMap[id] = {
        ...item,
        id: id,
        menu_title: item.menu_name, // Map flat name to layout title expectation
        sub_menus: []
      };
    });

    // Step B: Form hierarchical relations
    rawMenus.forEach(item => {
      const id = item._id || item.id;
      const mappedNode = itemMap[id];
      if (!mappedNode) return;

      if (item.parent_id && itemMap[item.parent_id]) {
        // Map sub properties for the internal loop
        mappedNode.sub_title = mappedNode.menu_name;
        
        // Derive unique workspace codes from routes if explicit codes are missing
        // e.g. /app/workspace/rank-type-create -> rank-type-create
        mappedNode.form_code = mappedNode.route 
          ? mappedNode.route.split('/').pop().replace(/-/g, '_') 
          : 'unknown_form';

        itemMap[item.parent_id].sub_menus.push(mappedNode);
      } else if (!item.parent_id) {
        processedTree.push(mappedNode);
      }
    });

    // Step C: Fallback sorting logic
    const sortByOrder = (a, b) => (a.display_order || 0) - (b.display_order || 0);
    processedTree.forEach(parent => parent.sub_menus.sort(sortByOrder));
    return processedTree.sort(sortByOrder);
  }, [userSession]);

  return (
    <div className="min-h-screen flex bg-slate-100 font-sans">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl">
        <div className="p-4 bg-slate-950 font-bold tracking-wider text-blue-400 border-b border-slate-800">
          BRIDGEVIEW HRMS Core
        </div>
        <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
          {structuredHierarchy.map((menu, mIdx) => {
            const hasSubmenu = menu.sub_menus && menu.sub_menus.length > 0;
            
            return (
              <div key={mIdx} className="space-y-1">
                <span className="text-xs font-semibold uppercase text-slate-500 tracking-widest block px-2 mb-2">
                  {menu.menu_title}
                </span>

                {/* Render root parent link if it has no child sub-elements */}
                {!hasSubmenu && (
                  <button
                    onClick={() => {
                      const rootCode = menu.route.split('/').pop().replace(/-/g, '_');
                      setCurrentViewForm(rootCode || 'dashboard_summary');
                    }}
                    className={`w-full text-left px-3 py-2 rounded text-sm font-medium transition-colors ${
                      currentViewForm === menu.route.split('/').pop().replace(/-/g, '_') 
                        ? 'bg-blue-600 text-white' 
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    View Overview Panel
                  </button>
                )}

                {/* Process structural nested menus */}
                {hasSubmenu && menu.sub_menus.map((sub, sIdx) => (
                  <button
                    key={sIdx}
                    onClick={() => sub.form_code && setCurrentViewForm(sub.form_code)}
                    className={`w-full text-left px-3 py-2 rounded text-sm font-medium transition-colors ${
                      currentViewForm === sub.form_code 
                        ? 'bg-blue-600 text-white' 
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {sub.sub_title}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>
        
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Active: <b>{userSession.user?.first_name || userSession.username}</b></span>
          <button onClick={onLogout} className="text-red-400 hover:underline">Exit Module</button>
        </div>
      </aside>

      {/* CORE WORKSPACE PANEL VIEWPORT FRAME */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-6 flex justify-between items-center bg-white p-4 rounded shadow-sm">
          <h1 className="text-lg font-bold text-slate-700">Administrative Dashboard Interface Matrix</h1>
          <span className="text-xs text-slate-400">System Time Context Deployment Grid</span>
        </header>
        
        {/* Render current configuration frame */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <DynamicFormEngine formCode={currentViewForm} />
        </div>
      </main>
    </div>
  );
}