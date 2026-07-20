// client/src/components/Footer.jsx
import React, { useMemo, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import '../styles/Footer.css';

export default function Footer({ 
  structuredMenu, 
  activeDockFlyout, 
  setActiveDockFlyout, 
  isClickLocked, 
  setIsClickLocked, 
  leaveTimeoutRef, 
  renderIcon, 
  onLogout 
}) {
  const location = useLocation();
  const dockRef = useRef(null); // Ref added to capture the dock footprint boundary

  // Global Outside Click Event Interceptor
  useEffect(() => {
    const handleGlobalClickOutside = (event) => {
      if (dockRef.current && !dockRef.current.contains(event.target)) {
        setActiveDockFlyout(null);
        setIsClickLocked(false);
      }
    };
    document.addEventListener('mousedown', handleGlobalClickOutside);
    return () => document.removeEventListener('mousedown', handleGlobalClickOutside);
  }, [setActiveDockFlyout, setIsClickLocked]);

  const normalizePath = (routeStr) => {
    if (!routeStr) return "/dashboard";
    if (routeStr === '/' || routeStr === '/dashboard') return "/dashboard";
    
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

  const handleDockItemMouseEnter = (menuId, hasChildren) => {
    // Only process hover flyouts if user is on a desktop device
    if (window.innerWidth <= 1024) return;
    if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    if (!isClickLocked && hasChildren) setActiveDockFlyout(menuId);
  };

  const handleDockItemMouseLeave = () => {
    if (window.innerWidth <= 1024) return;
    if (!isClickLocked) {
      leaveTimeoutRef.current = setTimeout(() => setActiveDockFlyout(null), 250);
    }
  };

  const activeMenus = useMemo(() => {
    const rawItems = Array.isArray(structuredMenu) 
      ? structuredMenu 
      : (structuredMenu && Array.isArray(structuredMenu.data) ? structuredMenu.data : []);

    const itemMap = {};
    const rootNodes = [];

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
    <footer className="mac-os-dock-container" ref={dockRef}>
      <div className="mac-os-dock-shelf">
        {activeMenus.map(menu => {
          const activeSubMenus = menu.subMenus || [];
          const hasChildren = activeSubMenus.length > 0;
          const absoluteTarget = normalizePath(menu.route);
          
          const isSelected = location.pathname === absoluteTarget || 
            (hasChildren && activeSubMenus.some(s => location.pathname === normalizePath(s.route)));
            
          const isFlyoutOpen = activeDockFlyout === menu.id;

          return (
            <div 
              key={menu.id} 
              className={`dock-item-wrapper ${isSelected ? 'dock-item-active' : ''} ${isFlyoutOpen ? 'flyout-visible' : ''}`}
              onMouseEnter={() => handleDockItemMouseEnter(menu.id, hasChildren)}
              onMouseLeave={handleDockItemMouseLeave}
              onClick={() => {
                if (hasChildren) {
                  setIsClickLocked(prev => !prev || activeDockFlyout !== menu.id);
                  setActiveDockFlyout(activeDockFlyout === menu.id ? null : menu.id);
                }
              }}
            >
              <div className="dock-tooltip-bubble">{menu.menu_name}</div>

              {hasChildren && isFlyoutOpen && (
                <div 
                  className="dock-submenu-flyout-panel"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flyout-panel-header">{menu.menu_name}</div>
                  <ul className="flyout-submenu-list">
                    {activeSubMenus.map(sub => (
                      <li key={sub.id}>
                        <NavLink 
                          to={normalizePath(sub.route)}
                          className={({ isActive }) => `flyout-submenu-item ${isActive ? 'flyout-item-active' : ''}`}
                          onClick={() => {
                            setActiveDockFlyout(null);
                            setIsClickLocked(false);
                          }}
                        >
                          <div className="flyout-icon-box">{renderIcon(sub.menu_icon)}</div>
                          <span className="flyout-item-text">{sub.menu_name}</span>
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                  <div className="dock-flyout-arrow-down" />
                </div>
              )}

              {hasChildren ? (
                <div className="dock-icon-sphere">{renderIcon(menu.menu_icon)}</div>
              ) : (
                <NavLink to={absoluteTarget} className="dock-icon-sphere-link">
                  <div className="dock-icon-sphere">{renderIcon(menu.menu_icon)}</div>
                </NavLink>
              )}
              <span className="dock-active-indicator-dot" />
            </div>
          );
        })}
        
        <div className="dock-separator-line" />
        <div className="dock-item-wrapper logout-dock-trigger" onClick={onLogout}>
          <div className="dock-tooltip-bubble">Sign Out</div>
          <div className="dock-icon-sphere logout-sphere"><LogOut size={18} /></div>
        </div>
      </div>
    </footer>
  );
}