const ROLES = Object.freeze({
  CITIZEN: 'citizen',
  ADMIN: 'admin',
  OFFICER: 'officer'
});

const ROLE_VALUES = Object.freeze(Object.values(ROLES));

module.exports = {
  ROLES,
  ROLE_VALUES
};
