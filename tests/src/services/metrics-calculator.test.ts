import "reflect-metadata";
import { MetricsCalculator } from "../../../src/services/metrics-calculator";
import { LicenseVerifier } from "../../../src/services/license-verifier";


jest.mock("../../../src/services/license-verifier");

describe("MetricsCalculator", () => {
    let metricsCalculator: MetricsCalculator;
    let mockLicenseVerifier: jest.Mocked<LicenseVerifier>;

    beforeEach(() => {
        mockLicenseVerifier = new LicenseVerifier() as jest.Mocked<LicenseVerifier>;
        mockLicenseVerifier.verifyLicense.mockResolvedValue(true);
        metricsCalculator = new MetricsCalculator(mockLicenseVerifier);
    });

    describe("calculateMetrics", () => {
        it("should calculate metrics for provided GitHub data", async () => {

            // Mocking calculate methods
            metricsCalculator.calculateBusFactor = jest.fn().mockResolvedValue(0.25);
            metricsCalculator.calculateCorrectness = jest.fn().mockResolvedValue(0.50);
            metricsCalculator.calculateRampUp = jest.fn().mockResolvedValue(0.75);
            metricsCalculator.calculateResponsiveMaintainer = jest.fn().mockResolvedValue(0.15);
            metricsCalculator.calculateNetScore = jest.fn().mockResolvedValue(0.60);

            const mockData = [
                {
                    busFactorData: {contributorCommits: new Map([["user1", 50], ["user2", 50]])},
                    correctnessData: {},
                    rampUpData: {},
                    responsiveMaintainerData: {averageTimeInMillis: 1000, closedIssuesExist: true}
                }
            ];

            const urlsPromise = Promise.resolve(["https://github.com/mockOwner/mockRepo"]);

            const result = await metricsCalculator.calculateMetrics(urlsPromise, mockData);

            expect(result).toEqual([
                {
                    URL: "https://github.com/mockOwner/mockRepo",
                    BUS_FACTOR_SCORE: 0.25,
                    CORRECTNESS_SCORE: 0.50,
                    RAMP_UP_SCORE: 0.75,
                    RESPONSIVE_MAINTAINER_SCORE: 0.15,
                    LICENSE_SCORE: true,
                    NET_SCORE: 0.60
                }
            ]);
        });
    });


    describe("calculateBusFactor", () => {
        it("should calculate for 2 contributors with equal commits", async () => {
            const busFactorData = {contributorCommits: new Map([["user1", 50], ["user2", 50]])};
            const result = await metricsCalculator.calculateBusFactor(busFactorData);
            expect(result).toBeCloseTo(0.5);
        });

        it("should calculate for 3 contributors with varied commits", async () => {
            const busFactorData = {contributorCommits: new Map([["user1", 20], ["user2", 30], ["user3", 50]])};
            const result = await metricsCalculator.calculateBusFactor(busFactorData);
            expect(result).toBeCloseTo(0.33);
        });

        it("should throw error for undefined contributorCommits", async () => {
            await expect(metricsCalculator.calculateBusFactor({}))
                .rejects.toThrow("busFactorData or contributorCommits is undefined");
        });
    });

    describe("calculateResponsiveMaintainer", () => {
        it("should calculate for averageTimeInMillis = 1000 and closedIssuesExist = true", async () => {
            // Mock average time in milliseconds (15 days)
            const responsiveMaintainerData = {averageTimeInMillis: 1296000000, closedIssuesExist: true};
            const result = await metricsCalculator.calculateResponsiveMaintainer(responsiveMaintainerData);
            expect(result).toBeCloseTo(Math.exp(-0.5));
        });
    });


    // TODO: Add tests for calculateCorrectness, calculateRampUp, calculateResponsiveMaintainer, calculateNetScore
});