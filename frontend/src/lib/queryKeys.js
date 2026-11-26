export const adminKeys = {
  all: ['admin'],
  overview: () => [...adminKeys.all, 'overview'],
  cities: () => [...adminKeys.all, 'cities'],
  lines: () => [...adminKeys.all, 'lines'],
  stops: () => [...adminKeys.all, 'stops'],
  routes: () => [...adminKeys.all, 'routes'],
  operators: () => [...adminKeys.all, 'operators'],
  operatorUsers: (operatorId) => [...adminKeys.operators(), operatorId, 'users'],
  qrCodes: () => [...adminKeys.all, 'qr-codes'],
  qrDetail: (id) => [...adminKeys.qrCodes(), id],
  qrStats: (id) => [...adminKeys.qrCodes(), id, 'stats'],
  communityAll: () => [...adminKeys.all, 'community'],
  communityPosts: (filters = {}) => [...adminKeys.communityAll(), 'posts', filters],
};

export const operatorKeys = {
  all: ['operator'],
  subscription: () => [...operatorKeys.all, 'subscription'],
  overview: () => [...operatorKeys.all, 'overview'],
  lines: () => [...operatorKeys.all, 'lines'],
  routes: () => [...operatorKeys.all, 'routes'],
  stops: () => [...operatorKeys.all, 'stops'],
  disruptions: () => [...operatorKeys.all, 'disruptions'],
  analytics: (range) => [...operatorKeys.all, 'analytics', range],
  qrCodes: () => [...operatorKeys.all, 'qr-codes'],
  qrDetail: (id) => [...operatorKeys.qrCodes(), id],
  qrStats: (id) => [...operatorKeys.qrCodes(), id, 'stats'],
};
