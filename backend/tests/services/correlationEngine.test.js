import { describe, it, expect, beforeEach } from '@jest/globals';
import CorrelationService from '../../src/services/correlations/correlationService.js';

describe('Correlation Engine - Mathematical Functions', () => {
    let service;

    beforeEach(() => {
        service = CorrelationService;
    });

    describe('calculatePearsonCorrelation()', () => {
        it('should calculate perfect positive correlation (r = 1.0)', () => {
            const data = [
                { driver_val: 1, outcome_val: 2 },
                { driver_val: 2, outcome_val: 4 },
                { driver_val: 3, outcome_val: 6 },
                { driver_val: 4, outcome_val: 8 },
                { driver_val: 5, outcome_val: 10 }
            ];

            const result = service.calculatePearsonCorrelation(data);

            expect(result.coefficient).toBeCloseTo(1.0, 2);
            expect(result.pValue).toBeLessThan(0.05);
        });

        it('should calculate perfect negative correlation (r = -1.0)', () => {
            const data = [
                { driver_val: 1, outcome_val: 10 },
                { driver_val: 2, outcome_val: 8 },
                { driver_val: 3, outcome_val: 6 },
                { driver_val: 4, outcome_val: 4 },
                { driver_val: 5, outcome_val: 2 }
            ];

            const result = service.calculatePearsonCorrelation(data);

            expect(result.coefficient).toBeCloseTo(-1.0, 2);
            expect(result.pValue).toBeLessThan(0.05);
        });

        it('should calculate no correlation (r ≈ 0)', () => {
            const data = [
                { driver_val: 1, outcome_val: 5 },
                { driver_val: 2, outcome_val: 3 },
                { driver_val: 3, outcome_val: 8 },
                { driver_val: 4, outcome_val: 2 },
                { driver_val: 5, outcome_val: 6 }
            ];

            const result = service.calculatePearsonCorrelation(data);

            expect(Math.abs(result.coefficient)).toBeLessThan(0.5);
        });

        it('should handle moderate positive correlation', () => {
            const data = [
                { driver_val: 1, outcome_val: 3 },
                { driver_val: 2, outcome_val: 5 },
                { driver_val: 3, outcome_val: 4 },
                { driver_val: 4, outcome_val: 7 },
                { driver_val: 5, outcome_val: 8 }
            ];

            const result = service.calculatePearsonCorrelation(data);

            expect(result.coefficient).toBeGreaterThan(0.5);
            expect(result.coefficient).toBeLessThan(1.0);
        });

        it('should handle small sample size', () => {
            const data = [
                { driver_val: 1, outcome_val: 2 },
                { driver_val: 2, outcome_val: 4 }
            ];

            const result = service.calculatePearsonCorrelation(data);

            expect(result.coefficient).toBeDefined();
            expect(result.pValue).toBeDefined();
        });

        it('should handle identical values (zero variance)', () => {
            const data = [
                { driver_val: 5, outcome_val: 5 },
                { driver_val: 5, outcome_val: 5 },
                { driver_val: 5, outcome_val: 5 }
            ];

            const result = service.calculatePearsonCorrelation(data);

            // Should return 0 when denominator is 0
            expect(result.coefficient).toBe(0);
        });

        it('should handle decimal values correctly', () => {
            const data = [
                { driver_val: 1.5, outcome_val: 3.2 },
                { driver_val: 2.7, outcome_val: 5.1 },
                { driver_val: 3.3, outcome_val: 6.8 },
                { driver_val: 4.9, outcome_val: 9.2 }
            ];

            const result = service.calculatePearsonCorrelation(data);

            expect(result.coefficient).toBeGreaterThan(0.8);
        });

        it('should round coefficient to 3 decimal places', () => {
            const data = [
                { driver_val: 1, outcome_val: 1.123456 },
                { driver_val: 2, outcome_val: 2.234567 },
                { driver_val: 3, outcome_val: 3.345678 }
            ];

            const result = service.calculatePearsonCorrelation(data);

            // Check that it's rounded to 3 decimals
            const decimals = result.coefficient.toString().split('.')[1];
            expect(decimals?.length || 0).toBeLessThanOrEqual(3);
        });

        it('should return p-value between 0 and 1', () => {
            const data = [
                { driver_val: 1, outcome_val: 2 },
                { driver_val: 2, outcome_val: 4 },
                { driver_val: 3, outcome_val: 6 }
            ];

            const result = service.calculatePearsonCorrelation(data);

            expect(result.pValue).toBeGreaterThanOrEqual(0);
            expect(result.pValue).toBeLessThanOrEqual(1);
        });
    });

    describe('normalCDF()', () => {
        it('should return 0.5 for x = 0', () => {
            const result = service.normalCDF(0);
            expect(result).toBeCloseTo(0.5, 2);
        });

        it('should return values between 0 and 1', () => {
            const testValues = [-3, -1, 0, 1, 3];

            testValues.forEach(x => {
                const result = service.normalCDF(x);
                expect(result).toBeGreaterThan(0);
                expect(result).toBeLessThan(1);
            });
        });

        it('should be symmetric around 0', () => {
            const pos = service.normalCDF(1.5);
            const neg = service.normalCDF(-1.5);

            expect(pos + neg).toBeCloseTo(1, 2);
        });

        it('should approach 1 for large positive values', () => {
            const result = service.normalCDF(3);
            expect(result).toBeGreaterThan(0.99);
        });

        it('should approach 0 for large negative values', () => {
            const result = service.normalCDF(-3);
            expect(result).toBeLessThan(0.01);
        });
    });
});

