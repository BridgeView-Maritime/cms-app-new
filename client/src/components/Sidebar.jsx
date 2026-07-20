// client/src/components/Sidebar.jsx
import React, { useMemo, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import '../styles/Sidebar.css';

export default function Sidebar({ 
  isSidebarCollapsed, 
  setIsSidebarCollapsed, 
  onLogout, 
  toggleNativeFullscreen, 
  userProfile, 
  structuredMenu, 
  expandedMenus, 
  toggleSubmenu, 
  renderIcon 
}) {
  const location = useLocation();
  
  // 1. Automatic Responsive Device Minimizer/Maximizer Listener
  useEffect(() => {
    const handleDeviceAdaptation = () => {
      if (window.innerWidth <= 1024) {
        setIsSidebarCollapsed(true); // Auto-minimize on small devices
      } else {
        setIsSidebarCollapsed(false); // Default open on desktop environments
      }
    };

    // Initialize layout state assessment on mount
    handleDeviceAdaptation();

    window.addEventListener('resize', handleDeviceAdaptation);
    return () => window.removeEventListener('resize', handleDeviceAdaptation);
  }, [setIsSidebarCollapsed]);

  // 2. Auto-minimize mobile overlay when user shifts/changes paths
  useEffect(() => {
    if (window.innerWidth <= 1024) {
      setIsSidebarCollapsed(true);
    }
  }, [location, setIsSidebarCollapsed]);
  
  // FIXED: Clean path management ensuring relative links stay native to their context roots
  const normalizePath = (routeStr) => {
    if (!routeStr) return "/dashboard";
    if (routeStr === '/' || routeStr === '/dashboard') return "/dashboard";
    
    // Explicitly bypass correction tracking if path is already fully unified 
    if (
      routeStr.startsWith('/app/workspace/') || 
      routeStr.startsWith('/dashboard/') ||
      routeStr === '/dashboard/broadcast' ||
      routeStr === '/dashboard/my-history'
    ) {
      return routeStr;
    }
    
    const cleanRoute = routeStr.startsWith('/') ? routeStr.slice(1) : routeStr;
    return `/dashboard/${cleanRoute}`;
  };

  // Memoized layout builder to prevent recursive references or layout thrashing
  const activeMenus = useMemo(() => {
    const rawItems = Array.isArray(structuredMenu) 
      ? structuredMenu 
      : (structuredMenu && Array.isArray(structuredMenu.data) ? structuredMenu.data : []);

    const itemMap = {};
    const rootNodes = [];

    // First pass: Isolate active elements using unified state evaluation rules
    rawItems.forEach(item => {
      if (!item) return;
      const isItemActive = item.is_active !== false && item.status !== 'Inactive';
      if (!isItemActive) return;

      const id = item._id || item.id;
      if (!id) return;

      itemMap[id] = {
        ...item,
        id: id,
        subMenus: []
      };
    });

    // Second pass: Bind structural hierarchies
    rawItems.forEach(item => {
      if (!item) return;
      const isItemActive = item.is_active !== false && item.status !== 'Inactive';
      if (!isItemActive) return;

      const id = item._id || item.id;
      const mappedItem = itemMap[id];

      if (!mappedItem) return;

      if (!item.parent_id) {
        rootNodes.push(mappedItem);
      } else {
        const parent = itemMap[item.parent_id];
        if (parent) {
          parent.subMenus.push(mappedItem);
        } else {
          rootNodes.push(mappedItem);
        }
      }
    });

    const sortingRule = (a, b) => (a.sort_order || a.display_order || 0) - (b.sort_order || b.display_order || 0);
    rootNodes.forEach(node => node.subMenus.sort(sortingRule));
    return rootNodes.sort(sortingRule);
  }, [structuredMenu]);

  return (
    <>
      {/* Dimmed Structural Click-Away Overlay Background for Mobile/Tablet Canvas views */}
      <div 
        className={`mac-sidebar-dimmer-mask ${!isSidebarCollapsed ? 'visible-mask' : ''}`}
        onClick={() => setIsSidebarCollapsed(true)}
      />

      <aside className={`mac-window-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="mac-window-controls">
          <span className="window-dot dot-close" onClick={onLogout} title="Sign Out"></span>
          {/* Minimize Option */}
          <span className="window-dot dot-minimize" onClick={() => setIsSidebarCollapsed(true)} title="Minimize Sidebar"></span>
          {/* Maximize Option */}
          <span className="window-dot dot-maximize" onClick={() => setIsSidebarCollapsed(false)} title="Maximize Sidebar"></span>
        </div>

        <div className="mac-profile-card">
          <div className="mac-profile-avatar">
            {(userProfile?.firstName?.[0] || '') + (userProfile?.lastName?.[0] || '')}
          </div>
          <div className="mac-profile-details">
            <h4>{userProfile?.firstName} {userProfile?.lastName}</h4>
            <span className="role-tag">{userProfile?.roleName}</span>
          </div>
        </div>

        <div className="sidebar-scrollable-tree">
          <span className="sidebar-group-title">Navigation Hierarchy</span>
          <ul className="mac-sidebar-menu">
            {activeMenus.map(menu => {
              const activeSubMenus = menu.subMenus || [];
              const hasChildren = activeSubMenus.length > 0;
              const isExpanded = !!expandedMenus[menu.id];

              return (
                <li key={menu.id} className="menu-node">
                  {hasChildren ? (
                    <div className="menu-row-item" onClick={() => toggleSubmenu(menu.id)}>
                      <div className="menu-row-left">
                        {renderIcon(menu.menu_icon)}
                        <span className="menu-title-text">{menu.menu_name}</span>
                      </div>
                      <div className="menu-row-chevron">
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </div>
                    </div>
                  ) : (
                    <NavLink 
                      to={normalizePath(menu.route)} 
                      end
                      className={({ isActive }) => `menu-row-item ${isActive ? 'row-active' : ''}`}
                    >
                      <div className="menu-row-left">
                        {renderIcon(menu.menu_icon)}
                        <span className="menu-title-text">{menu.menu_name}</span>
                      </div>
                    </NavLink>
                  )}

                  {hasChildren && isExpanded && (
                    <ul className="mac-sidebar-submenu">
                      {activeSubMenus.map(sub => (
                        <li key={sub.id}>
                          <NavLink 
                            to={normalizePath(sub.route)}
                            className={({ isActive }) => `submenu-row-item ${isActive ? 'sub-active' : ''}`}
                          >
                            <div className="submenu-row-left">
                              {renderIcon(sub.menu_icon)}
                              <span className="menu-title-text">{sub.menu_name}</span>
                            </div>
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
    </>
  );
}