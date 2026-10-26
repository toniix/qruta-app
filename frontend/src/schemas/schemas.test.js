import { describe, it, expect } from 'vitest';
import {
  validateWith,
  citySchema,
  lineSchema,
  stopSchema,
  routeBasicsSchema,
  routePayloadSchema,
  loginSchema,
  aliasSchema,
  communityPostSchema,
  communityCommentSchema,
  searchQuerySchema,
} from './index.js';

const UUID = '123e4567-e89b-42d3-a456-426614174000';

describe('validateWith', () => {
  it('returns ok with parsed data on success', () => {
    const result = validateWith(aliasSchema, '  Carlos  ');
    expect(result.ok).toBe(true);
    expect(result.data).toBe('Carlos');
    expect(result.fieldErrors).toBeNull();
  });

  it('returns first message per field on failure', () => {
    const result = validateWith(communityCommentSchema, { authorAlias: 'x', content: '' });
    expect(result.ok).toBe(false);
    expect(result.data).toBeNull();
    expect(result.fieldErrors.authorAlias).toMatch(/2 letras/);
    expect(result.fieldErrors.content).toMatch(/2 caracteres/);
  });
});

describe('citySchema', () => {
  const base = {
    name: 'Ica',
    department: 'Ica',
    country: 'Perú',
    latitude: null,
    longitude: null,
    radiusKm: 30,
  };

  it('accepts a minimal valid city', () => {
    expect(validateWith(citySchema, base).ok).toBe(true);
  });

  it('rejects missing name and department', () => {
    const result = validateWith(citySchema, { ...base, name: '  ', department: '' });
    expect(result.ok).toBe(false);
    expect(result.fieldErrors.name).toBeTruthy();
    expect(result.fieldErrors.department).toBeTruthy();
  });

  it('coerces string coordinates and radius', () => {
    const result = validateWith(citySchema, {
      ...base,
      latitude: '-14.0678',
      longitude: '-75.7286',
      radiusKm: '30',
    });
    expect(result.ok).toBe(true);
    expect(result.data.latitude).toBeCloseTo(-14.0678);
    expect(result.data.radiusKm).toBe(30);
  });

  it('rejects out-of-range latitude and radius', () => {
    const result = validateWith(citySchema, { ...base, latitude: 100, radiusKm: 500 });
    expect(result.ok).toBe(false);
    expect(result.fieldErrors.latitude).toMatch(/-90/);
    expect(result.fieldErrors.radiusKm).toMatch(/200/);
  });
});

describe('lineSchema', () => {
  const base = {
    cityId: UUID,
    name: 'Línea 1',
    code: 'L01',
    color: '#2563eb',
    company: '',
    contact: '',
    description: '',
    status: 'ACTIVE',
  };

  it('accepts a valid line', () => {
    expect(validateWith(lineSchema, base).ok).toBe(true);
  });

  it('rejects missing city and name', () => {
    const result = validateWith(lineSchema, { ...base, cityId: '', name: '' });
    expect(result.ok).toBe(false);
    expect(result.fieldErrors.cityId).toBeTruthy();
    expect(result.fieldErrors.name).toBeTruthy();
  });

  it('rejects malformed color and status', () => {
    const result = validateWith(lineSchema, { ...base, color: 'blue', status: 'BROKEN' });
    expect(result.ok).toBe(false);
    expect(result.fieldErrors.color).toBeTruthy();
    expect(result.fieldErrors.status).toBeTruthy();
  });
});

describe('stopSchema', () => {
  const base = {
    cityId: UUID,
    name: 'Paradero Puente Blanco',
    latitude: '-14.0678',
    longitude: '-75.7286',
    reference: '',
    address: '',
    isAccessible: true,
  };

  it('coerces string coordinates to numbers', () => {
    const result = validateWith(stopSchema, base);
    expect(result.ok).toBe(true);
    expect(result.data.latitude).toBeCloseTo(-14.0678);
    expect(result.data.longitude).toBeCloseTo(-75.7286);
  });

  it('rejects out-of-range coordinates', () => {
    const result = validateWith(stopSchema, { ...base, latitude: 200, longitude: -200 });
    expect(result.ok).toBe(false);
    expect(result.fieldErrors.latitude).toBeTruthy();
    expect(result.fieldErrors.longitude).toBeTruthy();
  });

  it('rejects missing city and name', () => {
    const result = validateWith(stopSchema, { ...base, cityId: 'not-a-uuid', name: '' });
    expect(result.ok).toBe(false);
    expect(result.fieldErrors.cityId).toBeTruthy();
    expect(result.fieldErrors.name).toBeTruthy();
  });
});

describe('routeBasicsSchema', () => {
  const base = {
    transportLineId: UUID,
    code: 'R101',
    name: 'Huacachina - Centro',
    color: '#2563eb',
    fare: '1.50',
    schedule: '',
    frequency: '',
    description: '',
    status: 'ACTIVE',
  };

  it('accepts valid basics with empty optional fare', () => {
    const result = validateWith(routeBasicsSchema, { ...base, fare: '' });
    expect(result.ok).toBe(true);
    expect(result.data.category).toBe('MICRO');
  });

  it('accepts COMBI category', () => {
    const result = validateWith(routeBasicsSchema, { ...base, category: 'COMBI' });
    expect(result.ok).toBe(true);
    expect(result.data.category).toBe('COMBI');
  });

  it('rejects invalid category', () => {
    const result = validateWith(routeBasicsSchema, { ...base, category: 'TRAIN' });
    expect(result.ok).toBe(false);
    expect(result.fieldErrors.category).toBeTruthy();
  });

  it('rejects malformed fare', () => {
    const result = validateWith(routeBasicsSchema, { ...base, fare: 'abc' });
    expect(result.ok).toBe(false);
    expect(result.fieldErrors.fare).toMatch(/1\.50/);
  });

  it('rejects missing line, code and name', () => {
    const result = validateWith(routeBasicsSchema, {
      ...base,
      transportLineId: '',
      code: '',
      name: '  ',
    });
    expect(result.ok).toBe(false);
    expect(result.fieldErrors.transportLineId).toBeTruthy();
    expect(result.fieldErrors.code).toBeTruthy();
    expect(result.fieldErrors.name).toBeTruthy();
  });
});