describe('Correlation Engine - Edge Cases', () => {
    let service;

    beforeEach(() => {
        service = CorrelationService;
    });

    describe('Edge Case Handling', () => {
        it('should handle negative numbers in correlation', () => {
            const data = [
                { driver_val: -5, outcome_val: -10 },
                { driver_val: -3, outcome_val: -6 },
                { driver_val: -1, outcome_val: -2 },
                { driver_val: 1, outcome_val: 2 }
            ];

            const result = service.calculatePearsonCorrelation(data);

            expect(result.coefficient).toBeCloseTo(1.0, 2);
        });

        it('should handle very large numbers', () => {
            const data = [
                { driver_val: 1000000, outcome_val: 2000000 },
                { driver_val: 2000000, outcome_val: 4000000 },
                { driver_val: 3000000, outcome_val: 6000000 }
            ];

            const result = service.calculatePearsonCorrelation(data);

            expect(result.coefficient).toBeCloseTo(1.0, 2);
        });

        it('should handle very small decimal numbers', () => {
            const data = [
                { driver_val: 0.001, outcome_val: 0.002 },
                { driver_val: 0.002, outcome_val: 0.004 },
                { driver_val: 0.003, outcome_val: 0.006 }
            ];

            const result = service.calculatePearsonCorrelation(data);

            expect(result.coefficient).toBeCloseTo(1.0, 2);
        });

        it('should handle mixed positive and negative values', () => {
            const data = [
                { driver_val: -2, outcome_val: 4 },
                { driver_val: -1, outcome_val: 1 },
                { driver_val: 0, outcome_val: 0 },
                { driver_val: 1, outcome_val: 1 },
                { driver_val: 2, outcome_val: 4 }
            ];

            const result = service.calculatePearsonCorrelation(data);

            expect(result.coefficient).toBeDefined();
            expect(Math.abs(result.coefficient)).toBeLessThanOrEqual(1);
        });

        it('should handle single data point gracefully', () => {
            const data = [
                { driver_val: 5, outcome_val: 10 }
            ];

            const result = service.calculatePearsonCorrelation(data);

            // With n=1, correlation is undefined mathematically, should return 0
            expect(result.coefficient).toBe(0);
        });

        it('should handle outliers without breaking', () => {
            const data = [
                { driver_val: 1, outcome_val: 2 },
                { driver_val: 2, outcome_val: 4 },
                { driver_val: 3, outcome_val: 6 },
                { driver_val: 1000, outcome_val: 5 } // Outlier
            ];

            const result = service.calculatePearsonCorrelation(data);

            expect(result.coefficient).toBeDefined();
            expect(Math.abs(result.coefficient)).toBeLessThanOrEqual(1);
        });
    });
});

describe('Correlation Engine - Real-World Scenarios', () => {
    let service;

    beforeEach(() => {
        service = CorrelationService;
    });

    describe('Health & Sleep Correlations', () => {
        it('should detect sleep-productivity correlation', () => {
            // More sleep -> Better productivity
            const data = [
                { driver_val: 5, outcome_val: 4 },   // 5 hrs sleep -> 4/10 productivity
                { driver_val: 6, outcome_val: 6 },   // 6 hrs sleep -> 6/10 productivity
                { driver_val: 7, outcome_val: 8 },   // 7 hrs sleep -> 8/10 productivity
                { driver_val: 8, outcome_val: 9 },   // 8 hrs sleep -> 9/10 productivity
                { driver_val: 9, outcome_val: 9 }    // 9 hrs sleep -> 9/10 productivity
            ];

            const result = service.calculatePearsonCorrelation(data);

            expect(result.coefficient).toBeGreaterThan(0.8); // Strong positive
        });

        it('should detect sleep-spending correlation', () => {
            // Less sleep -> More spending (retail therapy)
            const data = [
                { driver_val: 9, outcome_val: 1000 },  // 9 hrs sleep -> ₹1000 spent
                { driver_val: 8, outcome_val: 1500 },
                { driver_val: 7, outcome_val: 2000 },
                { driver_val: 6, outcome_val: 3000 },
                { driver_val: 5, outcome_val: 4000 }   // 5 hrs sleep -> ₹4000 spent
            ];

            const result = service.calculatePearsonCorrelation(data);

            expect(result.coefficient).toBeLessThan(-0.8); // Strong negative
        });
    });

    describe('Finance & Mood Correlations', () => {
        it('should detect spending-mood correlation', () => {
            // More spending -> Lower mood (buyer's remorse)
            const data = [
                { driver_val: 500, outcome_val: 8 },
                { driver_val: 1000, outcome_val: 7 },
                { driver_val: 2000, outcome_val: 5 },
                { driver_val: 3000, outcome_val: 4 },
                { driver_val: 5000, outcome_val: 3 }
            ];

            const result = service.calculatePearsonCorrelation(data);

            expect(result.coefficient).toBeLessThan(-0.7);
        });
    });

    describe('Fitness & Health Correlations', () => {
        it('should detect workout-mood correlation', () => {
            // More workouts -> Better mood
            const data = [
                { driver_val: 0, outcome_val: 5 },
                { driver_val: 1, outcome_val: 6 },
                { driver_val: 2, outcome_val: 7 },
                { driver_val: 3, outcome_val: 8 },
                { driver_val: 4, outcome_val: 9 }
            ];

            const result = service.calculatePearsonCorrelation(data);

            expect(result.coefficient).toBeGreaterThan(0.9);
        });
    });
});
