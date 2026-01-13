
// Default roles and permissions system
export interface Permission {
  resource: string;
  actions: ('view' | 'edit' | 'add' | 'delete')[];
}

export interface Role {
  id: number;
  name: string;
  description: string;
  permissions: {
    [resource: string]: {
      view: boolean;
      edit: boolean;
      add: boolean;
      delete?: boolean;
    };
  };
}

// Default permissions structure
export const defaultPermissions = {
  assets: { view: true, edit: false, add: false, delete: false },
  users: { view: false, edit: false, add: false, delete: false },
  licenses: { view: true, edit: false, add: false, delete: false },
  components: { view: true, edit: false, add: false, delete: false },
  accessories: { view: true, edit: false, add: false, delete: false },
  consumables: { view: true, edit: false, add: false, delete: false },
  reports: { view: true, edit: false, add: false, delete: false },
  admin: { view: false, edit: false, add: false, delete: false },
  vmMonitoring: { view: false, edit: false, add: false, delete: false },
  networkDiscovery: { view: false, edit: false, add: false, delete: false },
  bitlockerKeys: { view: false, edit: false, add: false, delete: false }
};

// In-memory roles storage with user count tracking
let roles: Role[] = [
  {
    id: 1,
    name: "Administrator",
    description: "Full system access with all permissions",
    permissions: {
      assets: { view: true, edit: true, add: true, delete: true },
      users: { view: true, edit: true, add: true, delete: true },
      licenses: { view: true, edit: true, add: true, delete: true },
      components: { view: true, edit: true, add: true, delete: true },
      accessories: { view: true, edit: true, add: true, delete: true },
      consumables: { view: true, edit: true, add: true, delete: true },
      reports: { view: true, edit: true, add: true, delete: true },
      admin: { view: true, edit: true, add: true, delete: true },
      vmMonitoring: { view: true, edit: true, add: true, delete: true },
      networkDiscovery: { view: true, edit: true, add: true, delete: true },
      bitlockerKeys: { view: true, edit: true, add: true, delete: true }
    }
  },
  {
    id: 2,
    name: "Asset Manager",
    description: "Can manage all assets and related items",
    permissions: {
      assets: { view: true, edit: true, add: true, delete: false },
      users: { view: true, edit: false, add: false, delete: false },
      licenses: { view: true, edit: true, add: true, delete: false },
      components: { view: true, edit: true, add: true, delete: false },
      accessories: { view: true, edit: true, add: true, delete: false },
      consumables: { view: true, edit: true, add: true, delete: false },
      reports: { view: true, edit: true, add: false, delete: false },
      admin: { view: false, edit: false, add: false, delete: false },
      vmMonitoring: { view: true, edit: true, add: false, delete: false },
      networkDiscovery: { view: true, edit: false, add: false, delete: false },
      bitlockerKeys: { view: false, edit: false, add: false, delete: false }
    }
  },
  {
    id: 3,
    name: "User Manager",
    description: "Can manage users and basic asset operations",
    permissions: {
      assets: { view: true, edit: false, add: false, delete: false },
      users: { view: true, edit: true, add: true, delete: false },
      licenses: { view: true, edit: false, add: false, delete: false },
      components: { view: true, edit: false, add: false, delete: false },
      accessories: { view: true, edit: false, add: false, delete: false },
      consumables: { view: true, edit: false, add: false, delete: false },
      reports: { view: true, edit: false, add: false, delete: false },
      admin: { view: false, edit: false, add: false, delete: false },
      vmMonitoring: { view: false, edit: false, add: false, delete: false },
      networkDiscovery: { view: false, edit: false, add: false, delete: false },
      bitlockerKeys: { view: false, edit: false, add: false, delete: false }
    }
  },
  {
    id: 4,
    name: "Read Only",
    description: "View-only access to most resources",
    permissions: {
      assets: { view: true, edit: false, add: false, delete: false },
      users: { view: true, edit: false, add: false, delete: false },
      licenses: { view: true, edit: false, add: false, delete: false },
      components: { view: true, edit: false, add: false, delete: false },
      accessories: { view: true, edit: false, add: false, delete: false },
      consumables: { view: true, edit: false, add: false, delete: false },
      reports: { view: true, edit: false, add: false, delete: false },
      admin: { view: false, edit: false, add: false, delete: false },
      vmMonitoring: { view: false, edit: false, add: false, delete: false },
      networkDiscovery: { view: false, edit: false, add: false, delete: false },
      bitlockerKeys: { view: false, edit: false, add: false, delete: false }
    }
  }
];

let nextRoleId = 5;

export function getRoles(): Role[] {
  // Ensure permissions is always an object, not an array
  return roles.map(role => ({
    ...role,
    permissions: typeof role.permissions === 'object' && !Array.isArray(role.permissions) 
      ? role.permissions 
      : defaultPermissions
  }));
}

export function getRoleById(id: number): Role | undefined {
  const role = roles.find(role => role.id === id);
  if (!role) return undefined;
  
  // Ensure permissions is always an object, not an array
  return {
    ...role,
    permissions: typeof role.permissions === 'object' && !Array.isArray(role.permissions)
      ? role.permissions
      : defaultPermissions
  };
}

export function createRole(roleData: { name: string; description: string; permissions: any }): Role {
  const newRole: Role = {
    id: nextRoleId++,
    name: roleData.name,
    description: roleData.description,
    permissions: { ...defaultPermissions, ...roleData.permissions }
  };
  
  roles.push(newRole);
  return newRole;
}

export function updateRole(id: number, updates: Partial<Role>): Role | undefined {
  const roleIndex = roles.findIndex(role => role.id === id);
  if (roleIndex === -1) return undefined;
  
  roles[roleIndex] = { ...roles[roleIndex], ...updates };
  return roles[roleIndex];
}

export function deleteRole(id: number): boolean {
  const initialLength = roles.length;
  roles = roles.filter(role => role.id !== id);
  return roles.length < initialLength;
}

export function getPermissionsForRole(roleId: number | null): any {
  if (!roleId) {
    return defaultPermissions;
  }
  
  const role = getRoleById(roleId);
  return role ? role.permissions : defaultPermissions;
}

// Function to update user counts for roles
export async function updateRoleUserCounts(): Promise<void> {
  try {
    const { storage } = await import("./storage");
    const users = await storage.getUsers();
    
    // Reset all role user counts
    roles.forEach(role => {
      if (!role.userCount) role.userCount = 0;
      else role.userCount = 0;
    });
    
    // Count users for each role
    users.forEach(user => {
      if (user.isAdmin) {
        // Admin users belong to Administrator role (id: 1)
        const adminRole = roles.find(r => r.id === 1);
        if (adminRole) {
          adminRole.userCount = (adminRole.userCount || 0) + 1;
        }
      } else if (user.roleId) {
        const role = roles.find(r => r.id === user.roleId);
        if (role) {
          role.userCount = (role.userCount || 0) + 1;
        }
      }
    });
    
    console.log('Updated role user counts:', roles.map(r => ({ name: r.name, userCount: r.userCount || 0 })));
  } catch (error) {
    console.error('Error updating role user counts:', error);
  }
}

// Function to get roles with current user counts
export async function getRolesWithUserCounts(): Promise<Role[]> {
  await updateRoleUserCounts();
  return roles;
}

export { roles as defaultRoles };
