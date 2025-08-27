import React, { useState } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Collapse,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  People,
  Inventory,
  ShoppingCart,
  AccountBalance,
  Receipt,
  BarChart,
  Settings,
  ChevronLeft,
  AccountCircle,
  ExpandLess,
  ExpandMore,
  Category,
  Security,
  Group,
  ShoppingBag,
  Inbox,
  MoneyOff,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const drawerWidth = 240;

interface LayoutProps {
  children: React.ReactNode;
}

interface MenuItem {
  title: string;
  icon: React.ReactNode;
  path?: string;
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  { title: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
  { title: 'Contatos', icon: <People />, path: '/pessoas' },
  { 
    title: 'Produtos', 
    icon: <Inventory />, 
    children: [
      { title: 'Produtos', icon: <Inventory />, path: '/products' },
      { title: 'Categorias', icon: <Category />, path: '/categories' },
    ]
  },
  { title: 'Vendas', icon: <ShoppingCart />, path: '/sales' },
  { 
    title: 'Compras', 
    icon: <ShoppingBag />, 
    children: [
      { title: 'Pedidos de Compra', icon: <ShoppingBag />, path: '/purchase-orders' },
      { title: 'Entrada de Estoque', icon: <Inbox />, path: '/stock-entries' },
      { title: 'Contas a Pagar', icon: <MoneyOff />, path: '/purchase-accounts-payable' },
    ]
  },
  { 
    title: 'Financeiro', 
    icon: <AccountBalance />, 
    children: [
      { title: 'Contas a Receber', icon: <Receipt />, path: '/accounts-receivable' },
      { title: 'Contas a Pagar (Geral)', icon: <AccountBalance />, path: '/accounts-payable' },
    ]
  },
  { title: 'Estoque', icon: <Inventory />, path: '/inventory' },
  { title: 'Relatórios', icon: <BarChart />, path: '/reports' },
  { 
    title: 'Configurações', 
    icon: <Settings />,
    children: [
      { title: 'Usuários', icon: <Group />, path: '/users' },
      { title: 'Roles e Permissões', icon: <Security />, path: '/roles' },
      { title: 'Configurações Gerais', icon: <Settings />, path: '/settings' },
    ]
  },
];

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [open, setOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [expandedMenu, setExpandedMenu] = useState<string[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  const handleMenuToggle = (menuTitle: string) => {
    if (expandedMenu.includes(menuTitle)) {
      setExpandedMenu(expandedMenu.filter(menu => menu !== menuTitle));
    } else {
      setExpandedMenu([...expandedMenu, menuTitle]);
    }
  };

  const handleMenuClick = (item: MenuItem) => {
    if (item.children) {
      handleMenuToggle(item.title);
    } else if (item.path) {
      // Fechar menu lateral automaticamente para Vendas
      if (item.path === '/sales') {
        setOpen(false);
      }
      navigate(item.path);
    }
  };

  const isMenuSelected = (item: MenuItem): boolean => {
    if (item.path && location.pathname === item.path) {
      return true;
    }
    if (item.children) {
      return item.children.some(child => isMenuSelected(child));
    }
    return false;
  };

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    handleClose();
  };

  const renderMenuItem = (item: MenuItem, level: number = 0): React.ReactNode => {
    const isExpanded = expandedMenu.includes(item.title);
    const indentation = level > 0 ? 4 + (level * 2) : 2.5;

    return (
      <React.Fragment key={item.title}>
        <ListItem disablePadding sx={{ display: 'block' }}>
          <ListItemButton
            selected={isMenuSelected(item)}
            onClick={() => handleMenuClick(item)}
            sx={{
              minHeight: 48,
              justifyContent: open ? 'initial' : 'center',
              px: indentation,
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: open ? 3 : 'auto',
                justifyContent: 'center',
              }}
            >
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={item.title}
              sx={{ opacity: open ? 1 : 0 }}
            />
            {item.children && open && (
              isExpanded ? <ExpandLess /> : <ExpandMore />
            )}
          </ListItemButton>
        </ListItem>
        
        {item.children && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children.map((child) => renderMenuItem(child, level + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: `calc(100% - ${open ? drawerWidth : 64}px)`,
          ml: `${open ? drawerWidth : 64}px`,
          transition: (theme) =>
            theme.transitions.create(['width', 'margin'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="toggle drawer"
            onClick={handleDrawerToggle}
            edge="start"
            sx={{ marginRight: '36px' }}
          >
            {open ? <ChevronLeft /> : <MenuIcon />}
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            ERP Sistema
          </Typography>
          <div>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              color="inherit"
            >
              <Avatar sx={{ width: 32, height: 32 }}>
                <AccountCircle />
              </Avatar>
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <MenuItem onClick={handleClose}>
                <Typography variant="body2" color="text.secondary">
                  {user?.name} ({user?.role})
                </Typography>
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>Sair</MenuItem>
            </Menu>
          </div>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: open ? drawerWidth : 64,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: open ? drawerWidth : 64,
            boxSizing: 'border-box',
            transition: (theme) =>
              theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
            overflowX: 'hidden',
          },
        }}
      >
        <Toolbar />
        <Divider />
        <List>
          {menuItems.map((item) => renderMenuItem(item))}
        </List>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          p: 3,
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
};