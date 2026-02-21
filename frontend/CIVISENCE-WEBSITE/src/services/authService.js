import { USER_ROLES } from "./roleConfig";

const NETWORK_DELAY_MS = 550;

const citizenAccounts = new Map([
  [
    "citizen@civisense.ai",
    {
      password: "user123",
      name: "Aarav Kumar",
      role: USER_ROLES.CITIZEN,
      phone: "+91 99887 55443",
      ward: "Ward 11",
    },
  ],
]);

const staticAccounts = {
  [USER_ROLES.ADMIN]: {
    email: "admin@civisense.ai",
    password: "admin123",
    name: "Nisha Verma",
    role: USER_ROLES.ADMIN,
    office: "Head Office",
  },
  [USER_ROLES.MUNICIPAL]: {
    email: "municipal@civisense.ai",
    password: "civic123",
    name: "Rajesh Iyer",
    role: USER_ROLES.MUNICIPAL,
    office: "Central Municipal Cell",
    area: "Zone A",
  },
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const encodeToken = (value) => {
  if (typeof window !== "undefined" && window.btoa) {
    return window.btoa(value);
  }
  return value;
};

const generateToken = (email, role) => {
  const payload = `${email}:${role}:${Date.now()}`;
  return `cs_${encodeToken(payload)}`;
};

export const authService = {
  async login({ email, password, role }) {
    await wait(NETWORK_DELAY_MS);

    if (role === USER_ROLES.CITIZEN) {
      const record = citizenAccounts.get(email.toLowerCase());
      if (!record || record.password !== password) {
        throw new Error("Invalid credentials for selected role.");
      }

      const user = {
        email,
        name: record.name,
        role: record.role,
        phone: record.phone,
        ward: record.ward,
      };

      return {
        token: generateToken(email, role),
        user,
      };
    }

    const account = staticAccounts[role];
    if (!account || account.email !== email || account.password !== password) {
      throw new Error("Invalid credentials for selected role.");
    }

    const user = { ...account };
    delete user.password;
    return {
      token: generateToken(email, role),
      user,
    };
  },

  async signupCitizen({ name, email, password, phone, ward }) {
    await wait(NETWORK_DELAY_MS + 120);

    const normalizedEmail = email.toLowerCase();
    if (citizenAccounts.has(normalizedEmail)) {
      throw new Error("Account already exists. Please log in.");
    }

    citizenAccounts.set(normalizedEmail, {
      password,
      name,
      role: USER_ROLES.CITIZEN,
      phone,
      ward,
    });

    return {
      token: generateToken(normalizedEmail, USER_ROLES.CITIZEN),
      user: {
        email: normalizedEmail,
        name,
        role: USER_ROLES.CITIZEN,
        phone,
        ward,
      },
    };
  },
};
