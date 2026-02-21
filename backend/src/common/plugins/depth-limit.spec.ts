import depthLimit from 'graphql-depth-limit';
import { parse, validate, buildSchema } from 'graphql';

// Spec: Phase 10 — Production Readiness (GraphQL depth limiting)

const schema = buildSchema(`
    type Query {
        user: User
    }
    type User {
        name: String
        profile: Profile
    }
    type Profile {
        address: Address
    }
    type Address {
        city: City
    }
    type City {
        country: Country
    }
    type Country {
        continent: Continent
    }
    type Continent {
        planet: Planet
    }
    type Planet {
        galaxy: String
    }
`);

const MAX_DEPTH = 7;

describe('GraphQL Depth Limit', () => {
    it('should allow query at max depth', () => {
        // Depth 7: user.profile.address.city.country.continent.planet
        const query = parse(`
            query {
                user {
                    profile {
                        address {
                            city {
                                country {
                                    continent {
                                        planet {
                                            galaxy
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        `);

        const errors = validate(schema, query, [depthLimit(MAX_DEPTH)]);
        expect(errors).toHaveLength(0);
    });

    it('should reject query exceeding max depth', () => {
        // Depth 3 limit, but query goes deeper
        const query = parse(`
            query {
                user {
                    profile {
                        address {
                            city {
                                country {
                                    continent {
                                        planet {
                                            galaxy
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        `);

        const errors = validate(schema, query, [depthLimit(3)]);
        expect(errors.length).toBeGreaterThan(0);
    });

    it('should allow introspection queries regardless of depth', () => {
        const query = parse(`
            query IntrospectionQuery {
                __schema {
                    types {
                        name
                        fields {
                            name
                            type {
                                name
                                ofType {
                                    name
                                    ofType {
                                        name
                                    }
                                }
                            }
                        }
                    }
                }
            }
        `);

        const errors = validate(schema, query, [depthLimit(MAX_DEPTH, { ignore: [/^__/] })]);
        expect(errors).toHaveLength(0);
    });
});
