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
  Badge,
  TextField,
  InputAdornment,
  Breadcrumbs,
  Link,
  alpha,
  Tooltip,
  Chip
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
  Notifications as NotificationsIcon,
  Search as SearchIcon,
  Business as BusinessIcon,
  PersonOutline,
  ExitToApp,
  Home as HomeIcon,
  NavigateNext
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { useTheme } from '@/contexts/ThemeContext';

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
  const [searchValue, setSearchValue] = useState('');
  const [notificationsCount] = useState(3); // Simulando notificações
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { darkMode } = useTheme();

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

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(event.target.value);
    // Implementar lógica de busca global aqui
  };

  const handleProfile = () => {
    navigate('/profile');
    handleClose();
  };

  const getBreadcrumbs = () => {
    const pathnames = location.pathname.split('/').filter((x) => x);
    const breadcrumbNameMap: Record<string, string> = {
      'dashboard': 'Dashboard',
      'products': 'Produtos',
      'categories': 'Categorias',
      'sales': 'Vendas',
      'users': 'Usuários',
      'roles': 'Roles e Permissões',
      'settings': 'Configurações',
      'pessoas': 'Contatos',
      'inventory': 'Estoque',
      'reports': 'Relatórios',
      'purchase-orders': 'Pedidos de Compra',
      'accounts-receivable': 'Contas a Receber',
      'accounts-payable': 'Contas a Pagar'
    };

    return [
      <Link 
        key="home"
        color="inherit" 
        href="#" 
        onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }}
        sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
      >
        <HomeIcon sx={{ mr: 0.5, fontSize: 20 }} />
        Dashboard
      </Link>,
      ...pathnames.map((value, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;

        return isLast ? (
          <Typography key={routeTo} color="text.primary" sx={{ display: 'flex', alignItems: 'center' }}>
            {breadcrumbNameMap[value] || value}
          </Typography>
        ) : (
          <Link
            key={routeTo}
            color="inherit"
            href="#"
            onClick={(e) => { e.preventDefault(); navigate(routeTo); }}
            sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
          >
            {breadcrumbNameMap[value] || value}
          </Link>
        );
      })
    ];
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
          background: darkMode 
            ? 'linear-gradient(135deg, #1e1e1e 0%, #2c2c2c 50%, #1a1a1a 100%)'
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #5a67d8 100%)',
          boxShadow: darkMode 
            ? '0 4px 20px rgba(0, 0, 0, 0.3)'
            : '0 4px 20px rgba(102, 126, 234, 0.3)',
          backdropFilter: 'blur(10px)',
          transition: (theme) =>
            theme.transitions.create(['width', 'margin'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
        }}
      >
        <Toolbar sx={{ minHeight: '72px !important', py: 1 }}>
          <IconButton
            color="inherit"
            aria-label="toggle drawer"
            onClick={handleDrawerToggle}
            edge="start"
            sx={{ 
              marginRight: 2,
              '&:hover': {
                backgroundColor: alpha('#ffffff', 0.1),
                transform: 'scale(1.05)',
              },
              transition: 'all 0.2s ease'
            }}
          >
            {open ? <ChevronLeft /> : <MenuIcon />}
          </IconButton>

          {/* Logo e Nome da Empresa */}
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 3 }}>
            <Avatar 
              sx={{ 
                width: 40, 
                height: 40, 
                backgroundColor: alpha('#ffffff', 0.2),
                border: `2px solid ${alpha('#ffffff', 0.3)}`,
                mr: 1.5
              }}
            >
              <BusinessIcon sx={{ color: 'white' }} />
            </Avatar>
            <Box>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  lineHeight: 1.2,
                  textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                }}
              >
                ERP Sistema
              </Typography>
              <Typography 
                variant="caption" 
                sx={{ 
                  opacity: 0.8,
                  fontSize: '0.7rem',
                  lineHeight: 1
                }}
              >
                Gestão Empresarial
              </Typography>
            </Box>
          </Box>

          {/* Busca Global */}
          <TextField
            size="small"
            placeholder="Buscar no sistema..."
            value={searchValue}
            onChange={handleSearch}
            sx={{
              width: 300,
              mr: 2,
              '& .MuiOutlinedInput-root': {
                backgroundColor: alpha('#ffffff', 0.15),
                borderRadius: 2,
                '& fieldset': {
                  borderColor: alpha('#ffffff', 0.3),
                },
                '&:hover fieldset': {
                  borderColor: alpha('#ffffff', 0.5),
                },
                '&.Mui-focused fieldset': {
                  borderColor: alpha('#ffffff', 0.8),
                },
                '& input': {
                  color: 'white',
                  '&::placeholder': {
                    color: alpha('#ffffff', 0.7),
                    opacity: 1,
                  },
                },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: alpha('#ffffff', 0.7) }} />
                </InputAdornment>
              ),
            }}
          />

          <Box sx={{ flexGrow: 1 }} />

          {/* Ações do Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Notificações */}
            <Tooltip title="Notificações">
              <IconButton
                color="inherit"
                sx={{
                  '&:hover': {
                    backgroundColor: alpha('#ffffff', 0.1),
                    transform: 'scale(1.05)',
                  },
                  transition: 'all 0.2s ease'
                }}
              >
                <Badge badgeContent={notificationsCount} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Menu do Usuário */}
            <Tooltip title="Menu do usuário">
              <IconButton
                size="large"
                aria-label="account of current user"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleMenu}
                sx={{
                  ml: 1,
                  '&:hover': {
                    backgroundColor: alpha('#ffffff', 0.1),
                    transform: 'scale(1.05)',
                  },
                  transition: 'all 0.2s ease'
                }}
              >
                <Avatar 
                  sx={{ 
                    width: 36, 
                    height: 36,
                    backgroundColor: alpha('#ffffff', 0.2),
                    border: `2px solid ${alpha('#ffffff', 0.3)}`,
                    fontSize: '1.2rem'
                  }}
                >
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </Avatar>
              </IconButton>
            </Tooltip>

            {/* Menu Dropdown */}
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
              sx={{
                '& .MuiPaper-root': {
                  backgroundColor: darkMode ? '#2c2c2c' : '#ffffff',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                  backdropFilter: 'blur(10px)',
                  border: `1px solid ${alpha(darkMode ? '#ffffff' : '#000000', 0.1)}`,
                  borderRadius: 2,
                  mt: 1.5,
                  minWidth: 200
                }
              }}
            >
              <Box sx={{ p: 2, borderBottom: `1px solid ${alpha(darkMode ? '#ffffff' : '#000000', 0.1)}` }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ width: 40, height: 40, backgroundColor: 'primary.main' }}>
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {user?.name || 'Usuário'}
                    </Typography>
                    <Chip 
                      label={user?.role || 'Usuário'} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                      sx={{ fontSize: '0.7rem', height: 20 }}
                    />
                  </Box>
                </Box>
              </Box>

              <MenuItem onClick={handleProfile} sx={{ py: 1.5, px: 2 }}>
                <ListItemIcon>
                  <PersonOutline fontSize="small" />
                </ListItemIcon>
                <Typography variant="body2">Meu Perfil</Typography>
              </MenuItem>

              <Divider sx={{ my: 0.5 }} />

              <MenuItem onClick={handleLogout} sx={{ py: 1.5, px: 2, color: 'error.main' }}>
                <ListItemIcon>
                  <ExitToApp fontSize="small" color="error" />
                </ListItemIcon>
                <Typography variant="body2">Sair do Sistema</Typography>
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>

        {/* Breadcrumb */}
        {location.pathname !== '/dashboard' && (
          <Box
            sx={{
              px: 3,
              py: 1,
              borderTop: `1px solid ${alpha('#ffffff', 0.2)}`,
              backgroundColor: alpha('#000000', 0.1),
            }}
          >
            <Breadcrumbs
              separator={<NavigateNext fontSize="small" />}
              sx={{
                '& .MuiBreadcrumbs-separator': {
                  color: alpha('#ffffff', 0.7),
                },
                '& .MuiTypography-root': {
                  color: alpha('#ffffff', 0.9),
                  fontSize: '0.875rem',
                },
                '& .MuiLink-root': {
                  color: alpha('#ffffff', 0.8),
                  '&:hover': {
                    color: '#ffffff',
                  },
                },
              }}
            >
              {getBreadcrumbs()}
            </Breadcrumbs>
          </Box>
        )}
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
        <Toolbar sx={{ minHeight: location.pathname !== '/dashboard' ? '120px !important' : '72px !important' }} />
        {children}
      </Box>
    </Box>
  );
};