describe('routePayloadSchema', () => {
  const basics = {
    transportLineId: UUID,
    code: 'R101',
    name: 'Huacachina - Centro',
    color: '#2563eb',
    fare: '',
    schedule: '',
    frequency: '',
    description: '',
    status: 'ACTIVE',
  };
  const direction = {
    direction: 'IDA',
    originName: 'Terminal',
    destinationName: 'Plaza',
    totalDistanceKm: 10,
    estimatedMinutes: 30,
    stops: [{ stopId: UUID, stopOrder: 1, distanceFromStart: 0 }],
    routePoints: [{ pointOrder: 1, latitude: -14.06, longitude: -75.72 }],
  };

  it('accepts the full wizard payload', () => {
    const result = validateWith(routePayloadSchema, { ...basics, directions: [direction] });
    expect(result.ok).toBe(true);
  });

  it('rejects a route without directions', () => {
    const result = validateWith(routePayloadSchema, { ...basics, directions: [] });
    expect(result.ok).toBe(false);
    expect(result.fieldErrors.directions).toMatch(/sentido/);
  });

  it('surfaces nested stop and direction errors', () => {
    const result = validateWith(routePayloadSchema, {
      ...basics,
      directions: [
        {
          ...direction,
          direction: 'COSTADO',
          stops: [{ stopId: '', stopOrder: 1, distanceFromStart: 0 }],
        },
      ],
    });
    expect(result.ok).toBe(false);
    expect(result.fieldErrors.directions).toBeTruthy();
  });
});

describe('loginSchema', () => {
  it('accepts valid credentials and trims email', () => {
    const result = validateWith(loginSchema, { email: '  admin@rutasya.pe ', password: 'x' });
    expect(result.ok).toBe(true);
    expect(result.data.email).toBe('admin@rutasya.pe');
  });

  it('rejects malformed email and empty password', () => {
    const result = validateWith(loginSchema, { email: 'not-an-email', password: '' });
    expect(result.ok).toBe(false);
    expect(result.fieldErrors.email).toMatch(/correo válido/);
    expect(result.fieldErrors.password).toBeTruthy();
  });
});

describe('community schemas', () => {
  it('validates alias length boundaries (up to 40 characters is valid, 41 is invalid)', () => {
    const valid40 = 'a'.repeat(40);
    expect(aliasSchema.safeParse(valid40).success).toBe(true);

    const invalid41 = 'a'.repeat(41);
    const parsedInvalid = aliasSchema.safeParse(invalid41);
    expect(parsedInvalid.success).toBe(false);
    expect(parsedInvalid.error.issues[0]?.message).toBe('El alias admite hasta 40 caracteres.');

    const invalidPost = validateWith(communityPostSchema, {
      authorAlias: invalid41,
      category: 'ALERTA',
      content: 'Valid content',
      routeId: null,
    });
    expect(invalidPost.ok).toBe(false);
    expect(invalidPost.fieldErrors.authorAlias).toBe('El alias admite hasta 40 caracteres.');
  });

  it('accepts a valid post with optional null route', () => {
    const result = validateWith(communityPostSchema, {
      authorAlias: 'Carlos',
      category: 'ALERTA',
      content: 'Hay tráfico en la Panamericana',
      routeId: null,
    });
    expect(result.ok).toBe(true);
  });

  it('rejects short alias and content (mirrors backend 2/40 and 4/600)', () => {
    const result = validateWith(communityPostSchema, {
      authorAlias: 'x',
      category: 'ALERTA',
      content: 'abc',
      routeId: null,
    });
    expect(result.ok).toBe(false);
    expect(result.fieldErrors.authorAlias).toBeTruthy();
    expect(result.fieldErrors.content).toBeTruthy();
  });

  it('rejects overlong content and invalid route id', () => {
    const result = validateWith(communityPostSchema, {
      authorAlias: 'Carlos',
      category: 'ALERTA',
      content: 'x'.repeat(601),
      routeId: 'nope',
    });
    expect(result.ok).toBe(false);
    expect(result.fieldErrors.content).toBeTruthy();
    expect(result.fieldErrors.routeId).toBeTruthy();
  });

  it('validates comments with the 2/400 backend limits', () => {
    expect(
      validateWith(communityCommentSchema, { authorAlias: 'Ana', content: 'ok' }).ok
    ).toBe(true);
    const bad = validateWith(communityCommentSchema, { authorAlias: 'A', content: 'x' });
    expect(bad.ok).toBe(false);
  });
});

describe('searchQuerySchema', () => {
  it('trims and accepts a normal query', () => {
    expect(validateWith(searchQuerySchema, '  ica  ').data).toBe('ica');
  });

  it('rejects empty and overlong queries', () => {
    expect(validateWith(searchQuerySchema, '   ').ok).toBe(false);
    expect(validateWith(searchQuerySchema, 'x'.repeat(101)).ok).toBe(false);
  });
});
