export const USER_ROLES = {
  CITIZEN: "citizen",
  MUNICIPAL: "municipal_office",
  ADMIN: "main_admin",
};

export const ROLE_LABELS = {
  [USER_ROLES.CITIZEN]: "Citizen",
  [USER_ROLES.MUNICIPAL]: "Municipal Office",
  [USER_ROLES.ADMIN]: "Main Admin",
};

export const ROLE_HOME_ROUTES = {
  [USER_ROLES.CITIZEN]: "/citizen/dashboard",
  [USER_ROLES.MUNICIPAL]: "/municipal/dashboard",
  [USER_ROLES.ADMIN]: "/admin/dashboard",
};

export const isRole = (value) => Object.values(USER_ROLES).includes(value);
